import {randomUUID} from 'node:crypto';
import {isAbsolute} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import {ticketEventKinds,ticketCheckVerdicts,type TicketCheckVerdict,type Ticket,type TicketEvent,type TicketEventKind} from '../../packages/shared/tickets.ts';
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
 const r=db.prepare('INSERT INTO ticket_events(ticket_id,kind,data_json,created_at) VALUES(?,?,?,?)').run(id,kind,json,createdAt);return {sequence:Number(r.lastInsertRowid),ticketId:id,kind,data:parsed,createdAt};
}
export function createTicket(db:DatabaseSync,input:{title:string;requestText:string;repoPath:string;baseCommit:string}):Ticket{
 if(!text(input.title,200)||!text(input.requestText,65536)||!text(input.repoPath,4096)||!isAbsolute(input.repoPath)||!sha(input.baseCommit))throw new Error('Invalid ticket input');
 return transaction(db,()=>{const id=randomUUID(),now=new Date().toISOString();db.prepare("INSERT INTO tickets(id,title,request_text,repo_path,base_commit,status,created_at,updated_at) VALUES(?,?,?,?,?,'queued',?,?)").run(id,input.title,input.requestText,input.repoPath,input.baseCommit,now,now);appendTicketEvent(db,id,'submitted',{});return requireTicket(db,id);});
}
export function updateTicket(db:DatabaseSync,id:string,patch:{attemptCount?:number;candidateCommits?:string[];checkVerdict?:TicketCheckVerdict|null}):Ticket{
 const t=requireTicket(db,id);if(Object.keys(patch).some(k=>!['attemptCount','candidateCommits','checkVerdict'].includes(k)))throw new Error('Invalid ticket update field');
 if(patch.attemptCount!==undefined&&(!Number.isSafeInteger(patch.attemptCount)||patch.attemptCount<t.attemptCount))throw new Error('Invalid attempt count');
 if(patch.candidateCommits!==undefined&&(!Array.isArray(patch.candidateCommits)||patch.candidateCommits.length>1000||!patch.candidateCommits.every(sha)||new Set(patch.candidateCommits).size!==patch.candidateCommits.length))throw new Error('Invalid candidate commits');
 if(patch.checkVerdict!==undefined&&patch.checkVerdict!==null&&!ticketCheckVerdicts.includes(patch.checkVerdict))throw new Error('Invalid check verdict');
 db.prepare('UPDATE tickets SET attempt_count=?,candidate_commits=?,check_verdict=?,updated_at=? WHERE id=?').run(patch.attemptCount??t.attemptCount,JSON.stringify(patch.candidateCommits??t.candidateCommits),patch.checkVerdict===undefined?t.checkVerdict:patch.checkVerdict,new Date().toISOString(),id);return requireTicket(db,id);
}
