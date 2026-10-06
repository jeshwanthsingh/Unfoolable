import {openSync,closeSync,writeFileSync,readFileSync,unlinkSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {failure} from './errors.ts';
/** A dead PID may relinquish its lock; any living/reused PID fails closed. */
export function acquireDatabaseLock(dataDir:string){
 const lock=join(dataDir,'.coordinator.lock'),recovery=join(dataDir,'.coordinator-recovery.lock');
 const ownership=JSON.stringify({pid:process.pid,id:randomUUID()});
 const unavailable=()=>failure('DATABASE_IN_USE','Data directory is owned or its ownership cannot be safely reconciled.');
 function create(){const fd=openSync(lock,'wx',0o600);try{writeFileSync(fd,ownership);}finally{closeSync(fd);}}
 try{create();}catch(error){
  if(!(error instanceof Error&&'code'in error&&error.code==='EEXIST'))throw error;
  let fd:number;try{fd=openSync(recovery,'wx',0o600);}catch{throw unavailable();}
  try{
   const stat=lstatSync(lock);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024)throw unavailable();
   const old=readFileSync(lock,'utf8');let owner:unknown;try{owner=JSON.parse(old);}catch{throw unavailable();}
   const pid=(owner as {pid?:unknown})?.pid;if(!Number.isSafeInteger(pid)||Number(pid)<=0)throw unavailable();
   try{process.kill(Number(pid),0);throw unavailable();}catch(problem){if(!(problem instanceof Error&&'code'in problem&&problem.code==='ESRCH'))throw unavailable();}
   const now=lstatSync(lock);if(now.ino!==stat.ino||now.dev!==stat.dev||readFileSync(lock,'utf8')!==old)throw unavailable();
   unlinkSync(lock);create();
  }finally{closeSync(fd);unlinkSync(recovery);}
 }
 return ()=>{try{if(readFileSync(lock,'utf8')===ownership)unlinkSync(lock);}catch(error){if(!(error instanceof Error&&'code'in error&&error.code==='ENOENT'))throw error;}};
}
