import {materializeOracleTree,restoreBaseTests,dependencyChanges,reviewTripwire,isOracleTestPath} from './oracle-tree.ts';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile,writeFile,lstat,readdir,realpath,chmod} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';
import type {BuildCandidate} from '../../packages/shared/build.ts';
import {safeBuildGit,safeBuildPath} from './build-workspace.ts';
// Capture the executing representation (source TS or built JS) at module load.
// Later filesystem edits do not describe the already loaded host authority.
export const verificationWorkspaceAuthority=readFileSync(fileURLToPath(import.meta.url),'utf8');
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const id=(s:string)=>{if(!/^[a-zA-Z0-9_-]{1,100}$/.test(s))throw new Error('Invalid verification identity');return s;};
// Bound decoded object data before Git allocates files: compressed packs can be
// tiny while blobs/delta reconstruction instructions request enormous objects.
function validatePackBudget(pack:Buffer){
 const limit=64*1024*1024;if(pack.length<32||pack.subarray(0,4).toString()!=='PACK'||![2,3].includes(pack.readUInt32BE(4)))throw new Error('Invalid frozen object pack');
 const count=pack.readUInt32BE(8);if(count>100000)throw new Error('Frozen object count bound exceeded');let pos=12,total=0;
 for(let i=0;i<count;i++){
  let byte=pack[pos++];if(byte===undefined)throw new Error('Truncated pack header');const type=(byte>>4)&7;let size=byte&15,shift=4;
  while(byte&128){byte=pack[pos++];if(byte===undefined||shift>28)throw new Error('Frozen object size bound exceeded');size+=(byte&127)*2**shift;shift+=7;}if(size>limit)throw new Error('Frozen decoded object exceeds bound');
  if(type===6){do{byte=pack[pos++];if(byte===undefined)throw new Error('Truncated delta offset');}while(byte&128);}else if(type===7)pos+=20;else if(![1,2,3,4].includes(type))throw new Error('Invalid frozen object type');
  const inflated=inflateSync(pack.subarray(pos),{info:true,maxOutputLength:limit+1}) as unknown as {buffer:Buffer;engine:{bytesWritten:number}};const payload=inflated.buffer;if(payload.length!==size)throw new Error('Frozen object size mismatch');pos+=inflated.engine.bytesWritten;total+=size;
  if(type===6||type===7){let p=0;const number=()=>{let n=0,s=0,b:number;do{b=payload[p++]!;if(b===undefined||s>28)throw new Error('Invalid delta size');n+=(b&127)*2**s;s+=7;}while(b&128);return n;};number();total+=number();}
  if(total>limit)throw new Error('Frozen decoded pack exceeds 64 MiB bound');
 }
 if(pos!==pack.length-20)throw new Error('Frozen pack trailing data mismatch');
}
async function regular(path:string){const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink())throw new Error('Frozen artifact is not a regular file');return s;}
export async function verificationTreeHash(workspace:string,objectDir:string):Promise<string>{
 const index=join(objectDir,'verification-index');
 await safeBuildGit(objectDir,['read-tree','--empty'],undefined,index);
 // Hash every byte, including ignored paths; no candidate interpreter or filters.
 let count=0,total=0;const walk=async(dir:string)=>{for(const entry of await readdir(dir,{withFileTypes:true})){if(++count>20000)throw new Error('Verification path bound exceeded');const full=join(dir,entry.name),path=relative(workspace,full).split(sep).join('/'),stat=await lstat(full);if(!safeBuildPath(path)||stat.isSymbolicLink()||!stat.isDirectory()&&!stat.isFile())throw new Error('Unsafe verification workspace path');if(stat.isDirectory())await walk(full);else{total+=stat.size;if(total>64*1024*1024)throw new Error('Verification decoded tree exceeds bound');const bytes=await readFile(full);const blob=(await safeBuildGit(objectDir,['hash-object','-w','--stdin'],undefined,undefined,bytes)).toString().trim();await safeBuildGit(objectDir,['update-index','--add','--cacheinfo',stat.mode&0o111?'100755':'100644',blob,path],undefined,index);}}};
 await walk(workspace);return (await safeBuildGit(objectDir,['write-tree'],undefined,index)).toString().trim();
}
export async function materializeCandidate(dataDir:string,runId:string,candidate:BuildCandidate):Promise<{workspace:string;objectDir:string;packHash:string}>{
 const root=await realpath(dataDir),artifact=join(root,'attempts',id(candidate.attemptId));
 if(candidate.diffArtifactPath!==join(artifact,'candidate.diff')||! /^[a-f0-9]{40,64}$/.test(candidate.treeHash)||! /^[a-f0-9]{40,64}$/.test(candidate.baseHead)||! /^[a-f0-9]{64}$/.test(candidate.diffHash))throw new Error('Frozen candidate identity mismatch');
 if(await realpath(artifact)!==artifact)throw new Error('Frozen artifact directory identity mismatch');
 const packPath=join(artifact,'candidate.pack');await regular(packPath);await regular(candidate.diffArtifactPath);
 const pack=await readFile(packPath),diff=await readFile(candidate.diffArtifactPath);if(pack.length>64*1024*1024||diff.length>4*1024*1024||digest(diff)!==candidate.diffHash)throw new Error('Frozen candidate artifact mismatch');validatePackBudget(pack);
 const run=join(root,'verification',id(runId)),workspace=join(run,'workspace'),objectDir=join(run,'objects');
 await mkdir(run,{recursive:true,mode:0o700});await mkdir(workspace,{mode:0o700});await mkdir(objectDir,{mode:0o700});
 await safeBuildGit(objectDir,['init','--bare','-q']);await safeBuildGit(objectDir,['unpack-objects','-r'],65*1024*1024,undefined,pack);
 if((await safeBuildGit(objectDir,['cat-file','-t',candidate.treeHash])).toString().trim()!=='tree')throw new Error('Frozen tree is absent');
 const records=(await safeBuildGit(objectDir,['ls-tree','-r','-z',candidate.treeHash],4*1024*1024)).toString('utf8').split('\0').filter(Boolean);if(records.length>20000)throw new Error('Frozen tree path bound exceeded');
 let materializedBytes=0;for(const record of records){const match=/^(100644|100755) blob ([a-f0-9]{40,64})\t(.+)$/s.exec(record);if(!match||!safeBuildPath(match[3]!))throw new Error('Frozen tree contains symlink, submodule or sensitive path');const bytes=await safeBuildGit(objectDir,['cat-file','blob',match[2]!],64*1024*1024+1);materializedBytes+=bytes.length;if(materializedBytes>64*1024*1024)throw new Error('Materialized full tree exceeds 64 MiB bound');const path=join(workspace,match[3]!);await mkdir(join(path,'..'),{recursive:true,mode:0o700});await writeFile(path,bytes,{flag:'wx',mode:match[1]==='100755'?0o555:0o444});}
 if(await verificationTreeHash(workspace,objectDir)!==candidate.treeHash)throw new Error('Materialized tree identity mismatch');
 // When captured base objects exist, additionally prove the diff against them.
 const hasBase=await safeBuildGit(objectDir,['cat-file','-e',candidate.baseHead]).then(()=>true,()=>false);
 if(hasBase){const computed=await safeBuildGit(objectDir,['diff','--no-ext-diff','--no-textconv','--binary','--no-renames',candidate.baseHead,candidate.treeHash,'--']);if(digest(computed)!==candidate.diffHash)throw new Error('Frozen candidate diff mismatch');}
 await writeFile(join(run,'identity.json'),JSON.stringify({candidateId:candidate.id,treeHash:candidate.treeHash,diffHash:candidate.diffHash,diffRecomputed:hasBase,packHash:digest(pack),workspace,objectDir}),{flag:'wx',mode:0o400});
 const seal=async(dir:string)=>{for(const e of await readdir(dir,{withFileTypes:true}))if(e.isDirectory())await seal(join(dir,e.name));await chmod(dir,0o500);};await seal(workspace);
 return {workspace,objectDir,packHash:digest(pack)};
}

