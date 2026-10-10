import test from 'node:test';
import assert from 'node:assert/strict';
import {groupChatCards} from '../packages/shared/chat-presentation.ts';
import type {ChatCard} from '../packages/shared/chat.ts';
const card=(id:string,patch:Partial<ChatCard>={}):ChatCard=>({id,kind:'ticket',targetId:'ticket-a',binding:id,summary:'Actual ticket state',verdict:'NOT CHECKED',actions:['discard'],status:'PENDING',resolution:null,createdAt:'2026-10-10T12:00:00Z',resolvedAt:null,...patch});
test('only latest pending card for a ticket is actionable; stale and resolved cards stay in history',()=>{
 const old=card('old'),stale=card('stale',{status:'STALE'}),current=card('current',{actions:['keep','discard']});
 const groups=groupChatCards([old,stale,current]);assert.deepEqual(groups.needsYou,[current]);assert.deepEqual(groups.history,[old,stale]);
});
test('a latest resolved card never resurfaces an older pending card',()=>{
 const old=card('old'),resolved=card('resolved',{status:'RESOLVED',resolution:'discard'});
 assert.deepEqual(groupChatCards([old,resolved]),{needsYou:[],stuck:[],history:[old,resolved]});
});
test('retry cards form a separate stuck group and preserve the real failure summary',()=>{
 const stopped=card('stopped',{actions:['retry','discard'],summary:'Codex exited before startup.'}),other=card('other',{targetId:'ticket-b'});
 const groups=groupChatCards([stopped,other]);assert.deepEqual(groups.stuck,[stopped]);assert.equal(groups.stuck[0]?.summary,'Codex exited before startup.');assert.deepEqual(groups.needsYou,[other]);
});
test('playbook and permission identities are distinct and resolving cards remain visible',()=>{
 const book=card('book',{kind:'playbook',targetId:'/repo',actions:['approve_playbook']}),permission=card('permission',{kind:'permission',targetId:'request',actions:['deny'],status:'RESOLVING'});
 assert.deepEqual(groupChatCards([book,permission]).needsYou,[book,permission]);
});
