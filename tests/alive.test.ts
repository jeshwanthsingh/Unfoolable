import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectActivity,liveLine} from '../packages/shared/ticket-activity.ts';
import type {TicketEvent} from '../packages/shared/tickets.ts';
const e=(sequence:number,kind:TicketEvent['kind'],data:Record<string,unknown>,seconds=sequence):TicketEvent=>({sequence,ticketId:'a',kind,data,createdAt:new Date(seconds*1000).toISOString()});
test('live activity uses structured read/edit events, never command prose or invented totals',()=>{
 const read=e(1,'agent_event',{kind:'tool.started',data:{type:'commandExecution',actions:[{type:'read',path:'src/cli.py'}],command:'echo password=private'}});
 const a=projectActivity([read],'building');assert.equal(a.line,'Reading cli.py');assert.equal(a.tests,null);assert.doesNotMatch(JSON.stringify(a),/private|echo/);
 const edit=e(2,'agent_event',{kind:'tool.completed',data:{type:'fileChange',changes:[{path:'src/cli.py',kind:'update'}]}});
 assert.equal(projectActivity([read,edit],'building').line,'Making the change');assert.deepEqual(projectActivity([edit],'building').files,[{path:'src/cli.py',sequence:2}]);
});
test('three-stage track only changes for stored stage events and resets for a fix',()=>{
 const events=[e(1,'state_changed',{to:'building'}),e(2,'candidate_frozen',{}),e(3,'verification_started',{}),e(4,'check_result',{verdict:'PASSED WITH GAPS'}),e(5,'state_changed',{to:'ready_for_review'})];
 assert.deepEqual(projectActivity(events.slice(0,1),'building').stages,['running','waiting','waiting']);
 assert.deepEqual(projectActivity(events.slice(0,3),'checking').stages,['done','running','waiting']);
 assert.deepEqual(projectActivity(events,'ready_for_review').stages,['done','done','done']);
 assert.deepEqual(projectActivity([...events,e(6,'state_changed',{to:'fixing'})],'fixing').stages,['running','waiting','waiting']);
 assert.notEqual(projectActivity([e(1,'check_result',{verdict:'FAILED'})],'needs_you').stages[1],'done');
});
test('quiet work gets one stationary line after twenty seconds, stopped work never looks busy',()=>{
 const a=projectActivity([e(1,'state_changed',{to:'building'},1)],'building');assert.equal(liveLine(a,'building',20999),'Making the change');assert.equal(liveLine(a,'building',21000),'Still working...');assert.notEqual(liveLine(a,'interrupted',21000),'Still working...');
});
test('paths are bounded relative metadata, activity excludes secrets and is bounded',()=>{
 const events=Array.from({length:200},(_,i)=>e(i+1,'agent_event',{kind:'tool.completed',data:{type:'fileChange',changes:[{path:'file'+i+'.py'},{path:'/Users/private/secret.txt'},{path:'../escape'},{path:'password=secret'}]}}));
 const a=projectActivity(events,'building');assert.ok(a.steps.length<=40);assert.ok(a.files.length<=40);assert.doesNotMatch(JSON.stringify(a),/Users|secret|escape/);
});
