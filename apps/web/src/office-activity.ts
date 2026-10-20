import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {orderedOfficeEvents,officeFrame} from './office-model.ts';
export type OfficeAction='idle'|'read'|'type'|'command'|'inspect'|'frozen'|'stopped';
export type OfficeActivity={action:OfficeAction;bubble:string;sequence:number;tokens:number|null;tests:{passed:number;total:number;failed:number|null}|null;writer:'idle'|'preparing'|'recorded';lastAt:string|null};
export const labBoundary={x:300,y:55,width:157,height:133};
export function safeOfficeFile(value:unknown):string|null{
 if(typeof value!=='string'||value.length>180||!value||/^[\/~]|^[A-Za-z]:|\.\.|[:?=$\\\n\r]/.test(value)||/(^|\/)(\.env|auth|credential|cookie|token|secret|\.ssh|\.aws|\.config|keychain)/i.test(value))return null;
 const name=value.split('/').at(-1)!;return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,60}$/.test(name)?name:null;
}
export function officeActivity(id:string,events:readonly TicketEvent[]):OfficeActivity{
 const rows=orderedOfficeEvents(id,events),f=officeFrame(id,rows),a:OfficeActivity={action:'idle',bubble:'',sequence:0,tokens:null,tests:null,writer:'idle',lastAt:rows.at(-1)?.createdAt??null};let tool:string|null=null;const usage=new Map<string,number>();
 for(const e of rows){const d=e.data,kind=d.kind,p=d.data&&typeof d.data==='object'?d.data as Record<string,unknown>:{};
  if(e.kind==='state_changed'){a.action=d.to==='checking'?'inspect':'idle';a.bubble=d.to==='checking'?'Inspecting the change':'';tool=null;}
  if(e.kind==='agent_stopped'){a.action='idle';a.bubble='';tool=null;}
  if(e.kind==='agent_event'&&kind==='usage_observed'&&typeof p.reportedTotal==='number'&&Number.isSafeInteger(p.reportedTotal)&&p.reportedTotal>=0){usage.set(typeof d.attemptId==='string'?d.attemptId:'reported-session',p.reportedTotal);a.tokens=[...usage.values()].reduce((total,value)=>total+value,0);}
  if(e.kind==='agent_event'&&kind==='tool.started'){
   tool=typeof p.itemId==='string'?p.itemId:null;a.sequence=e.sequence;
   if(p.type==='fileChange'){a.action='type';a.bubble='Making the change';}
   else if(p.type==='commandExecution'){
    const cmd=typeof p.command==='string'?p.command.slice(0,2000):'',read=/^(?:cat|head|tail|sed|rg|ls)\s/.test(cmd)||/;\s*(?:cat|rg|sed)\s/.test(cmd);
    const declared=Array.isArray(p.actions)?p.actions.find(x=>x&&typeof x==='object'&&(x as Record<string,unknown>).type==='read') as Record<string,unknown>|undefined:undefined;
    const token=declared?.path??cmd.match(/(?:cat|head|tail|rg|sed)\s+(?:-[A-Za-z0-9]+\s+)*(\S+\.(?:md|py|ts|tsx|js|json))(?=\s|$)/)?.[1],name=safeOfficeFile(token);
    a.action=read?'read':'command';a.bubble=read?(name?'Reading '+name:'Reading a file'):'Running a command';
   }else{a.action='idle';a.bubble='';}
  }
  if(e.kind==='agent_event'&&kind==='tool.completed'&&(tool===null||p.itemId===tool)){a.action='idle';a.bubble='';tool=null;}
  if(e.kind==='agent_event'&&kind==='test_writer_launch_pending'){a.writer='preparing';}
  if(e.kind==='agent_event'&&kind==='check_progress'){
   a.sequence=e.sequence;a.action='inspect';const phase=p.phase;a.bubble=phase==='tests'?'Running protected tests':phase==='passwords'?'Checking for leaked passwords':phase==='proof'?'Writing the proof':'Inspecting the change';
   const pass=p.passed,total=p.total,failed=p.failed;
   if(Number.isSafeInteger(pass)&&Number.isSafeInteger(total)&&(pass as number)>=0&&(total as number)>0&&(total as number)<=1000000&&(pass as number)<=(total as number)){a.tests={passed:pass as number,total:total as number,failed:Number.isSafeInteger(failed)&&(failed as number)>=0?failed as number:null};a.bubble=pass+' of '+total+' old tests passed';}
  }
  if(e.kind==='check_result'){a.action='idle';a.bubble='';a.writer=f.writerRecorded?'recorded':'idle';}
 }
 if(f.alarm){a.action='frozen';a.bubble='Read alarm. Stopped.';}else if(f.dimmed){a.action='stopped';a.bubble='Stop all';}else if(['ready_for_review','needs_you','kept','discarded','interrupted','cancelled','harness_error'].includes(f.phase)){a.action='idle';a.bubble='';}
 return a;
}
export function workshopRoute(action:OfficeAction):{x:number;y:number}[]{const start={x:110,y:168};return action==='read'?[start,{x:59,y:168},{x:59,y:112}]:action==='command'?[start,{x:176,y:168},{x:176,y:129}]:action==='inspect'?[start,{x:245,y:168},{x:279,y:158}]:action==='type'?[start,{x:110,y:148}]:[start];}
