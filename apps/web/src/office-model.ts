import type {TicketEvent} from '../../../packages/shared/tickets.ts';
export const officeDesks=[
 {role:'builder',name:'Builder',x:220,y:260},
 {role:'grader',name:'Grader',x:780,y:230},
 {role:'writer',name:'Test Writer',x:275,y:100},
 {role:'owner',name:'Your stamp station',x:690,y:500},
] as const;
export type OfficeRole=typeof officeDesks[number]['role'];
export const inspectionBounds={x:620,y:100,width:320,height:280} as const;
export type OfficeFrame={ticketId:string;sequence:number;motionSequence:number;phase:string;activeRole:OfficeRole|null;stamp:'checked'|'look closer'|'failed'|null;humanDecision:string|null;writerRecorded:boolean;blocked:number;alarm:boolean;dimmed:boolean;line:string};
export function orderedOfficeEvents(id:string,events:readonly TicketEvent[]){const seen=new Set<number>();return [...events].filter(e=>e.ticketId===id&&Number.isSafeInteger(e.sequence)).sort((a,b)=>a.sequence-b.sequence).filter(e=>{if(seen.has(e.sequence))return false;seen.add(e.sequence);return true;});}
export function officeFrame(ticketId:string,events:readonly TicketEvent[]):OfficeFrame{
 const f:OfficeFrame={ticketId,sequence:0,motionSequence:0,phase:'unknown',activeRole:null,stamp:null,humanDecision:null,writerRecorded:false,blocked:0,alarm:false,dimmed:false,line:'No recorded activity'};const blocked=new Set<string>();
 for(const e of orderedOfficeEvents(ticketId,events)){
  f.sequence=e.sequence;
  if(e.kind==='submitted'){f.phase='queued';f.line='Waiting to start';f.motionSequence=e.sequence;}
  if(e.kind==='retry_requested'){f.alarm=false;f.dimmed=false;f.blocked=0;blocked.clear();f.motionSequence=e.sequence;}
  if(e.kind==='state_changed'&&typeof e.data.to==='string'){
   f.phase=e.data.to;f.motionSequence=e.sequence;f.activeRole=['building','fixing'].includes(f.phase)?'builder':f.phase==='checking'?'grader':null;
   f.line=({queued:'Waiting to start',building:'Building at the bench',fixing:'Correcting the change',checking:'Inspecting the frozen change',ready_for_review:'Waiting for your review',needs_you:'Waiting for your help',kept:'Accepted',discarded:'Rejected',interrupted:'Interrupted',cancelled:'Cancelled',harness_error:'Stopped with an error'} as Record<string,string>)[f.phase]??'No recorded activity';
   if(['building','fixing','checking'].includes(f.phase))f.stamp=null;
  }
  if(e.kind==='agent_stopped')f.activeRole=null;
  if(e.kind==='agent_event'&&e.data.kind==='blocked_action'){const data=e.data.data as Record<string,unknown>|undefined,key=String(e.data.attemptId)+':'+String(data?.itemId??e.sequence);if(!blocked.has(key)){blocked.add(key);f.blocked++;}}
  if(e.kind==='check_result'){
   f.activeRole=null;f.motionSequence=e.sequence;f.stamp=e.data.verdict==='VERIFIED'?'checked':e.data.verdict==='PASSED WITH GAPS'?'look closer':e.data.verdict==='FAILED'?'failed':null;
   f.writerRecorded=!!(e.data.testWriter&&typeof e.data.testWriter==='object'&&(e.data.testWriter as Record<string,unknown>).started===true);
   f.line=f.stamp==='checked'?'Checked':f.stamp==='look closer'?'Checked with gaps':f.stamp==='failed'?'Checks failed':'No passing check result';
  }
  if(e.kind==='decision'){f.humanDecision=typeof e.data.decision==='string'?e.data.decision:typeof e.data.action==='string'?e.data.action:'Recorded';f.motionSequence=e.sequence;}
  if((e.kind==='needs_you'&&e.data.kind==='TRIPWIRE')||(e.kind==='agent_event'&&e.data.kind==='tripwire')){f.alarm=true;f.motionSequence=e.sequence;f.line='Read alarm. Builder stopped.';}
  if((e.kind==='cancellation_requested'||e.kind==='needs_you')&&e.data.kind==='STOP_ALL'){f.dimmed=true;f.motionSequence=e.sequence;f.line='Stop all requested';}
  if(f.alarm||f.dimmed)f.activeRole=null;
 }
 return f;
}
export function builderPose(f:OfficeFrame){return f.phase==='checking'?{x:560,y:330}:{x:300,y:330};}
export function cratePose(f:OfficeFrame){return f.phase==='checking'?{x:760,y:315}:['building','fixing'].includes(f.phase)?{x:225,y:287}:f.phase==='queued'||f.phase==='unknown'?{x:120,y:475}:{x:635,y:495};}
export function officeTransition(previous:OfficeFrame|null,next:OfficeFrame){return !!previous&&previous.sequence>0&&previous.ticketId===next.ticketId&&next.sequence>previous.sequence&&next.motionSequence>previous.motionSequence;}
export function replaySchedule(id:string,events:readonly TicketEvent[]){const ordered=orderedOfficeEvents(id,events);let weight=0;const weights=ordered.map((e,i)=>{if(i){const a=Date.parse(ordered[i-1]!.createdAt),b=Date.parse(e.createdAt);weight+=Number.isFinite(a)&&Number.isFinite(b)?Math.max(1,Math.min(30000,b-a)):1;}return weight;});return ordered.map((event,i)=>({event,atMs:weight?Math.round(weights[i]!/weight*45000):0}));}

export function officeRoleAt(f:OfficeFrame,x:number,y:number):OfficeRole|null{for(const d of officeDesks){const p=d.role==='builder'?builderPose(f):{x:d.x,y:d.y+55};if(Math.hypot(p.x-x,p.y-y)<48)return d.role;}const p=cratePose(f);return Math.hypot(p.x-x,p.y-y)<32?'owner':null;}