// Keep the immutable Candidate workspace intact; the execution tree restores BASE tests.
export async function materializeNativeVerification(objectDir:string,candidate:BuildCandidate,runDirectory:string){
 const dependencyChangesFound=await dependencyChanges(objectDir,candidate.baseHead,candidate.treeHash),tripwireHits=await reviewTripwire(objectDir,candidate.baseHead,candidate.treeHash);
 const candidateTestPaths=(await safeBuildGit(objectDir,['diff','--no-ext-diff','--no-textconv','--no-renames','--diff-filter=ACMT','--name-only','-z',candidate.baseHead,candidate.treeHash,'--'])).toString().split('\0').filter(path=>path&&isOracleTestPath(path));
 const workspace=join(runDirectory,'native-workspace');await materializeOracleTree(objectDir,candidate.treeHash,workspace);
 const tests=await restoreBaseTests(objectDir,candidate.baseHead,workspace);
 const executionTree=await verificationTreeHash(workspace,objectDir);
 const seal=async(dir:string)=>{for(const e of await readdir(dir,{withFileTypes:true})){const full=join(dir,e.name);if(e.isDirectory())await seal(full);else await chmod(full,(await lstat(full)).mode&0o111?0o555:0o444);}await chmod(dir,0o500);};await seal(workspace);
 return {workspace,executionTree,candidateTestPaths,baseHead:candidate.baseHead,dependencyChanges:dependencyChangesFound,tripwireHits,baseTestsRestored:tests.restored,candidateOnlyTestsExcluded:tests.candidateOnlyTests,candidateTestsAuthoritative:false};
}
