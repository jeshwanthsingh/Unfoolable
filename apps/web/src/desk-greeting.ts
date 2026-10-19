/** Read-only words from stored task/draft states. Never authorizes an action. */
export function deskGreeting(tickets:readonly {status:string}[],drafts:readonly {status:string;existingTicketId?:string}[]=[],now=new Date()){
 const hour=now.getHours(),greeting=hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
 const working=tickets.filter(t=>['building','checking','fixing'].includes(t.status)).length;
 const needs=tickets.filter(t=>['ready_for_review','needs_you','harness_error','interrupted'].includes(t.status)).length+drafts.filter(d=>!d.existingTicketId&&['DRAFT','QUESTION','ERROR'].includes(d.status)).length;
 const queued=tickets.filter(t=>t.status==='queued').length;
 const summary=needs?`${needs} ${needs===1?'thing needs':'things need'} you.${working?` ${working} ${working===1?'is':'are'} working.`:''}`:working?`Working on ${working} ${working===1?'thing':'things'}.`:queued?`Nothing needs you. ${queued} ${queued===1?'is':'are'} waiting to start.`:'All quiet.';
 return {greeting,summary};
}
