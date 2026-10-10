import type {DatabaseSync} from 'node:sqlite';
import {getTicket,listTicketEvents,listTickets} from './ticket-store.ts';
import type {Ticket} from '../../packages/shared/tickets.ts';
import {SpecError} from './spec-errors.ts';
export function referencedTicket(db:DatabaseSync,text:string):Ticket|null{
 const id=/\b([a-f0-9]{8}(?:-[a-f0-9-]{27})?)\b/i.exec(text)?.[1];
 if(!id)return null;const matches=listTickets(db).filter(t=>t.id.startsWith(id.toLowerCase()));
 if(matches.length!==1)throw new SpecError('TICKET_NOT_FOUND','That ticket identifier is missing or ambiguous.',404);return matches[0]!;
}
export function ticketHarnessFailure(db:DatabaseSync,t:Ticket):string|null{
 if(t.status!=='harness_error')return null;
 const event=listTicketEvents(db,t.id).filter(e=>['cleanup','agent_stopped','check_result'].includes(e.kind)&&typeof e.data.reason==='string').at(-1);
 const reason=String(event?.data.reason??'The ticket stopped before its checks could finish.');
 if(/Kernel process ownership could not be recorded|process identity|ownership.*record/i.test(reason))return 'Codex stopped because Command Center could not confirm its process identity.';
 if(/timed? out|deadline/i.test(reason))return 'The ticket stopped because its runtime deadline expired.';
 if(/sandbox|permission denied|EPERM/i.test(reason))return 'The ticket stopped because the sandbox blocked a required operation.';
 return 'The ticket stopped: '+reason.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').slice(0,400).replace(/[.!?]+$/,'')+'.';
}
export function ticketSummary(db:DatabaseSync,t:Ticket):string{
 const frozen=listTicketEvents(db,t.id).filter(e=>e.kind==='candidate_frozen').at(-1)?.data.candidate as {paths?:string[]}|undefined;
 const paths=frozen?.paths??[];return paths.length?'Recorded changes in '+paths.length+' file'+(paths.length===1?'':'s')+': '+paths.slice(0,3).map(path=>path.length>180?path.slice(0,177)+'…':path).join(', ')+(paths.length>3?'…':'')+'.':'No frozen file changes recorded.';
}
export function ticketStatusText(db:DatabaseSync,t:Ticket):string{
 const events=listTicketEvents(db,t.id),last=events.filter(e=>e.kind==='needs_you'||e.kind==='check_result').at(-1),failure=ticketHarnessFailure(db,t);
 return t.id.slice(0,8)+' · '+t.title+' — '+t.status+'; checks: '+(t.checkVerdict??'NOT CHECKED')+'.'+(failure?' '+failure:t.status==='needs_you'&&last?.kind==='needs_you'&&typeof last.data.reason==='string'?' '+last.data.reason:'');
}
export function statusAnswer(db:DatabaseSync,text:string):string|null{
 if(/^(?:what(?:'s| is) running|running|status)\??$/i.test(text.trim())){const active=listTickets(db).filter(t=>['building','checking','fixing'].includes(t.status));return active.length?active.map(t=>ticketStatusText(db,t)).join('\n'):'Nothing is running. '+listTickets(db).filter(t=>t.status==='queued').length+' queued ticket(s).';}
 if(/^(?:what(?:'s| is|) (?:needs? me|needs? my attention)|what needs me|needs you)\??$/i.test(text.trim())){const needs=listTickets(db).filter(t=>['needs_you','harness_error','interrupted','ready_for_review'].includes(t.status));return needs.length?needs.map(t=>ticketStatusText(db,t)).join('\n'):'Nothing needs your attention.';}
 if(/^(?:how did ticket|show ticket|ticket|what happened to ticket)\b/i.test(text.trim())){const t=referencedTicket(db,text);return t?ticketStatusText(db,getTicket(db,t.id)!):'Include the ticket ID or its unique eight-character prefix.';}
 return null;
}
export function typedAction(text:string):boolean{return /^(?:(?:keep|discard|recheck|retry|allow|deny)(?:\s+(?:it|that|ticket\s+[a-f0-9-]+|[a-f0-9-]+))?|approve(?:\s+(?:the\s+)?playbook)?)\s*[.!?]?$/i.test(text.trim());}
