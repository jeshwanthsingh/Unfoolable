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
type ReconcileOperations={identity:(pid:number)=>ProcessRecord|null;snapshot:(pid:number)=>ProcessRecord[];signal:(pid:number,signal:'SIGTERM'|'SIGKILL')=>void;pause:(ms:number)=>Promise<void>};
const kernelOperations:ReconcileOperations={identity:processIdentity,snapshot:ownedProcessSnapshot,signal:(pid,signal)=>{process.kill(pid,signal);},pause};
// Internal kernel-race test seam; no application route can supply process operations.
export async function reconcileOwnedProcessesFixture(records:ProcessRecord[],operations:ReconcileOperations){return reconcile(records,operations);}
export async function reconcileOwnedProcesses(records:ProcessRecord[]):Promise<CleanupResult>{return reconcile(records,kernelOperations);}
async function reconcile(records:ProcessRecord[],ops:ReconcileOperations):Promise<CleanupResult>{
 const uncertain=new Map<number,string>(),permanent=new Map<number,string>(),identities=new Map(records.map(r=>[r.pid,r]));const roots=records.filter(r=>r.pid===r.pgid&&r.pid===r.sid);
 for(const record of records)if(!sameProcess(record,identities.get(record.pid)!))permanent.set(record.pid,'recorded identity conflict');
 // Refresh only the directly owned session while its recorded root birth still matches.
 for(const root of roots){try{const now=ops.identity(root.pid);if(now&&!now.exitedAt){if(!sameProcess(root,now)){permanent.set(root.pid,'root birth/executable/group/session mismatch');continue;}for(const row of ops.snapshot(root.pid)){const recorded=identities.get(row.pid);if(recorded&&!sameProcess(recorded,row)){permanent.set(row.pid,'refreshed owned group identity mismatch');continue;}identities.set(row.pid,row);}}}catch{uncertain.set(root.pid,'initial root identity or group query unavailable');}}
 const inspect=(absent?:Set<number>)=>{const live:ProcessRecord[]=[];for(const old of identities.values()){
  try{const current=ops.identity(old.pid);if(!current){absent?.add(old.pid);continue;}if(current.exitedAt)continue;if(!old.birth||!sameProcess(old,current)){permanent.set(old.pid,'live birth/executable/group/session mismatch');continue;}live.push(current);}catch{uncertain.set(old.pid,'owned PID identity query unavailable');}
 }return live;};
 for(const signal of ['SIGTERM','SIGKILL'] as const){for(const live of inspect().sort((a,b)=>Number(roots.some(r=>r.pid===a.pid))-Number(roots.some(r=>r.pid===b.pid)))){
  // Recheck immediately before each signal. No broad unrelated process scan or PID-only kill.
  if(permanent.has(live.pid))continue;
  try{const now=ops.identity(live.pid);if(now&&!now.exitedAt&&sameProcess(live,now))ops.signal(live.pid,signal);else if(now&&!now.exitedAt)permanent.set(live.pid,'identity changed before signal');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')uncertain.set(live.pid,'signal or immediate identity query unavailable');}
 }await ops.pause(signal==='SIGTERM'?250:150);}
 const checkFinal=()=>{const absent=new Set<number>(),remaining=inspect(absent),emptyGroups=new Set<number>();for(const root of roots){try{const survivors=ops.snapshot(root.pid).filter(r=>!r.exitedAt);if(survivors.length===0)emptyGroups.add(root.pid);for(const row of survivors){if(!identities.has(row.pid)||!sameProcess(identities.get(row.pid)!,row)){permanent.set(row.pid,'unrecorded or reused PID remains in owned group');continue;}if(!remaining.some(r=>r.pid===row.pid))remaining.push(row);}}catch{uncertain.set(root.pid,'final owned group query unavailable');}}return {absent,remaining,emptyGroups};};
 const first=checkFinal();await ops.pause(100);const second=checkFinal();
 // A transient exit race can be cleared only by new proof: two ESRCH-confirmed absences and two empty owned-group inventories.
 const groupsEmpty=roots.every(root=>first.emptyGroups.has(root.pid)&&second.emptyGroups.has(root.pid));
 if(groupsEmpty)for(const pid of uncertain.keys())if(first.absent.has(pid)&&second.absent.has(pid))uncertain.delete(pid);
 const ambiguous=uncertain.size>0||permanent.size>0,remaining=second.remaining;
 const diagnostics=[...permanent,...uncertain].slice(0,8).map(([pid,reason])=>'pid '+pid+': '+reason).join('; ');
 return {verified:!ambiguous&&remaining.length===0,ambiguous,remaining,terminalCount:0,reason:ambiguous?'Process ownership identity could not be certified: '+diagnostics:remaining.length?'Owned processes remain: '+remaining.slice(0,8).map(r=>r.pid).join(','):null};
}
