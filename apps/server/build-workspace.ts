import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {readFile,writeFile,mkdir,lstat,realpath,readdir,unlink} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {performance} from 'node:perf_hooks';
import {BUILD_LIMITS,type BuildAttempt,type BuildCandidate,type ChangedPath} from '../../packages/shared/build.ts';
import type {BuildAdmission} from './build-admission.ts';
import {BuildError} from './build-errors.ts';
const execute=promisify(execFile);
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const fail=(code:string,message:string):never=>{throw new BuildError(code,message);};
// Coordinator-only Git operations: never inherit credentials, hooks or executable filters.
export async function safeBuildGit(cwd:string,args:string[],maxBuffer=BUILD_LIMITS.diffBytes+1,index?:string,input?:Buffer):Promise<Buffer>{
 const env:NodeJS.ProcessEnv={PATH:process.env.PATH??'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C',LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_ATTR_NOSYSTEM:'1',GIT_CONFIG_COUNT:'0',...(index?{GIT_INDEX_FILE:index}:{})};
 const base=['--no-pager','--no-optional-locks','--no-lazy-fetch','--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-c','protocol.allow=never','-c','core.attributesFile=/dev/null','-c','core.autocrlf=false'];
 const config=await execute('git',[...base,'-C',cwd,'config','--includes','--name-only','--get-regexp','^filter\\.'],{env,timeout:30000,maxBuffer:65536,encoding:'utf8'}).catch(e=>{if(e.code===1)return {stdout:''};throw new BuildError('BUILD_GIT_FAILED','Git filter configuration could not be safely inspected.');});
 const filters=[...new Set(config.stdout.split('\n').filter(Boolean).map(k=>k.replace(/\.[^.]+$/,'')))].flatMap(k=>['-c',`${k}.clean=cat`,'-c',`${k}.smudge=cat`,'-c',`${k}.process=`,'-c',`${k}.required=false`]);
 try{const task=execute('git',[...base,...filters,'-C',cwd,...args],{env,timeout:30000,maxBuffer,encoding:'buffer'});task.child.stdin?.end(input);return (await task).stdout;}catch{throw new BuildError('BUILD_GIT_FAILED','A bounded coordinator Git operation failed.');}
}
const gitText=async(root:string,args:string[]) => (await safeBuildGit(root,args)).toString('utf8').trim();
export async function sourceIndexHash(root:string):Promise<string>{const path=await gitText(root,['rev-parse','--path-format=absolute','--git-path','index']);return hash(await readFile(path).catch(e=>{if(e.code==='ENOENT')return Buffer.alloc(0);throw e;}));}
export function safeBuildPath(path:string):boolean {
 if(!path||path.length>4096||isAbsolute(path)||/[\u0000-\u001f\u007f\\]/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..'))return false;
 return !path.toLowerCase().split('/').some(p=>/^\.env(?:\.|$)|^(?:\.git|\.ssh|\.aws|\.azure|\.gcloud|\.npmrc|\.netrc|\.codex|\.claude|browser[-_](?:storage|profiles)|chrome-profile|firefox-profile|cookies?|login data|local state|credentials?(?:\..*)?|secrets?(?:\..*)?|(?:auth|cookies?|tokens?|token[-_]store)\.(?:json|ya?ml|txt)|keystore(?:\..*)?|id_rsa(?:\..*)?|id_ed25519(?:\..*)?)$|\.(?:pem|key|p12|pfx|jks|keystore)$/.test(p));
}
function attemptPaths(dataDir:string,id:string){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))fail('INVALID_ATTEMPT_ID','Attempt identity is invalid.');return {workspacePath:join(realpathSync(dataDir),'workspaces',id),artifactDir:join(realpathSync(dataDir),'attempts',id)};}
type Ownership={attemptId:string;workspacePath:string;sourceRoot:string;baseHead:string;gitCommonDir:string;gitDir:string;sourceIndexHash:string};
export async function createBuildWorkspace(admission:BuildAdmission,attemptId:string,dataDir:string):Promise<{workspacePath:string;artifactDir:string;gitCommonDir:string;worktreeMs:number}>{
 const start=performance.now();await mkdir(dataDir,{recursive:true,mode:0o700});const paths=attemptPaths(dataDir,attemptId);await mkdir(join(resolve(dataDir),'workspaces'),{recursive:true,mode:0o700});await mkdir(paths.artifactDir,{recursive:true,mode:0o700});
 if(await realpath(admission.sourceRoot)!==admission.sourceRoot||await gitText(admission.sourceRoot,['rev-parse','HEAD'])!==admission.baseHead||await sourceIndexHash(admission.sourceRoot)!==admission.sourceIndexHash||(await safeBuildGit(admission.sourceRoot,['status','--porcelain=v1','-z','--untracked-files=all'])).length)fail('SOURCE_CHANGED','The source changed after admission.');
 // Register metadata first. Conditional includes may become active only in the
 // linked worktree, so checkout must use that new effective configuration.
 await safeBuildGit(admission.sourceRoot,['worktree','add','--detach','--no-checkout',paths.workspacePath,admission.baseHead]);
 await safeBuildGit(paths.workspacePath,['read-tree','--reset','-u',admission.baseHead]);
 const workspacePath=await realpath(paths.workspacePath),gitCommonDir=await realpath(await gitText(workspacePath,['rev-parse','--path-format=absolute','--git-common-dir'])),gitDir=await realpath(await gitText(workspacePath,['rev-parse','--absolute-git-dir']));
 if(workspacePath!==paths.workspacePath||gitCommonDir!==admission.gitCommonDir||await gitText(workspacePath,['rev-parse','HEAD'])!==admission.baseHead||await sourceIndexHash(admission.sourceRoot)!==admission.sourceIndexHash)fail('WORKSPACE_IDENTITY_CHANGED','The isolated workspace identity could not be proved.');
 const owner:Ownership={attemptId,workspacePath,sourceRoot:admission.sourceRoot,baseHead:admission.baseHead,gitCommonDir,gitDir,sourceIndexHash:admission.sourceIndexHash};
 await writeFile(join(paths.artifactDir,'ownership.json'),JSON.stringify(owner),{flag:'wx',mode:0o600});
 return {...paths,gitCommonDir,worktreeMs:Math.round(performance.now()-start)};
}
async function owned(attempt:BuildAttempt,dataDir:string):Promise<Ownership>{
 const p=attemptPaths(dataDir,attempt.id);let o:Ownership;try{o=JSON.parse(await readFile(join(p.artifactDir,'ownership.json'),'utf8'));}catch{return fail('WORKSPACE_NOT_OWNED','The workspace ownership record is missing.');}
 if(o.attemptId!==attempt.id||o.workspacePath!==p.workspacePath||o.workspacePath!==attempt.workspacePath||o.sourceRoot!==attempt.sourceRoot||o.baseHead!==attempt.baseHead||await realpath(o.workspacePath)!==o.workspacePath||await realpath(await gitText(o.workspacePath,['rev-parse','--absolute-git-dir']))!==o.gitDir||await realpath(await gitText(o.workspacePath,['rev-parse','--path-format=absolute','--git-common-dir']))!==o.gitCommonDir)fail('WORKSPACE_NOT_OWNED','The workspace no longer matches its ownership record.');
 if(await gitText(o.workspacePath,['rev-parse','HEAD'])!==o.baseHead)fail('BUILDER_MOVED_HEAD','Builder changed the workspace HEAD.');
 if(await realpath(o.sourceRoot)!==o.sourceRoot||await realpath(await gitText(o.sourceRoot,['rev-parse','--path-format=absolute','--git-common-dir']))!==o.gitCommonDir||await gitText(o.sourceRoot,['rev-parse','HEAD'])!==o.baseHead||await sourceIndexHash(o.sourceRoot)!==o.sourceIndexHash||(await safeBuildGit(o.sourceRoot,['status','--porcelain=v1','-z','--untracked-files=all'])).length)fail('SOURCE_CHANGED','The original source repository, HEAD, index or working files changed.');
 return o;
}
async function regularTree(root:string,dir=root,count={n:0}):Promise<void>{for(const e of await readdir(dir,{withFileTypes:true})){if(++count.n>20000)fail('CANDIDATE_PATH_LIMIT','Workspace traversal exceeds its bounded inventory.');if(dir===root&&e.name==='.git')continue;const full=join(dir,e.name),rel=relative(root,full).split(sep).join('/');if(rel==='.cc-runtime'){const runtimeStat=await lstat(full);if(!runtimeStat.isDirectory()||runtimeStat.isSymbolicLink())fail('UNSAFE_CANDIDATE_PATH','The owned runtime directory must be a real directory.');continue;}if(!safeBuildPath(rel))fail('UNSAFE_CANDIDATE_PATH','The workspace contains a sensitive or unsafe path.');const s=await lstat(full);if(s.isSymbolicLink()||(!s.isDirectory()&&!s.isFile()))fail('UNSAFE_CANDIDATE_PATH','Candidate files must be regular files inside the workspace.');if(s.isDirectory())await regularTree(root,full,count);}}
const secret= /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b/;
export async function captureBuildCandidate(attempt:BuildAttempt,dataDir:string):Promise<{candidate:BuildCandidate;captureMs:number}>{
 const start=performance.now(),o=await owned(attempt,dataDir),paths=attemptPaths(dataDir,attempt.id);await regularTree(o.workspacePath);
 const ignored=(await safeBuildGit(o.workspacePath,['ls-files','--others','--ignored','--exclude-standard','-z'])).toString('utf8').split('\0').filter(Boolean);
 if(ignored.some(p=>p!=='.cc-runtime'&&!p.startsWith('.cc-runtime/')))fail('IGNORED_CANDIDATE_FILES','Ignored workspace files outside the owned runtime directory require review.');
 const runtime=(await safeBuildGit(o.workspacePath,['ls-files','--others','--exclude-standard','-z','--','.cc-runtime'])).toString('utf8').split('\0').filter(Boolean);
 const index=join(paths.artifactDir,`capture-index-${randomUUID()}`);let treeHash:string;
 try{await safeBuildGit(o.workspacePath,['read-tree',o.baseHead],undefined,index);await safeBuildGit(o.workspacePath,['add','-f','-A','--','.',':(exclude,glob).cc-runtime/**'],undefined,index);treeHash=await gitTextWithIndex(o.workspacePath,['write-tree'],index);}finally{await unlink(index).catch(()=>{});}
 const raw=await safeBuildGit(o.workspacePath,['diff','--no-ext-diff','--no-textconv','--binary','--no-renames',o.baseHead,treeHash,'--'],BUILD_LIMITS.diffBytes+1);
 if(raw.length>BUILD_LIMITS.diffBytes)fail('CANDIDATE_DIFF_LIMIT','The candidate diff exceeds its bounded limit.');if(secret.test(raw.toString('utf8')))fail('CANDIDATE_SECRET','Candidate content contains a credential-like value.');
 const inventory=(await safeBuildGit(o.workspacePath,['diff','--no-ext-diff','--no-textconv','--no-renames','--numstat','-z',o.baseHead,treeHash,'--'])).toString('utf8').split('\0').filter(Boolean);
 if(inventory.length>BUILD_LIMITS.changedPaths)fail('CANDIDATE_PATH_LIMIT','The candidate changed-path inventory exceeds its limit.');
 const statuses=new Map((await safeBuildGit(o.workspacePath,['diff','--no-ext-diff','--no-textconv','--no-renames','--name-status','-z',o.baseHead,treeHash,'--'])).toString('utf8').split('\0').reduce<[string,string][]>((out,v,i,a)=>{if(i%2===0&&v)out.push([a[i+1]!,v]);return out;},[]));
 const changedPaths:ChangedPath[]=inventory.map(record=>{const m=/^([^\t]+)\t([^\t]+)\t(.+)$/s.exec(record);if(!m||!safeBuildPath(m[3]!))return fail('UNSAFE_CANDIDATE_PATH','Candidate inventory contains an unsafe path.');return {path:m[3]!,kind:statuses.get(m[3]!)==='A'?'added':statuses.get(m[3]!)==='D'?'deleted':'modified',additions:m[1]==='-'?null:Number(m[1]),deletions:m[2]==='-'?null:Number(m[2])};});
 // Inspect original and resulting content objects, including binary blobs whose diff
 // encoding could otherwise obscure credentials. Never consult mutable file bytes.
 for(const path of changedPaths){for(const tree of [...(path.kind!=='added'?[o.baseHead]:[]),...(path.kind!=='deleted'?[treeHash]:[])]){const blob=await safeBuildGit(o.workspacePath,['cat-file','blob',`${tree}:${path.path}`],BUILD_LIMITS.diffBytes+1);if(blob.length>BUILD_LIMITS.diffBytes)fail('CANDIDATE_FILE_LIMIT','A changed candidate file exceeds the bounded content limit.');if(secret.test(blob.toString('utf8')))fail('CANDIDATE_SECRET','Candidate content contains a credential-like value.');}}
 // A Git tree without a ref is collectible. Preserve its entire object closure in
 // an owned, bounded pack so source gc cannot erase the frozen candidate.
 const baseTree=await gitText(o.workspacePath,['rev-parse',o.baseHead+'^{tree}']);
 const objects=await safeBuildGit(o.workspacePath,['rev-list','--objects','--no-object-names',treeHash,baseTree]);
 // Retain these two complete trees and the BASE commit object, without copying unrelated ancestor history.
 const pack=await safeBuildGit(o.workspacePath,['pack-objects','--stdout'],64*1024*1024+1,undefined,Buffer.concat([objects,Buffer.from(o.baseHead+'\n')]));
 if(pack.length>64*1024*1024)fail('CANDIDATE_ARCHIVE_LIMIT','The complete candidate object archive exceeds 64 MiB.');
 await owned(attempt,dataDir);const diffArtifactPath=join(paths.artifactDir,'candidate.diff');await immutableArtifact(join(paths.artifactDir,'candidate.pack'),pack);await immutableArtifact(diffArtifactPath,raw);
 const truncated=raw.length>BUILD_LIMITS.diffPreviewBytes;const diff=raw.subarray(0,BUILD_LIMITS.diffPreviewBytes).toString('utf8')+(truncated?'\n[Diff preview truncated; bounded full diff is in the artifact.]\n':'');
 const candidate:BuildCandidate={id:randomUUID(),attemptId:attempt.id,baseHead:o.baseHead,treeHash,diffHash:hash(raw),changedPaths,diff,diffTruncated:truncated,inventoryTruncated:false,ignoredPaths:new Set([...ignored,...runtime]).size,diffArtifactPath,createdAt:new Date().toISOString()};return {candidate,captureMs:Math.round(performance.now()-start)};
}
async function gitTextWithIndex(root:string,args:string[],index:string){return (await safeBuildGit(root,args,undefined,index)).toString('utf8').trim();}
async function immutableArtifact(path:string,bytes:Buffer){try{await writeFile(path,bytes,{flag:'wx',mode:0o600});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||!(await readFile(path)).equals(bytes))fail('CANDIDATE_ALREADY_CAPTURED','The frozen candidate artifact cannot be replaced.');}}
