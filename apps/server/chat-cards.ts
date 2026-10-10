import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {createTicketService} from './ticket-service.ts';
import type {createChatStore} from './chat-store.ts';
import type {ChatCard} from '../../packages/shared/chat.ts';
import {ticketSummary,ticketHarnessFailure} from './chat-status.ts';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createChatCards(db:DatabaseSync,tickets:ReturnType<typeof createTicketService>,store:ReturnType<typeof createChatStore>){
 function ticketBinding(id:string){const v=tickets.show(id),actions:ChatCard['actions']=[];
  if(v.keepAvailable)actions.push('keep');if(v.recheckAvailable)actions.push('recheck');if(v.ticket.status==='harness_error')actions.push('retry');if(['queued','ready_for_review','needs_you','interrupted','harness_error'].includes(v.ticket.status))actions.push('discard');
  const failure=ticketHarnessFailure(db,v.ticket);return {binding:digest({ticket:v.ticket,check:v.check??null,stale:v.evidenceStale,keep:v.keepAvailable,recheck:v.recheckAvailable,actions,failure,eventSequence:v.events.at(-1)?.sequence??null}),view:v,actions,failure};}

 function permissionBinding(id:string){const p=db.prepare('SELECT * FROM runtime_permission_requests WHERE id=?').get(id);if(!p||p.status!=='PENDING')return null;const b=db.prepare("SELECT id FROM build_attempts b LEFT JOIN build_runtime_state r ON r.attempt_id=b.id WHERE b.id=? AND b.generation=? AND b.transport_id=? AND b.provider_thread_id=? AND b.provider_turn_id=? AND b.status='RUNNING' AND b.transport_valid=1 AND r.cancel_requested_at IS NULL").get(p.attempt_id!,p.generation!,p.transport_id!,p.thread_id!,p.turn_id!);return b?{binding:digest(p),payloadHash:String(p.payload_hash),summary:('Requested turn-scoped access: '+String(p.path)+'. '+String(p.reason)).slice(0,2000)}:null;}
 function current(card:ChatCard):string|null{try{if(card.kind==='ticket')return ticketBinding(card.targetId).binding;if(card.kind==='permission')return permissionBinding(card.targetId)?.binding??null;const book=tickets.list().tickets.map(t=>tickets.show(t.id).playbook).find(b=>b?.repoRoot===card.targetId);return book&&book.approval?.hash!==book.hash?book.hash:null;}catch{return null;}}
 function sync(){
  for(const c of store.cards().filter(c=>c.status==='PENDING'))if(current(c)!==c.binding)store.finishCard(c.id,'STALE');
  for(const t of tickets.list().tickets){if(store.cards().some(c=>c.kind==='ticket'&&c.targetId===t.id&&c.status==='RESOLVING'))continue;const {binding,view,actions,failure}=ticketBinding(t.id);
   if(actions.length)store.createCard({kind:'ticket',targetId:t.id,binding,summary:failure??(t.title+'. '+ticketSummary(db,t)),verdict:String(view.check?.verdict??t.checkVerdict??'NOT CHECKED'),actions});
   const b=view.playbook;if(t.status==='needs_you'&&b&&b.approval?.hash!==b.hash)store.createCard({kind:'playbook',targetId:b.repoRoot,binding:b.hash,summary:(b.definition.notes.join(' ')+' Commands: '+b.definition.tests.map(c=>JSON.stringify(c.argv)).join('; ')).slice(0,2000),actions:['approve_playbook']});
  }
  for(const p of db.prepare("SELECT id FROM runtime_permission_requests WHERE status='PENDING'").all()){const b=permissionBinding(String(p.id));if(b)store.createCard({kind:'permission',targetId:String(p.id),binding:b.binding,summary:b.summary,verdict:'Permission pending; no access granted',actions:['allow','deny']});}
 }
 return {sync,current,ticketBinding,permissionBinding};
}
