import {needsYouTickets} from './task-groups.ts';
/** Read-only words from stored task/draft states. Never authorizes an action. */
export function deskGreeting(tickets:readonly {status:string}[],_drafts:readonly {status:string;existingTicketId?:string}[]=[],now=new Date()){
 const hour=now.getHours(),greeting=hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
 const working=tickets.filter(t=>['building','checking','fixing'].includes(t.status)).length;
 const needs=needsYouTickets(tickets).length;
 const queued=tickets.filter(t=>t.status==='queued').length;
 const summary=needs?`${needs} ${needs===1?'thing needs':'things need'} you.${working?` ${working} ${working===1?'is':'are'} working.`:''}`:working?`Working on ${working} ${working===1?'thing':'things'}.`:queued?`Nothing needs you. ${queued} ${queued===1?'is':'are'} waiting to start.`:'All quiet.';
 return {greeting,summary};
}
