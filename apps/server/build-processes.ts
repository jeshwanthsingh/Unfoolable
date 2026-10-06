import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import type {ProcessRecord,CleanupResult} from '../../packages/shared/build.ts';
const sourceHelper=fileURLToPath(new URL('../../scripts/build-process-info.py',import.meta.url));
const helper=existsSync(sourceHelper)?sourceHelper:resolve('scripts/build-process-info.py');
type KernelRecord={pid:number;ppid:number;pgid:number;sid:number;birth_id:string;executable:string;zombie:boolean};
function query(mode:'one'|'tree',pid:number):KernelRecord|null|KernelRecord[]{return JSON.parse(execFileSync(process.platform==='darwin'?'/usr/local/bin/python3':'/usr/bin/python3',[helper,mode,String(pid)],{encoding:'utf8',timeout:3000,maxBuffer:256*1024}));}
export function processIdentity(pid:number):ProcessRecord|null{const value=query('one',pid) as KernelRecord|null;if(!value){try{process.kill(pid,0);}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')return null;throw new Error('Process existence or kernel identity is unknown');}throw new Error('Live process kernel identity is unavailable');}return {pid:value.pid,ppid:value.ppid,pgid:value.pgid,sid:value.sid,birth:value.birth_id,executable:value.executable,observedAt:new Date().toISOString(),exitedAt:value.zombie?new Date().toISOString():null};}
export function ownedProcessSnapshot(root:number):ProcessRecord[]{return (query('tree',root) as KernelRecord[]).map(value=>({pid:value.pid,ppid:value.ppid,pgid:value.pgid,sid:value.sid,birth:value.birth_id,executable:value.executable,observedAt:new Date().toISOString(),exitedAt:value.zombie?new Date().toISOString():null}));}
export function sameProcess(a:ProcessRecord,b:ProcessRecord){return a.pid===b.pid&&a.birth===b.birth&&a.executable===b.executable&&a.pgid===b.pgid&&a.sid===b.sid;}
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export async function reconcileOwnedProcesses(records:ProcessRecord[]):Promise<CleanupResult>{
 let ambiguous=false;const identities=new Map(records.map(r=>[r.pid,r]));const roots=records.filter(r=>r.pid===r.pgid&&r.pid===r.sid);
 // Refresh only the directly owned session while its recorded root birth still matches.
 for(const root of roots){try{const now=processIdentity(root.pid);if(now&&!now.exitedAt&&sameProcess(root,now))for(const row of ownedProcessSnapshot(root.pid))identities.set(row.pid,row);}catch{ambiguous=true;}}
 const inspect=()=>{const live:ProcessRecord[]=[];for(const old of identities.values()){
  try{const current=processIdentity(old.pid);if(!current||current.exitedAt)continue;if(!old.birth||!sameProcess(old,current)){ambiguous=true;continue;}live.push(current);}catch{ambiguous=true;}
 }return live;};
 for(const signal of ['SIGTERM','SIGKILL'] as const){for(const live of inspect().sort((a,b)=>Number(roots.some(r=>r.pid===a.pid))-Number(roots.some(r=>r.pid===b.pid)))){
  // Recheck immediately before each signal. No broad unrelated process scan or PID-only kill.
  try{const now=processIdentity(live.pid);if(now&&!now.exitedAt&&sameProcess(live,now))process.kill(live.pid,signal);else if(now&&!now.exitedAt)ambiguous=true;}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')ambiguous=true;}
 }await pause(signal==='SIGTERM'?250:150);}
 const remaining=inspect();for(const root of roots){try{const survivors=ownedProcessSnapshot(root.pid).filter(r=>!r.exitedAt);if(survivors.some(r=>!identities.has(r.pid)||!sameProcess(identities.get(r.pid)!,r)))ambiguous=true;for(const row of survivors)if(identities.has(row.pid)&&sameProcess(identities.get(row.pid)!,row)&&!remaining.some(r=>r.pid===row.pid))remaining.push(row);}catch{ambiguous=true;}}
 return {verified:!ambiguous&&remaining.length===0,ambiguous,remaining,terminalCount:0,reason:ambiguous?'Process ownership identity could not be certified':remaining.length?'Owned processes remain':null};
}
