import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,realpath,readdir,lstat,readFile,writeFile,unlink,chmod} from 'node:fs/promises';
import {join,dirname,resolve,relative,sep} from 'node:path';
import {safeBuildGit,safeBuildPath} from './build-workspace.ts';
const execute=promisify(execFile);
const FILE_CAP=8*1024*1024,TREE_CAP=64*1024*1024;
type Entry={path:string;oid:string;mode:string;size:number};
async function entries(objectDir:string,revision:string):Promise<Entry[]>{
 if(!/^[a-f0-9]{40,64}$/.test(revision))throw new Error('Oracle revision must be an object identity');
 const records=(await safeBuildGit(objectDir,['ls-tree','-r','-l','-z',revision],8*1024*1024)).toString('utf8').split('\0').filter(Boolean);
 if(records.length>20000)throw new Error('Oracle path cap exceeded');
 let total=0;
 return records.map(record=>{
  const m=/^(100644|100755) blob ([a-f0-9]{40,64})\s+(\d+)\t(.+)$/s.exec(record);
  // All symlinks are rejected, including internal ones; gitlinks never enter tar.
  if(!m||!safeBuildPath(m[4]!)||/^[A-Za-z]:/.test(m[4]!))throw new Error('Oracle tree contains unsafe path, symlink or submodule');
  const size=Number(m[3]);total+=size;
  if(size>FILE_CAP||total>TREE_CAP)throw new Error('Oracle tree byte cap exceeded');
  return {path:m[4]!,oid:m[2]!,mode:m[1]!,size};
 });
}
async function workspaceFiles(workspace:string):Promise<string[]>{
 const root=await realpath(workspace),out:string[]=[];let count=0,total=0;
 const walk=async(dir:string):Promise<void>=>{for(const e of await readdir(dir,{withFileTypes:true})){
  if(++count>20000)throw new Error('Oracle decoded path cap exceeded');
  const full=join(dir,e.name),path=relative(root,full).split(sep).join('/'),stat=await lstat(full);
  if(!safeBuildPath(path)||stat.isSymbolicLink()||!stat.isFile()&&!stat.isDirectory()||await realpath(full)!==full)throw new Error('Oracle decoded path is unsafe');
  if(stat.isDirectory())await walk(full);else{total+=stat.size;if(stat.size>FILE_CAP||total>TREE_CAP)throw new Error('Oracle decoded byte cap exceeded');out.push(path);}
 }};
 await walk(root);return out.sort();
}
export async function materializeOracleTree(objectDir:string,revision:string,workspace:string):Promise<{workspace:string;sourceTree:string}>{
 const inventory=await entries(objectDir,revision);
 const sourceTree=(await safeBuildGit(objectDir,['rev-parse',`${revision}^{tree}`])).toString().trim();
 const target=join(await realpath(dirname(resolve(workspace))),resolve(workspace).split(sep).at(-1)!);
 await mkdir(target,{mode:0o700}); // Must be a new directory: never reuse a checkout/worktree.
 const archive=await safeBuildGit(objectDir,['archive','--format=tar',sourceTree],90*1024*1024);
 const task=execute('tar',['-x','-f','-','-C',target],{env:{PATH:process.env.PATH??'/usr/bin:/bin',LANG:'C',LC_ALL:'C'},timeout:30000,maxBuffer:65536});
 task.child.stdin?.end(archive);await task;
 const paths=await workspaceFiles(target),expectedPaths=inventory.map(e=>e.path).sort();
 if(paths.length!==inventory.length||paths.some((p,i)=>p!==expectedPaths[i]))throw new Error('Oracle archive inventory differs from source tree');
 // Detect export-ignore/export-subst or other archive transformations before execution.
 for(const entry of inventory){const full=join(target,entry.path),bytes=await readFile(full),source=await safeBuildGit(objectDir,['cat-file','blob',entry.oid],FILE_CAP+1);if(!bytes.equals(source))throw new Error('Oracle archive content differs from source tree');}
 return {workspace:target,sourceTree};
}
export function isOracleTestPath(path:string):boolean{return /(?:^|\/)(?:tests?|__tests__)(?:\/|$)/i.test(path)||/(?:^|\/)test_[^/]+\.py$|_test\.py$|\.(?:test|spec)\.(?:[cm]?[jt]s|tsx|jsx)$/i.test(path);}
export async function restoreBaseTests(objectDir:string,baseHead:string,workspace:string):Promise<{restored:string[];candidateOnlyTests:string[]}>{
 const base=(await entries(objectDir,baseHead)).filter(e=>isOracleTestPath(e.path));
 const basePaths=new Set(base.map(e=>e.path));
 const candidateOnlyTests=(await workspaceFiles(workspace)).filter(p=>isOracleTestPath(p)&&!basePaths.has(p));
 for(const path of candidateOnlyTests)await unlink(join(workspace,path));
 for(const e of base){const full=join(workspace,e.path);await mkdir(dirname(full),{recursive:true,mode:0o700});await writeFile(full,await safeBuildGit(objectDir,['cat-file','blob',e.oid],FILE_CAP+1));await chmod(full,e.mode==='100755'?0o755:0o644);}
 return {restored:base.map(e=>e.path).sort(),candidateOnlyTests};
}
async function changedPaths(objectDir:string,baseHead:string,candidateTree:string):Promise<string[]>{return (await safeBuildGit(objectDir,['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',baseHead,candidateTree,'--'],8*1024*1024)).toString().split('\0').filter(Boolean);}
export async function dependencyChanges(objectDir:string,baseHead:string,candidateTree:string):Promise<string[]>{return (await changedPaths(objectDir,baseHead,candidateTree)).filter(p=>/(?:^|\/)(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*\.(?:txt|in)|pyproject\.toml|setup\.(?:py|cfg)|poetry\.lock|Pipfile(?:\.lock)?)$/i.test(p)).sort();}
// A review aid only, never a security boundary. Callers must mark hits INCONCLUSIVE.
export async function reviewTripwire(objectDir:string,baseHead:string,candidateTree:string):Promise<{path:string;reason:string}[]>{
 const hits:{path:string;reason:string}[]=[];
 for(const path of await changedPaths(objectDir,baseHead,candidateTree)){
  if(isOracleTestPath(path))continue;
  const diff=(await safeBuildGit(objectDir,['diff','--no-ext-diff','--no-textconv','--no-renames','--unified=0',baseHead,candidateTree,'--',path],16*1024*1024)).toString();
  const added=diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).join('\n');
  for(const [pattern,reason] of [
   [/\b__code__\b/,'Function code replacement'],
   [/\bsys\s*\.\s*(?:modules|meta_path|path_hooks)\b/,'Import machinery mutation or access'],
   [/\b(?:builtins|__builtins__)\b/,'Builtins mutation or access'],
   [/\b(?:unittest|pytest|vitest)\b.*(?:mock|_pytest|TestCase|TestResult|assert|raises|fail|expect|spy|patch|result|runner)|\b(?:_pytest|_Outcome|addSuccess|addFailure|addError|pytest_runtest\w*|pytest_assert\w*)\b/i,'Test framework internals or hooks'],
   [/\b(?:importlib|__import__|find_spec|find_module|exec_module|load_module)\b/,'Import hook update or access'],
   [/\binspect\s*\.\s*(?:currentframe|stack)\b|\b_getframe\b|\bf_(?:globals|locals|back)\b/,'Runtime frame introspection'],
   [/\bgc\s*\.\s*(?:get_objects|get_referrers|get_referents)\b/,'Runtime heap introspection'],
   [/\bos\s*\.\s*(?:write|writev|fdopen|dup|dup2)\b|\.\s*(?:detach|fileno)\s*\(/,'Raw file descriptor access'],
   [/\bctypes\b/,'Native ctypes access'],
   [/\bsignal\s*\.\s*(?:signal|setitimer|raise_signal|pthread_kill|siginterrupt|pthread_sigmask|sigwait|sigwaitinfo|sigtimedwait|alarm)\b|\bos\s*\.\s*(?:kill|killpg)\b/,'Signal handling or process signaling'],
  ] as [RegExp,string][])if(pattern.test(added))hits.push({path,reason});
 }
 return hits;
}
