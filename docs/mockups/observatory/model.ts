import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {orderedOfficeEvents,officeFrame} from '../../../apps/web/src/office-model.ts';
import {officeActivity,safeOfficeFile} from '../../../apps/web/src/office-activity.ts';
import {createMachine,createActor,assign} from 'xstate';
export type Beat={sequences:number[];at:string;line:string;station:'sandbox'|'builder'|'grader'|'seal'|'you';readPaths:string[]};
export const MIN_BEAT=350;
/** No unknown payload or raw process output may become an animation. */
export function choreograph(id:string,events:readonly TicketEvent[]):Beat[]{
 const beats:Beat[]=[];
 for(const e of orderedOfficeEvents(id,events)){
  let line='',station:Beat['station']='builder',readPaths:string[]=[];const d=e.data,p=(d.data??{}) as Record<string,unknown>;
  if(e.kind==='submitted'){line='Request recorded';station='sandbox';}
  if(e.kind==='state_changed'){line=({building:'Making the change',fixing:'Correcting the change',checking:'Checking the frozen change',ready_for_review:'Ready for your review',kept:'Accepted',discarded:'Rejected',needs_you:'Waiting for your help',interrupted:'Work interrupted',cancelled:'Cancelled',harness_error:'The worker stopped with an error',queued:'Waiting to start'} as Record<string,string>)[String(d.to)]??'';station=d.to==='checking'?'grader':['ready_for_review','kept','discarded','needs_you','interrupted','cancelled','harness_error'].includes(String(d.to))?'you':'builder';}
  if(e.kind==='candidate_frozen'){line='Change saved for inspection';station='grader';}
  if(e.kind==='verification_started'){line='Protected checking started';station='grader';}
  if(e.kind==='agent_stopped')line='Builder session stopped';
  if(e.kind==='check_result'){line=d.harnessError?'Checking stopped with an app error':d.verdict==='VERIFIED'?'The recorded checks passed':d.verdict==='PASSED WITH GAPS'?'Checks finished with unchecked parts':d.verdict==='FAILED'?'A protected check failed':'The change was not checked';station='grader';}
  if(e.kind==='needs_you'){line=d.kind==='TRIPWIRE'?'Read alarm. Builder stopped.':d.kind==='STOP_ALL'?'Stop all requested':'Your help was requested';station='you';}
  if(e.kind==='agent_event'){
   if(d.kind==='workspace_prepared'){line='Isolated working copy prepared';station='sandbox';}
   if(d.kind==='tool.started'){
    if(p.type==='fileChange')line='Making the change';
    else if(p.type==='commandExecution'){
     const actions=Array.isArray(p.actions)?p.actions:[];
     readPaths=[...new Set(actions.filter(a=>a&&typeof a==='object'&&a.type==='read'&&safeOfficeFile(a.path)).map(a=>String(a.path)))];
     line=readPaths.length===1?'Reading '+safeOfficeFile(readPaths[0]):readPaths.length?'Reading '+readPaths.length+' files':'Running a command';
    }
   }
   if(d.kind==='check_progress'){const a=officeActivity(id,events.filter(v=>v.sequence<=e.sequence));line=a.bubble;station='grader';}
   if(d.kind==='test_writer_launch_pending'){line='Preparing the independent Test Writer';station='grader';}
   if(d.kind==='verdict_sealed'&&officeFrame(id,events.filter(v=>v.sequence<=e.sequence)).sealed){line='Result seal recorded';station='seal';}
   if(d.kind==='tripwire'){line='Read alarm. Builder stopped.';station='you';}
  }
  if(!line)continue;
  const previous=beats.at(-1);
  // Only consecutive explicit reads merge. No inferred count from a shell string.
  if(readPaths.length&&previous?.readPaths.length&&Date.parse(e.createdAt)-Date.parse(previous.at)<1500){previous.sequences.push(e.sequence);previous.readPaths=[...new Set([...previous.readPaths,...readPaths])];previous.line='Reading '+previous.readPaths.length+' '+(previous.readPaths.length===1?'file':'files');}
  else beats.push({sequences:[e.sequence],at:e.createdAt,line,station,readPaths});
 }
 return beats;
}
export const journeyMachine=createMachine({context:{sandbox:false,builder:false,grader:false,seal:false,you:false},on:{OBSERVE:{actions:assign(({event})=>event.facts)}}});
export function journeyFacts(id:string,events:readonly TicketEvent[]){
 const rows=orderedOfficeEvents(id,events),f=officeFrame(id,rows),lastRetry=rows.filter(e=>e.kind==='retry_requested').at(-1)?.sequence??0,attempt=rows.filter(e=>e.sequence>lastRetry),facts={sandbox:attempt.some(e=>e.kind==='agent_event'&&e.data.kind==='workspace_prepared'),builder:attempt.some(e=>e.kind==='agent_started'),grader:attempt.some(e=>e.kind==='verification_started'||e.kind==='check_result'),seal:f.sealed===true,you:['ready_for_review','kept','discarded','needs_you'].includes(f.phase)};
 const actor=createActor(journeyMachine).start();actor.send({type:'OBSERVE',facts});const context=actor.getSnapshot().context;actor.stop();return context;
}
export function fuelFact(events:readonly TicketEvent[]){
 let limit:number|null=null;const usage=new Map<string,number>();
 for(const e of [...events].sort((a,b)=>a.sequence-b.sequence)){const d=e.data,p=d.data as Record<string,unknown>|undefined;if(d.kind==='budget_limits'||d.kind==='budget_extension'){const n=(d.limits as Record<string,unknown>|undefined)?.maxCodexTokens;if(typeof n==='number'&&n>0)limit=n;}
  if(e.kind==='retry_requested'&&d.mode!=='recheck'&&d.trigger!=='budget_continue'&&d.trigger!=='night_rate_limit')usage.clear();
  if(d.kind==='usage_observed'&&typeof d.attemptId==='string'&&!d.attemptId.startsWith('test-writer:')&&typeof p?.reportedTotal==='number')usage.set(d.attemptId,Math.max(usage.get(d.attemptId)??0,p.reportedTotal));
 }
 const used=usage.size?[...usage.values()].reduce((a,b)=>a+b,0):null;return {used,limit,percent:used!==null&&limit!==null?Math.round(used/limit*100):null};
}
