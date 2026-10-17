import {createActor,createMachine} from 'xstate';
import type {TicketEvent,TicketStatus} from './tickets.ts';
import {ticketStatuses} from './tickets.ts';
import {isQualityEvidence,isTamperingEvidence} from './quality-gates.ts';
import {isTestWriterEvidence,writerWarnings} from './test-writer.ts';
export const stations=['Inbox','Builder bench','Checker vault','Fixer','My desk'] as const;
export type LockState='open'|'closed'|'turning'|'greyed';
export const lockNames=['Protected tests','Quality gates','Test-tampering','Independent test','Coverage & mutation'] as const;
export type Lock={name:typeof lockNames[number];state:LockState;reason:string};
export type WorkshopTicket={id:string;status:TicketStatus|'unknown';station:number;agent:'working'|'needs you'|'stopped'|'blocked';blocked:number;sequence:number;locks:Lock[];approval:'unavailable'|'waiting'|'decided';verdict:string|null};
const ticketMachine=createMachine({id:'ticket-presentation',initial:'unknown',states:Object.fromEntries(['unknown',...ticketStatuses].map(s=>[s,{}])),on:Object.fromEntries(ticketStatuses.map(s=>[s,{target:'.'+s}]))});
const lockMachine=createMachine({id:'vault-lock',initial:'greyed',states:{open:{},closed:{},turning:{},greyed:{}},on:{open:'.open',closed:'.closed',turning:'.turning',greyed:'.greyed'}});
const approvalMachine=createMachine({id:'approval-presentation',initial:'unavailable',states:{unavailable:{},waiting:{},decided:{}},on:{unavailable:'.unavailable',waiting:'.waiting',decided:'.decided'}});
const stationFor=(s:string)=>s==='building'?1:s==='checking'?2:s==='fixing'?3:['ready_for_review','needs_you','kept','discarded','harness_error','interrupted','cancelled'].includes(s)?4:0;
// Pure replay: no wall-clock transitions, promises, random progress or UI commands.
export function projectTicketEvents(id:string,events:TicketEvent[]):WorkshopTicket {
 const ticket=createActor(ticketMachine).start(),approval=createActor(approvalMachine).start(),locks=lockNames.map(()=>createActor(lockMachine).start());
 const reasons=lockNames.map(()=> 'Not checked');let blocked=0,sequence=0,verdict:string|null=null;
 const setLock=(i:number,state:LockState,reason:string)=>{locks[i]!.send({type:state});reasons[i]=reason;};
 const seen=new Set<number>(),blockedIds=new Set<string>();
 for(const e of [...events].sort((a,b)=>a.sequence-b.sequence)){
  if(e.ticketId!==id||seen.has(e.sequence))continue;seen.add(e.sequence);sequence=e.sequence;
  if(e.kind==='submitted')ticket.send({type:'queued'});
  if(e.kind==='retry_requested'){blocked=0;blockedIds.clear();approval.send({type:'unavailable'});}
  if(e.kind==='state_changed'&&ticketStatuses.includes(e.data.to as TicketStatus)){
   const status=e.data.to as TicketStatus;ticket.send({type:status});approval.send({type:['ready_for_review','needs_you'].includes(status)?'waiting':'unavailable'});
   if(['building','fixing','checking'].includes(status)){verdict=null;lockNames.forEach((_,i)=>setLock(i,status==='checking'? 'turning':'greyed',status==='checking'?'Check run started; group result pending':'No current check result'));}
   else if(['interrupted','harness_error','cancelled','needs_you'].includes(status))lockNames.forEach((_,i)=>{if(locks[i]!.getSnapshot().value==='turning')setLock(i,'greyed','Run stopped without a group result');});
  }
  if(e.kind==='agent_event'&&e.data.kind==='blocked_action'){
   const data=e.data.data as Record<string,unknown>|undefined,key=String(e.data.attemptId)+':'+String(data?.itemId??e.sequence);if(!blockedIds.has(key)){blockedIds.add(key);blocked++;}
  }
  if(e.kind==='check_result'){
   const c=e.data;verdict=typeof c.verdict==='string'?c.verdict:null;
   lockNames.forEach((_,i)=>setLock(i,'greyed','No group evidence recorded'));
   setLock(0,verdict==='VERIFIED'||verdict==='PASSED WITH GAPS'?'open':verdict==='FAILED'?'closed':'greyed',verdict==='FAILED'?'Protected check failure recorded':verdict==='VERIFIED'||verdict==='PASSED WITH GAPS'?'Protected checks passed; inspect listed gaps':'Not checked or harness error');
   if(isQualityEvidence(c.qualityGates)){const g=c.qualityGates.gates;setLock(1,g.some(x=>x.status==='FAIL')?'closed':g.length&&g.every(x=>x.status==='PASS')?'open':'greyed',g.map(x=>x.gate+': '+x.status).join(' · ')||'No gates');}
   if(isTamperingEvidence(c.testTampering))setLock(2,c.testTampering.status==='CLEAR'?'open':c.testTampering.status==='FLAGGED'?'closed':'greyed',c.testTampering.status);
   if(isTestWriterEvidence(c.testWriter)){const w=c.testWriter;setLock(3,writerWarnings(w).length?'closed':w.checks.length&&w.checks.every(x=>x.status==='ADMITTED')?'open':'greyed',writerWarnings(w).length?'Independent test disagrees':w.reason??'Advisory; not all tests admitted');setLock(4,'greyed',w.lineCoverage?.percent!=null?'Changed-line coverage '+w.lineCoverage.percent.toFixed(1)+'%; mutation advisory':'Not measured; no pass threshold');}
  }
  if(e.kind==='decision')approval.send({type:'decided'});
 }
 const status=ticket.getSnapshot().value as WorkshopTicket['status'];
 const result:WorkshopTicket={id,status,station:stationFor(status),agent:['building','fixing','checking'].includes(status)?(blocked?'blocked':'working'):status==='needs_you'||status==='ready_for_review'?'needs you':'stopped',blocked,sequence,locks:lockNames.map((name,i)=>({name,state:locks[i]!.getSnapshot().value as LockState,reason:reasons[i]!})),approval:approval.getSnapshot().value as WorkshopTicket['approval'],verdict};
 ticket.stop();approval.stop();locks.forEach(l=>l.stop());return result;
}
export function vaultMayOpen(state:WorkshopTicket,keepAvailable:boolean,evidenceStale=false){return state.status==='ready_for_review'&&['VERIFIED','PASSED WITH GAPS'].includes(state.verdict??'')&&keepAvailable&&!evidenceStale;}
