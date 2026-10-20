import {sealCheckEvent} from './verdict-seal.ts';
import {plainTitle} from '../../packages/shared/display-title.ts';
import {randomUUID} from 'node:crypto';
import {isAbsolute} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import {ticketEventKinds,ticketCheckVerdicts,type TicketCheckVerdict,type TicketStatus,type Ticket,type TicketEvent,type TicketEventKind} from '../../packages/shared/tickets.ts';
const sha=(v:unknown):v is string=>typeof v==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(v);
function text(v:unknown,max:number){return typeof v==='string'&&v.trim().length>0&&v.length<=max&&!v.includes('\0');}
function requireTicket(db:DatabaseSync,id:string){const t=getTicket(db,id);if(!t)throw new Error('Ticket not found');return t;}
function transaction<T>(db:DatabaseSync,fn:()=>T):T{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
function ticket(row:Record<string,unknown>):Ticket{return {id:String(row.id),title:String(row.title),requestText:String(row.request_text),repoPath:String(row.repo_path),baseCommit:String(row.base_commit),status:row.status as Ticket['status'],attemptCount:Number(row.attempt_count),candidateCommits:JSON.parse(String(row.candidate_commits)),checkVerdict:row.check_verdict===null?null:row.check_verdict as TicketCheckVerdict,createdAt:String(row.created_at),updatedAt:String(row.updated_at)};}
export function getTicket(db:DatabaseSync,id:string):Ticket|null{const row=db.prepare('SELECT * FROM tickets WHERE id=?').get(id);return row?ticket(row):null;}
export function listTickets(db:DatabaseSync):Ticket[]{return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC,id').all().map(ticket);}
export function listTicketEvents(db:DatabaseSync,id:string):TicketEvent[]{requireTicket(db,id);return db.prepare('SELECT * FROM ticket_events WHERE ticket_id=? ORDER BY sequence').all(id).map(row=>({sequence:Number(row.sequence),ticketId:String(row.ticket_id),kind:row.kind as TicketEventKind,data:JSON.parse(String(row.data_json)),createdAt:String(row.created_at)}));}
export function appendTicketEvent(db:DatabaseSync,id:string,kind:TicketEventKind,data:Record<string,unknown>):TicketEvent{
 requireTicket(db,id);if(!ticketEventKinds.includes(kind))throw new Error('Invalid ticket event kind');
 if(data===null||typeof data!=='object'||Array.isArray(data))throw new Error('Event data must be an object');
 const json=JSON.stringify(data);if(Buffer.byteLength(json)>65536)throw new Error('Event data exceeds limit');const parsed=JSON.parse(json) as Record<string,unknown>;const createdAt=new Date().toISOString();
 db.exec('SAVEPOINT sign1_append');try{
 const r=db.prepare('INSERT INTO ticket_events(ticket_id,kind,data_json,created_at) VALUES(?,?,?,?)').run(id,kind,json,createdAt);const sequence=Number(r.lastInsertRowid);const sealHash=kind==='check_result'?sealCheckEvent(db,id,sequence,parsed,createdAt):null;if(sealHash)appendTicketEvent(db,id,'agent_event',{kind:'verdict_sealed',eventSequence:sequence,attestationHash:sealHash});db.exec('RELEASE sign1_append');return {sequence,ticketId:id,kind,data:parsed,createdAt};
 }catch(error){db.exec('ROLLBACK TO sign1_append;RELEASE sign1_append');throw error;}

}
export function createTicket(db:DatabaseSync,input:{title:string;requestText:string;repoPath:string;baseCommit:string},onCreated?:(ticket:Ticket)=>void):Ticket{
 if(!text(input.title,200)||!text(input.requestText,65536)||!text(input.repoPath,4096)||!isAbsolute(input.repoPath)||!sha(input.baseCommit))throw new Error('Invalid ticket input');
 return transaction(db,()=>{const id=randomUUID(),now=new Date().toISOString();db.prepare("INSERT INTO tickets(id,title,request_text,repo_path,base_commit,status,created_at,updated_at) VALUES(?,?,?,?,?,'queued',?,?)").run(id,input.title,input.requestText,input.repoPath,input.baseCommit,now,now);appendTicketEvent(db,id,'submitted',{plainTitle:plainTitle(input.title),titleAuthor:'user'});const created=requireTicket(db,id);onCreated?.(created);return created;});
}
export function updateTicket(db:DatabaseSync,id:string,patch:{attemptCount?:number;candidateCommits?:string[];checkVerdict?:TicketCheckVerdict|null}):Ticket{
 const t=requireTicket(db,id);if(['ready_for_review','kept','discarded','cancelled'].includes(t.status))throw new Error('Ticket candidate is frozen or terminal');if(Object.keys(patch).some(k=>!['attemptCount','candidateCommits','checkVerdict'].includes(k)))throw new Error('Invalid ticket update field');
 if(patch.attemptCount!==undefined&&(!Number.isSafeInteger(patch.attemptCount)||patch.attemptCount<t.attemptCount))throw new Error('Invalid attempt count');
 if(patch.candidateCommits!==undefined&&(!Array.isArray(patch.candidateCommits)||patch.candidateCommits.length>1000||!patch.candidateCommits.every(sha)||new Set(patch.candidateCommits).size!==patch.candidateCommits.length))throw new Error('Invalid candidate commits');
 if(patch.checkVerdict!==undefined&&patch.checkVerdict!==null&&!ticketCheckVerdicts.includes(patch.checkVerdict))throw new Error('Invalid check verdict');
 db.prepare('UPDATE tickets SET attempt_count=?,candidate_commits=?,check_verdict=?,updated_at=? WHERE id=?').run(patch.attemptCount??t.attemptCount,JSON.stringify(patch.candidateCommits??t.candidateCommits),patch.checkVerdict===undefined?t.checkVerdict:patch.checkVerdict,new Date().toISOString(),id);return requireTicket(db,id);
}

export const ticketTransitions:Readonly<Record<TicketStatus,readonly TicketStatus[]>>={
 queued:['building','needs_you','cancelled','harness_error','discarded'],
 building:['checking','needs_you','interrupted','cancelled','harness_error'],
 checking:['fixing','ready_for_review','needs_you','interrupted','cancelled','harness_error'],
 fixing:['checking','needs_you','interrupted','cancelled','harness_error'],
 ready_for_review:['kept','discarded'],needs_you:['queued','cancelled','discarded'],
 interrupted:['queued','cancelled','discarded'],harness_error:['queued','cancelled','discarded'],
 kept:[],discarded:[],cancelled:[]
};
function rejection(db:DatabaseSync,t:Ticket,next:TicketStatus,reason:string){appendTicketEvent(db,t.id,'transition_rejected',{from:t.status,to:next,reason});return Object.assign(new Error('Ticket transition rejected: '+reason),{code:'TICKET_TRANSITION_REJECTED'});}
function changeState(db:DatabaseSync,t:Ticket,next:TicketStatus,data:Record<string,unknown>):Ticket{
 appendTicketEvent(db,t.id,'state_changed',{...data,from:t.status,to:next,...(next==='building'||next==='fixing'?{attemptKind:next==='fixing'?'fix':'build'}:{})});
 const increment=next==='building'||next==='fixing'?1:0;
 db.prepare('UPDATE tickets SET status=?,attempt_count=attempt_count+?,updated_at=? WHERE id=?').run(next,increment,new Date().toISOString(),t.id);return requireTicket(db,t.id);
}
export function transitionTicket(db:DatabaseSync,id:string,next:TicketStatus,data:Record<string,unknown>={}):Ticket{
 // Commit rejections before throwing so the caller cannot accidentally erase the audit event.
 const result=transaction(db,()=>{const t=requireTicket(db,id);
  if(!ticketTransitions[t.status].includes(next))return rejection(db,t,next,'invalid edge');
  if(next==='kept'||next==='discarded')return rejection(db,t,next,'explicit human decision required');
  if(next==='fixing'&&Number(db.prepare("SELECT count(*) AS n FROM ticket_events WHERE ticket_id=? AND kind='state_changed' AND json_extract(data_json,'$.to')='fixing'").get(id)!.n)>=2)return rejection(db,t,next,'two fix attempts exhausted');
  return changeState(db,t,next,data);
 });if(result instanceof Error)throw result;return result;
}
/** Call only after external Keep materialization succeeds; persistence does not mutate Git. */
export function decideTicket(db:DatabaseSync,id:string,decision:'keep'|'discard',expectedCandidate?:string):Ticket{
 const result=transaction(db,()=>{const t=requireTicket(db,id),next=decision==='keep'?'kept':'discarded';
  if(decision!=='keep'&&decision!=='discard')return rejection(db,t,next,'invalid decision');
  if(!ticketTransitions[t.status].includes(next))return rejection(db,t,next,'decision unavailable in current state');
  if(decision==='keep'&&(t.status!=='ready_for_review'||!expectedCandidate||expectedCandidate!==t.candidateCommits.at(-1)))return rejection(db,t,next,'current frozen candidate must be confirmed');
  appendTicketEvent(db,id,'decision',{decision,candidate:expectedCandidate??t.candidateCommits.at(-1)??null,checkVerdict:t.checkVerdict});
  return changeState(db,t,next,{decision});
 });if(result instanceof Error)throw result;return result;
}
/** Explicit check-only edge. Generic transitions cannot unfreeze a review or select another Candidate. */
export function beginTicketRecheck(db:DatabaseSync,id:string,expectedCandidate:string):Ticket{
 return transaction(db,()=>{const t=requireTicket(db,id);if(!['ready_for_review','interrupted','harness_error','needs_you'].includes(t.status)||!expectedCandidate||t.candidateCommits.at(-1)!==expectedCandidate)throw new Error('Recheck requires the same stopped frozen Candidate');
  changeState(db,t,'checking',{mode:'recheck',candidate:expectedCandidate});db.prepare("UPDATE tickets SET check_verdict='NOT CHECKED' WHERE id=?").run(id);appendTicketEvent(db,id,'retry_requested',{mode:'recheck',candidate:expectedCandidate});return requireTicket(db,id);
 });
}
