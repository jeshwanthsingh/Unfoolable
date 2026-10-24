import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {orderedOfficeEvents,officeFrame} from './office-model.ts';
import {officeActivity,safeOfficeFile} from './office-activity.ts';
import {setup,createActor,assign} from 'xstate';
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
  if(e.kind==='agent_started'){line='Builder session started';station='builder';}
  if(e.kind==='retry_requested'){line='Retry recorded';station='sandbox';}
  if(e.kind==='cancellation_requested'&&d.kind==='STOP_ALL'){line='Stop all requested';station='you';}
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
export function fuelFact(events:readonly TicketEvent[]){
 let limit:number|null=null;const usage=new Map<string,number>();
 for(const e of [...events].sort((a,b)=>a.sequence-b.sequence)){const d=e.data,p=d.data as Record<string,unknown>|undefined;if(d.kind==='budget_limits'||d.kind==='budget_extension'){const n=(d.limits as Record<string,unknown>|undefined)?.maxCodexTokens;if(typeof n==='number'&&Number.isSafeInteger(n)&&n>0)limit=n;}
  if(e.kind==='retry_requested'&&d.mode!=='recheck'&&d.trigger!=='budget_continue'&&d.trigger!=='night_rate_limit')usage.clear();
  if(d.kind==='usage_observed'&&typeof d.attemptId==='string'&&!d.attemptId.startsWith('test-writer:')&&typeof p?.reportedTotal==='number'&&Number.isSafeInteger(p.reportedTotal)&&p.reportedTotal>=0)usage.set(d.attemptId,Math.max(usage.get(d.attemptId)??0,p.reportedTotal));
 }
 const used=usage.size?[...usage.values()].reduce((a,b)=>a+b,0):null;return {used,limit,percent:used!==null&&limit!==null?Math.round(used/limit*100):null};
}

export type Station=Beat['station'];
type Journey={sandbox:boolean;builder:boolean;grader:boolean;seal:boolean;you:boolean};
const blank=():Journey=>({sandbox:false,builder:false,grader:false,seal:false,you:false});
// Observation transitions describe recorded visits, never completion or authority.
const journeyMachine=setup({types:{} as {context:Journey;events:{type:'OBSERVE';facts:Journey;station:Station|null}},actions:{observe:assign(({event})=>event.facts)}}).createMachine({context:blank(),initial:'unknown',states:{unknown:{},sandbox:{},builder:{},grader:{},seal:{},you:{}},on:{OBSERVE:[
 {guard:({event})=>event.station==='sandbox',target:'.sandbox',actions:'observe'},
 {guard:({event})=>event.station==='builder',target:'.builder',actions:'observe'},
 {guard:({event})=>event.station==='grader',target:'.grader',actions:'observe'},
 {guard:({event})=>event.station==='seal',target:'.seal',actions:'observe'},
 {guard:({event})=>event.station==='you',target:'.you',actions:'observe'},
 {target:'.unknown',actions:'observe'}]}});
