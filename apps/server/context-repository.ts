import {realpathSync} from 'node:fs';
import {gitBytes,validateRepository} from './repository.ts';
import {ProjectError} from './project-errors.ts';
import {ContextError} from './context-errors.ts';
import {captureStableObservation,parseStatus,checkedPaths} from './context-observation.ts';
import {CONTEXT_LIMITS} from '../../packages/shared/context.ts';
import type {Logger} from './log.ts';
const decode=(buffer:Buffer)=>new TextDecoder('utf-8',{fatal:true}).decode(buffer);
async function filterOverrides(root:string):Promise<string[]>{
 // Key names only: never expose configuration values. Disable clean/process helpers before status.
 let keys:string;
 try{keys=decode(await gitBytes(root,['config','--includes','--name-only','--get-regexp','^filter\\..*\\.(clean|smudge|process|required)$']));}
 catch(error){if(error instanceof Error&&'code'in error&&error.code===1)return [];throw error;}
 const drivers=new Set(keys.trim().split('\n').map(key=>/^filter\.([A-Za-z0-9_.-]{1,100})\.(?:clean|smudge|process|required)$/.exec(key)?.[1]));
 if(drivers.has(undefined)||drivers.size>64)throw new ContextError('CONTEXT_CAPTURE_LIMIT','Repository filter configuration exceeds the safe capture boundary.',422);
 return [...drivers].flatMap(driver=>[`filter.${driver}.clean=`,`filter.${driver}.smudge=`,`filter.${driver}.process=`,`filter.${driver}.required=false`]);
}
export async function observeRepository(repoRoot:string,roots:readonly string[],logger:Logger){
 try{
  return await captureStableObservation(async()=>{
   if(realpathSync(repoRoot)!==repoRoot)throw new ContextError('REPOSITORY_IDENTITY_MISMATCH','The registered repository location no longer matches its canonical identity.',409);
   const identity=await validateRepository(repoRoot,roots,logger);
   if(identity.repoRoot!==repoRoot)throw new ContextError('REPOSITORY_IDENTITY_MISMATCH','The registered location no longer represents the expected Git working tree.',409);
   const overrides=await filterOverrides(repoRoot);
   const status=decode(await gitBytes(repoRoot,['status','--porcelain=v1','-z','--untracked-files=all','--ignore-submodules=all'],CONTEXT_LIMITS.gitBytes,[...overrides,'core.untrackedCache=false']));
   const raw=decode(await gitBytes(repoRoot,['ls-files','--cached','-z'],CONTEXT_LIMITS.gitBytes));
   const paths=raw?raw.split('\0'):[];if(raw&&paths.pop()!=='')throw new ContextError('CONTEXT_CAPTURE_FAILED','Git returned an incomplete tracked inventory.',422);
   const end=await validateRepository(repoRoot,roots,logger);
   if(end.repoRoot!==repoRoot)throw new ContextError('REPOSITORY_IDENTITY_MISMATCH','The registered Git working-tree root changed during capture.',409);
   if(end.registeredHead!==identity.registeredHead||end.registeredBranch!==identity.registeredBranch)throw new ContextError('REPOSITORY_CHANGED_DURING_CAPTURE','The repository changed while context was being captured. Try again.',409);
   return {baseHead:identity.registeredHead,branch:identity.registeredBranch,changes:parseStatus(status),trackedPaths:checkedPaths(paths)};
  });
 }catch(error){
  if(error instanceof ContextError)throw error;
  if(error instanceof ProjectError)throw new ContextError('REPOSITORY_UNAVAILABLE','The registered repository is unavailable or outside its allowed location.',422);
  if(error instanceof Error&&'code'in error&&(error.code==='ENOENT'||error.code==='ENOTDIR'))throw new ContextError('REPOSITORY_UNAVAILABLE',"This project's repository is no longer available at its registered location.",404);
  const e=error as {code?:unknown;killed?:unknown};logger({event:'context.git_failed',level:'error',code:'CONTEXT_CAPTURE_FAILED',processCode:typeof e.code==='string'||typeof e.code==='number'?e.code:'UNKNOWN'});
  if(e.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER'||e.killed)throw new ContextError('CONTEXT_CAPTURE_LIMIT','Project context exceeded the safe capture output or time limit.',422);
  throw new ContextError('CONTEXT_CAPTURE_FAILED','Project context could not be observed safely. Check the coordinator logs.',422);
 }
}
