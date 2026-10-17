import {projectTicketEvents,type WorkshopTicket} from '../../../../packages/shared/workshop.ts';
import {ticketEventKinds,type Ticket,type TicketEvent} from '../../../../packages/shared/tickets.ts';
import {isReviewRisk,type ReviewRisk} from '../../../../packages/shared/review-risk.ts';
export type CraftDetail={ticket:Ticket;events:TicketEvent[];risk?:ReviewRisk;keepAvailable?:boolean;evidenceStale?:boolean};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object';
export function readCraftDetail(v:unknown):CraftDetail{
 if(!record(v)||!record(v.ticket)||typeof v.ticket.id!=='string'||typeof v.ticket.requestText!=='string'||typeof v.ticket.title!=='string'||!Array.isArray(v.events))throw Error('Ticket history is unavailable.');
 if(!v.events.every(e=>record(e)&&Number.isSafeInteger(e.sequence)&&typeof e.ticketId==='string'&&ticketEventKinds.includes(e.kind as TicketEvent['kind'])&&record(e.data)&&typeof e.createdAt==='string'))throw Error('Ticket history is incomplete.');
 if(v.risk!==undefined&&!isReviewRisk(v.risk))throw Error('Review risk is unavailable.');
 return v as CraftDetail;
}
export function replayStops(d:CraftDetail){return [...new Map(d.events.filter(e=>e.ticketId===d.ticket.id&&['submitted','state_changed','check_result','decision'].includes(e.kind)).map(e=>[e.sequence,e])).values()].sort((a,b)=>a.sequence-b.sequence);}
export function craftFrame(d:CraftDetail,index:number){
 const stops=replayStops(d),stop=stops[Math.max(0,Math.min(index,stops.length-1))];
 const events=d.events.filter(e=>e.ticketId===d.ticket.id&&e.sequence<=(stop?.sequence??0));
 const state=projectTicketEvents(d.ticket.id,events);
 const commands=events.filter(e=>e.kind==='agent_event'&&e.data.kind==='command_observed').length;
 const start=events.findLast(e=>e.kind==='agent_started'),end=start?events.findLast(e=>e.kind==='agent_stopped'&&e.sequence>start.sequence):undefined;
 const duration=start&&stop?Math.max(0,Date.parse((end??stop).createdAt)-Date.parse(start.createdAt)):null;
 const lastCheck=events.findLast(e=>e.kind==='check_result');
 const failures=Array.isArray(lastCheck?.data.failures)?lastCheck.data.failures.filter((x):x is string=>typeof x==='string'):[];
 const issue=events.findLast(e=>e.kind==='needs_you');
 const reason=state.status==='harness_error'?'The recorded check run stopped because of a harness error.':state.status==='needs_you'?(typeof issue?.data.reason==='string'?issue.data.reason:'This recorded attempt needed a human decision.'):null;
 return {state,events,stop,commands,duration,failures,reason};
}
export function humanStatus(s:WorkshopTicket['status']){return s==='ready_for_review'?'Ready for your review':s==='needs_you'?'Needs you':s==='harness_error'?'Harness stopped':s.replaceAll('_',' ');}
export function formatDuration(ms:number|null){if(ms===null)return 'Time not recorded';const seconds=Math.floor(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
