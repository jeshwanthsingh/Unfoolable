import type {DatabaseSync} from 'node:sqlite';
import type {createChatStore} from './chat-store.ts';
import {getTicket} from './ticket-store.ts';
const states:Record<string,string>={building:'Builder started.',checking:'Protected checks started.',fixing:'A fresh correction session started.',needs_you:'Needs you.',ready_for_review:'Ready for your review.',harness_error:'Harness error; this is not a code-check failure.',interrupted:'Interrupted; no success has been inferred.',cancelled:'Cancelled.',discarded:'Discarded.',kept:'Kept on its local cc branch.'};
export function projectChatEvents(db:DatabaseSync,store:ReturnType<typeof createChatStore>){
 for(const e of store.eventsAfterCursor()){
  const data=JSON.parse(String(e.data_json)) as Record<string,unknown>,t=getTicket(db,String(e.ticket_id));
  if(t&&e.kind==='state_changed'&&typeof data.to==='string'&&states[data.to]){
   const prior=db.prepare("SELECT data_json FROM ticket_events WHERE ticket_id=? AND sequence<? AND kind='check_result' ORDER BY sequence DESC LIMIT 1").get(t.id,e.sequence!);const checked=prior?JSON.parse(String(prior.data_json)).verdict:null;
   const verdict=data.to==='ready_for_review'?' Checks: '+(checked??'NOT CHECKED')+'.':'';
   store.appendMessage({role:'jarvis',kind:'update',text:t.id.slice(0,8)+' · '+t.title+': '+states[data.to]+verdict,ticketEventSequence:Number(e.sequence)});
  }
  if(t&&e.kind==='needs_you'&&data.kind==='TRIPWIRE')store.appendMessage({role:'jarvis',kind:'update',text:t.id.slice(0,8)+' · TRIPWIRE: read attempt on '+String(data.path)+' at '+String(data.at)+'. Ticket stopped; no Candidate was accepted.',ticketEventSequence:Number(e.sequence)});
  if(t&&e.kind==='needs_you'&&data.kind==='WATCHMAN')store.appendMessage({role:'jarvis',kind:'update',text:t.id.slice(0,8)+' · Watchman paused this ticket: '+String(data.reason)+' '+(Array.isArray(data.actions)?data.actions.slice(0,11).map((a:any)=>String(a.category)+': '+String(a.command)).join('; '):''),ticketEventSequence:Number(e.sequence)});
  if(t&&e.kind==='needs_you'&&['ACTION_BUDGET','STOP_ALL'].includes(String(data.kind)))store.appendMessage({role:'jarvis',kind:'update',text:t.id.slice(0,8)+' · '+String(data.reason),ticketEventSequence:Number(e.sequence)});
  store.advanceProjection(Number(e.sequence));
 }
}
