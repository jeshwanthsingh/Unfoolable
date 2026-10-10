import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
import {createChatStore} from '../apps/server/chat-store.ts';
import {projectChatEvents} from '../apps/server/chat-events.ts';
import {createTicket,transitionTicket,appendTicketEvent,updateTicket} from '../apps/server/ticket-store.ts';
test('delayed event projection preserves the verdict at review time, not a later verdict, and is restart-idempotent',()=>{
 mkdirSync(resolve('.work/foreman-v1'),{recursive:true});const root=mkdtempSync(resolve('.work/foreman-v1/events-'));let database=openDatabase(join(root,'data'),()=>{});
 try{let db=database.connection,chat=createChatStore(db);const t=createTicket(db,{title:'Actual ticket',requestText:'Request',repoPath:'/repo',baseCommit:'a'.repeat(40)});
 transitionTicket(db,t.id,'building');transitionTicket(db,t.id,'checking');appendTicketEvent(db,t.id,'check_result',{verdict:'PASSED WITH GAPS'});updateTicket(db,t.id,{candidateCommits:['b'.repeat(40)],checkVerdict:'PASSED WITH GAPS'});transitionTicket(db,t.id,'ready_for_review');
 // Historical event projection cannot borrow a later check result.
 appendTicketEvent(db,t.id,'check_result',{verdict:'FAILED'});projectChatEvents(db,chat);const messages=chat.messages();assert.equal(messages.length,3);assert.match(messages.at(-1)!.text,/Checks: PASSED WITH GAPS/);assert.doesNotMatch(messages.at(-1)!.text,/FAILED/);
 const keys=messages.map(m=>m.ticketEventSequence);assert.equal(new Set(keys).size,3);database.close();database=openDatabase(join(root,'data'),()=>{});db=database.connection;chat=createChatStore(db);projectChatEvents(db,chat);assert.deepEqual(chat.messages(),messages);
 }finally{database.close();rmSync(root,{recursive:true,force:true});}
});

test('draft Start and ticket relation commit together and survive actual SQLite reopen without replay',()=>{
 mkdirSync(resolve('.work/foreman-v1'),{recursive:true});const root=mkdtempSync(resolve('.work/foreman-v1/start-reopen-'));let database=openDatabase(join(root,'data'),()=>{});
 try{let db=database.connection,chat=createChatStore(db);const m=chat.appendMessage({role:'user',text:'Do the work.'}),d=chat.createDraft(m.sequence,{title:'Work',repoPath:'/repo',requestText:'Do the work.',doneMeans:'It works.'}),reserved=chat.updateDraft(d.id,d.version,{status:'STARTING'})!;
 const ticket=createTicket(db,{title:d.title,requestText:d.requestText,repoPath:d.repoPath,baseCommit:'a'.repeat(40)},t=>{assert.ok(chat.updateDraft(d.id,reserved.version,{status:'STARTED',ticketId:t.id}));});
 database.close();database=openDatabase(join(root,'data'),()=>{});db=database.connection;chat=createChatStore(db);chat.recover();assert.equal(chat.draft(d.id)!.status,'STARTED');assert.equal(chat.draft(d.id)!.ticketId,ticket.id);assert.equal(db.prepare('SELECT count(*) n FROM tickets').get()!.n,1);assert.equal(chat.updateDraft(d.id,chat.draft(d.id)!.version,{status:'DRAFT'}),null);
 const other=chat.createDraft(chat.appendMessage({role:'user',text:'Rollback work.'}).sequence,{status:'STARTING'});assert.throws(()=>createTicket(db,{title:'Rollback',requestText:'Rollback',repoPath:'/repo',baseCommit:'a'.repeat(40)},t=>{chat.updateDraft(other.id,other.version,{status:'STARTED',ticketId:t.id});throw Error('transaction failed');}),/transaction failed/);assert.equal(chat.draft(other.id)!.status,'STARTING');assert.equal(db.prepare('SELECT count(*) n FROM tickets').get()!.n,1);
 }finally{database.close();rmSync(root,{recursive:true,force:true});}
});
