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
