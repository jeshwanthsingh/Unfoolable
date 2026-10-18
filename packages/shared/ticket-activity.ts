import type {TicketEvent,TicketStatus} from './tickets.ts';
export type ActivityStep={sequence:number;at:string;line:string};
export type TicketActivity={sequence:number;at:string|null;line:string;stages:('waiting'|'running'|'done')[];steps:ActivityStep[];files:{path:string;sequence:number}[];tests:{passed:number;total:number}|null};
const active=(status:TicketStatus)=>['building','fixing','checking'].includes(status);
// Only relative, display-safe metadata is projected. No command/output strings leave this boundary.
function pathLabel(value:unknown):string|null{
 if(typeof value!=='string'||value.length>240||!value||value.startsWith('/')||value.split(/[\\/]/).includes('..')||/[\x00-\x1f=:]/.test(value)||/auth|credential|cookie|secret|token|password|^\.env/i.test(value))return null;
 return value;
}
export function projectActivity(events:readonly TicketEvent[],status:TicketStatus):TicketActivity{
 const out:TicketActivity={sequence:0,at:null,line:status==='checking'?'Running old tests':'Making the change',stages:['waiting','waiting','waiting'],steps:[],files:[],tests:null};
 const files=new Map<string,number>();
 const step=(event:TicketEvent,line:string)=>{out.sequence=event.sequence;out.at=event.createdAt;out.line=line;out.steps.push({sequence:event.sequence,at:event.createdAt,line});};
 for(const event of events){const d=event.data;
  if(event.kind==='state_changed'){
   if(d.to==='building'||d.to==='fixing'){out.stages=['running','waiting','waiting'];out.tests=null;step(event,d.to==='fixing'?'Making a correction':'Making the change');}
   else if(d.to==='checking'){out.stages=['done','running','waiting'];step(event,'Running old tests');}
   else if(d.to==='ready_for_review'){out.stages[2]=out.stages[1]==='done'?'done':'waiting';step(event,'Ready for you to look');}
   else if(d.to==='needs_you')step(event,'Needs your OK before continuing');
   else if(d.to==='kept')step(event,'Accepted');else if(d.to==='discarded')step(event,'Rejected');
   else if(['interrupted','cancelled','harness_error'].includes(String(d.to)))step(event,'Stopped');
  }else if(event.kind==='candidate_frozen')out.stages[0]='done';
  else if(event.kind==='verification_started'){out.stages=['done','running','waiting'];step(event,'Running old tests');}
  else if(event.kind==='check_result'){
   if(['VERIFIED','PASSED WITH GAPS'].includes(String(d.verdict))){out.stages[1]='done';out.stages[2]='running';step(event,'Writing the proof');}
   else step(event,'The checks need a closer look');
  }else if(event.kind==='agent_event'){
   const info=d.data&&typeof d.data==='object'?d.data as Record<string,unknown>:{};
   if(d.kind==='check_progress'){
    if(info.phase==='passwords')step(event,'Checking for leaked passwords');
    else if(info.phase==='tests')step(event,'Running old tests');
    else if(info.phase==='proof')step(event,'Writing the proof');
    if(Number.isSafeInteger(info.passed)&&Number.isSafeInteger(info.total)&&Number(info.total)>0&&Number(info.passed)>=0&&Number(info.passed)<=Number(info.total))out.tests={passed:Number(info.passed),total:Number(info.total)};
   }
   if(d.kind!=='tool.started'&&d.kind!=='tool.completed')continue;
   if(info.type==='fileChange'&&Array.isArray(info.changes)){
    for(const c of info.changes){const path=pathLabel(c?.path);if(path)files.set(path,event.sequence);}
    step(event,'Making the change');
   }else if(info.type==='commandExecution'){
    const actions=Array.isArray(info.actions)?info.actions:[];
    const read=actions.find(a=>a?.type==='read'&&pathLabel(a.path??a.name));
    if(read){const path=pathLabel(read.path??read.name)!;step(event,'Reading '+path.split('/').at(-1));}
    else if(actions.some(a=>a?.type==='search'))step(event,'Finding the relevant code');
    else step(event,d.kind==='tool.started'?'Running a command':'A command finished');
   }
  }
 }
 out.steps=out.steps.slice(-40);out.files=[...files].slice(-40).map(([path,sequence])=>({path,sequence}));
 return out;
}
export function liveLine(activity:TicketActivity,status:TicketStatus,now:number):string{
 if(active(status)&&activity.at&&now-Date.parse(activity.at)>=20000)return 'Still working...';
 return activity.line;
}