export function journeyView(id:string,events:readonly TicketEvent[]){
 const rows=orderedOfficeEvents(id,events),f=officeFrame(id,rows),retry=rows.filter(e=>e.kind==='retry_requested').at(-1)?.sequence??0,attempt=rows.filter(e=>e.sequence>retry),facts={sandbox:attempt.some(e=>e.kind==='agent_event'&&e.data.kind==='workspace_prepared'),builder:attempt.some(e=>e.kind==='agent_started'||e.kind==='agent_launch_requested'||e.kind==='agent_bound'||e.kind==='state_changed'&&['building','fixing'].includes(String(e.data.to))),grader:attempt.some(e=>e.kind==='verification_started'||e.kind==='check_result'),seal:!!f.sealed&&attempt.some(e=>e.kind==='agent_event'&&e.data.kind==='verdict_sealed'),you:attempt.some(e=>e.kind==='state_changed'&&['ready_for_review','kept','discarded','needs_you'].includes(String(e.data.to)))},station=choreograph(id,rows).at(-1)?.station??null;
 const actor=createActor(journeyMachine).start();actor.send({type:'OBSERVE',facts,station});const snapshot=actor.getSnapshot();actor.stop();const stages:Station[]=['sandbox','builder','grader','seal','you'];const status=Object.fromEntries(stages.map((s,i)=>[s,snapshot.context[s]?'recorded':stages.slice(i+1).some(later=>snapshot.context[later])?'unknown':'pending'])) as Record<Station,'recorded'|'unknown'|'pending'>;return {current:snapshot.value as Station|'unknown',seen:snapshot.context,status};
}
export function journeyFacts(id:string,events:readonly TicketEvent[]){return journeyView(id,events).seen;}
export function prefixAt(id:string,events:readonly TicketEvent[],count:number){const rows=orderedOfficeEvents(id,events);return rows.slice(0,Math.max(0,Math.min(rows.length,Math.floor(count))));}
export function replayMoments(id:string,events:readonly TicketEvent[]){
 const rows=orderedOfficeEvents(id,events),beats=choreograph(id,rows);if(!rows.length)return [];
 const counts=[0,...beats.map(b=>rows.findIndex(e=>e.sequence===b.sequences.at(-1))+1),rows.length].filter((n,i,a)=>i===0||n!==a[i-1]);
 const duration=Math.max(20000,(counts.length-1)*MIN_BEAT);return counts.map((count,i)=>({count,atMs:Math.round(i*duration/Math.max(1,counts.length-1))}));
}
/** A fresh selection snaps to now; only new sequence IDs may queue work. */
export class LiveRoomQueue{
 id:string|null=null;last=0;pending:Beat[]=[];
 sync(id:string,events:readonly TicketEvent[]){const rows=orderedOfficeEvents(id,events),last=rows.at(-1)?.sequence??0;if(this.id!==id||this.last===0){this.id=id;this.last=last;this.pending=[];return {immediate:last};}if(last<=this.last)return {immediate:null};
 const f=officeFrame(id,rows);if(f.alarm||f.dimmed){this.last=last;this.pending=[];return {immediate:last};}
 for(const beat of choreograph(id,rows)){if(beat.sequences.at(-1)!<=this.last)continue;const fresh={...beat,sequences:beat.sequences.filter(n=>n>this.last),readPaths:[...beat.readPaths]};
  // Rebuild a burst split by SSE deliveries from the full log, not shell text.
  const previous=this.pending.at(-1);if(previous?.readPaths.length&&fresh.readPaths.length&&previous.sequences.some(n=>beat.sequences.includes(n))){previous.sequences=[...new Set([...previous.sequences,...fresh.sequences])];previous.readPaths=[...beat.readPaths];previous.line=beat.line;}else this.pending.push(fresh);
 }this.last=last;return {immediate:this.pending.length?null:last};
 }
 take(){return this.pending.shift();}
}
export type RoomKey='net'|'paths'|'fuel'|'grader'|'seal'|'builder'|'books'|'terminal'|'writer'|'stop'|'laser'|'clock';
export const roomObjects:{key:RoomKey;name:string;x:number;y:number;w:number;h:number}[]=[
 {key:'net',name:'No internet',x:55,y:8,w:155,h:43},{key:'paths',name:'Protected drawers',x:290,y:7,w:133,h:45},{key:'fuel',name:'Builder fuel',x:213,y:153,w:30,h:55},{key:'grader',name:'Grader room',x:455,y:68,w:290,h:166},{key:'seal',name:'Your stamp desk',x:799,y:92,w:140,h:120},{key:'builder',name:'Builder',x:143,y:115,w:125,h:102},{key:'books',name:'Files',x:18,y:65,w:60,h:100},{key:'terminal',name:'Commands',x:303,y:122,w:58,h:75},{key:'writer',name:'Test Writer',x:325,y:55,w:65,h:60},{key:'stop',name:'Stop lever',x:920,y:5,w:27,h:65},{key:'laser',name:'Read alarm',x:427,y:74,w:24,h:163},{key:'clock',name:'Local time',x:810,y:5,w:65,h:50}];
export function roomExplanation(key:RoomKey,id:string,events:readonly TicketEvent[],probe:{count:number|null;date:string|null;source:string}){
 const frame=officeFrame(id,events),fuel=fuelFact(events),facts:Record<RoomKey,{sentence:string;source:string}>={
 net:{sentence:'The Builder is configured without outside internet access.',source:'Builder permission profile; dated read/network denial probe.'},
 paths:{sentence:probe.count===null?'The protected-path probe result is unknown.':probe.count+' paths were unreadable in the probe on '+probe.date+'.',source:probe.source+'; a dated system check, not a per-task secret count.'},
 fuel:{sentence:fuel.percent===null?'Builder fuel usage is unknown.':fuel.used+' of '+fuel.limit+' Builder tokens reported ('+fuel.percent+'%).',source:'Selected event prefix: budget_limits / budget_extension and usage_observed, Builder sessions only.'},
 grader:{sentence:'Protected checks run in a separate restricted process.',source:'apps/server/oracle-execution.ts; architecture fact, not a running-work claim.'},
 seal:{sentence:frame.sealed?'A seal was recorded for this exact check.':'No bound seal is recorded at this point.',source:'Selected event prefix: check_result plus matching verdict_sealed; current cryptographic status stays in Proof.'},
 builder:{sentence:frame.activeRole==='builder'?'A building state is recorded at this point.':'No active Builder is recorded at this point.',source:'Selected ticket state_changed and agent_started / agent_stopped events.'},
 books:{sentence:'File-reading motions use only safe, explicitly recorded file reads.',source:'agent_event/tool.started commandExecution actions with type read; no inferred file count.'},
 terminal:{sentence:'The terminal moves only for a recorded command.',source:'agent_event/tool.started and tool.completed; raw commands and output are not displayed.'},
 writer:{sentence:'The Test Writer prepares only when its own start is recorded.',source:'agent_event/test_writer_launch_pending; no independent progress count is available.'},
 stop:{sentence:'Use Stop all in the header to stop work; this object explains it.',source:'Existing Stop all control and recorded STOP_ALL events; no new decision handler.'},
 laser:{sentence:frame.alarm?'A recorded read alarm stopped this Builder.':'No read alarm is recorded at this point.',source:'needs_you/TRIPWIRE or agent_event/tripwire; absence is not a sensor-health claim.'},
 clock:{sentence:'Lighting follows your local time; replay uses the recorded time.',source:'Browser local clock, or selected event timestamp in the browser’s time zone during replay; decorative, not work.'}
 };return facts[key];
}
