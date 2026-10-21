import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import type {NightView} from '../../../packages/shared/night.ts';
export type Moment={kind:'started'|'ready'|'sealed'|'tripwire';event:TicketEvent};
export function alarmFact(e:TicketEvent){
 const trip=(e.kind==='needs_you'&&e.data.kind==='TRIPWIRE')||(e.kind==='agent_event'&&e.data.kind==='tripwire');
 const stop=['needs_you','cancellation_requested'].includes(e.kind)&&e.data.kind==='STOP_ALL';
 return trip||stop?{event:e.sequence,ticketId:e.ticketId,when:e.createdAt,title:trip?'Work was stopped':'Stop all was requested',sentence:trip?'A protected-file read was blocked and work stopped.':'Work was stopped by a Stop all request.'}:null;
}
/** Hydration is history, not a new event. Per-ticket cursors survive duplicate snapshots. */
export class MomentCursor{
 last=0;private hydrated=false;
 read(events:readonly TicketEvent[]):Moment[]{const sorted=events.filter(e=>Number.isSafeInteger(e.sequence)).slice().sort((a,b)=>a.sequence-b.sequence),latest=sorted.at(-1)?.sequence??0;
 if(!this.hydrated){this.hydrated=true;this.last=latest;return [];}const fresh=sorted.filter(e=>e.sequence>this.last);this.last=Math.max(this.last,latest);
 return fresh.flatMap(e=>{let kind:Moment['kind']|null=null;
 if(e.kind==='agent_started')kind='started';
 if(e.kind==='state_changed'&&e.data.to==='ready_for_review')kind='ready';
 if(alarmFact(e))kind='tripwire';
 if(e.kind==='agent_event'&&e.data.kind==='verdict_sealed'){const check=sorted.filter(c=>c.kind==='check_result'&&c.sequence<e.sequence).at(-1);if(check?.data.verdictSnapshot&&e.data.eventSequence===check.sequence&&typeof e.data.attestationHash==='string'&&/^[a-f0-9]{64}$/.test(e.data.attestationHash))kind='sealed';}
 return kind?[{kind,event:e}]:[];});
 }
}
export function nightMuted(view:NightView|undefined,now:number){return !!view?.running||!!view?.entries.some(e=>['queued','running'].includes(e.status)&&Date.parse(e.start)<=now&&Date.parse(e.end)>now);}
export function briefing(view:NightView|undefined,tickets:readonly {id:string;title:string;plainTitle?:string|null}[]){
 const r=view?.report;if(view?.running)return {summary:'Night Shift is still working.',tasks:[],end:null};
 if(!r)return {summary:'No completed Night Shift is recorded.',tasks:[],end:null};
 const count=r.items.length,checked=r.items.filter(i=>i.verdict==='VERIFIED').length,closer=count-checked;
 const summary=count?`Good morning. Night Shift did ${count} ${count===1?'thing':'things'}: ${checked} checked, ${closer} ${closer===1?'needs':'need'} a closer look.`:'Night Shift stopped before starting any tasks.';
 const ids=new Set(r.ticketIds??[]);return {summary,tasks:tickets.filter(t=>ids.has(t.id)).map(t=>({id:t.id,title:t.plainTitle??t.title})),end:r.end};
}
export const soundNotes={started:[440,550],ready:[660,880],sealed:[1400,880],tripwire:[330,220]} as const;
