import {createHash} from 'node:crypto';
import {constants,closeSync,fstatSync,lstatSync,openSync,readSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {setTimeout} from 'node:timers/promises';
import type {DatabaseSync} from 'node:sqlite';
import type {EffectEvidence} from '../../packages/shared/permissions.ts';
import {canonical,effectPath} from './permission-validation.ts';
// Observation of supported ledger files is recovery evidence, never task verification.
export async function reconcileAttemptEffects(db:DatabaseSync,attemptId:string):Promise<EffectEvidence>{
 const files:EffectEvidence['files']=[],observedAt=()=>new Date().toISOString();
 try{
  const filename=db.prepare('PRAGMA database_list').all().find(row=>row.name==='main')?.file;
  if(typeof filename!=='string'||!filename)throw Error('Persistent ledger location is unavailable.');
  const paths=db.prepare('SELECT DISTINCT path FROM runtime_permission_requests WHERE attempt_id=? ORDER BY path').all(attemptId).map(row=>String(row.path));
  const workspace=db.prepare('SELECT workspace_path FROM build_attempts WHERE id=?').get(attemptId)?.workspace_path;
  const expectedWorkspace=join(realpathSync(dirname(String(filename))),'workspaces',attemptId),counter=join(expectedWorkspace,'.cc-runtime','counter.txt');
  if(workspace!==expectedWorkspace)throw Error('Owned counter workspace binding is outside the Attempt namespace.');
  paths.push(counter);
  if(paths.length>32)throw Error('Recorded effect inventory exceeds the bounded reconciliation limit.');
  function sample(){return paths.map(path=>{
   if(path===counter){for(const directory of [join(dirname(String(filename)),'workspaces'),expectedWorkspace,dirname(counter)]){try{const stat=lstatSync(directory);if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync(directory)!==directory)throw Error('Owned counter directory is not canonical.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}}
   else effectPath(path,dirname(String(filename)),attemptId);
   try{const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size>65536)throw Error('Effect is not a bounded regular file.');
    const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{
     const stat=fstatSync(fd);if(!stat.isFile()||stat.size>65536)throw Error('Effect changed while opening.');
     const buffer=Buffer.alloc(65537),count=readSync(fd,buffer,0,buffer.length,0),bytes=buffer.subarray(0,count),after=fstatSync(fd),linked=lstatSync(path);
     if(bytes.length>65536||stat.ino!==linked.ino||stat.dev!==linked.dev||stat.size!==after.size||stat.mtimeMs!==after.mtimeMs||stat.ctimeMs!==after.ctimeMs)throw Error('Effect changed during observation.');
     return {path,exists:true,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
    }finally{closeSync(fd);}
   }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {path,exists:false,sha256:null,bytes:null};throw error;}
  });}
  let previous=sample();for(let i=0;i<2;i++){await setTimeout(100);const next=sample();if(canonical(previous)!==canonical(next))throw Error('Recorded effects are not stable across three observations.');previous=next;}
  files.push(...previous);return {state:files.some(file=>file.exists)?'OBSERVED':'NONE_OBSERVED',stable:true,files,observedAt:observedAt(),reason:null};
 }catch(error){return {state:'UNKNOWN',stable:false,files,observedAt:observedAt(),reason:error instanceof Error?error.message.slice(0,500):'Effect observation is unknown.'};}
}
