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
 const a=projectActivity([e(1,'state_changed',{to:'building'},1)],'building');assert.equal(liveLine(a,'building',20999),'Starting the work');assert.equal(liveLine(a,'building',21000),'Still working...');assert.notEqual(liveLine(a,'interrupted',21000),'Still working...');
});
test('paths are bounded relative metadata, activity excludes secrets and is bounded',()=>{
 const events=Array.from({length:200},(_,i)=>e(i+1,'agent_event',{kind:'tool.completed',data:{type:'fileChange',changes:[{path:'file'+i+'.py'},{path:'/Users/private/secret.txt'},{path:'../escape'},{path:'password=secret'}]}}));
 const a=projectActivity(events,'building');assert.ok(a.steps.length<=40);assert.ok(a.files.length<=40);assert.doesNotMatch(JSON.stringify(a),/Users|secret|escape/);
});

import {motionReason} from '../apps/web/src/event-motion.ts';
test('no motion can start without a new recent event; mount, replay, search and idle stay still',()=>{
 const old={id:'one',status:'building',revision:1,updatedAt:new Date(1000).toISOString()};
 assert.equal(motionReason(undefined,old,false,1000),null);
 assert.equal(motionReason(old,{...old},true,1000),null);
 assert.equal(motionReason(old,{...old,status:'kept',revision:1},true,1000),null);
 assert.equal(motionReason(old,{...old,status:'kept',revision:2},true,100000),null);
 assert.equal(motionReason(old,{...old,status:'kept',revision:2},true,1000),'accepted');
 assert.equal(motionReason(old,{...old,status:'discarded',revision:2},true,1000),'rejected');
 assert.equal(motionReason(old,{...old,status:'needs_you',revision:2},true,1000),'attention');
 assert.equal(motionReason(undefined,{...old,id:'new'},true,1000),'arrival');
});

import {readFileSync} from 'node:fs';
test('watch view is a native read-only modal and restores focus and scroll',()=>{
 const s=readFileSync('apps/web/src/WatchWork.tsx','utf8');assert.match(s,/showModal\(/);assert.match(s,/scrollTo/);assert.match(s,/preventScroll:true/);assert.match(s,/onCancel/);assert.doesNotMatch(s,/confirmedDecision|localRequest|setInterval|requestAnimationFrame/);
});

test('native progress counts cannot invent totals or count invalid values',()=>{
 const progress=(data:Record<string,unknown>)=>e(2,'agent_event',{kind:'check_progress',data});
 assert.deepEqual(projectActivity([progress({phase:'tests',passed:2,total:3})],'checking').tests,{passed:2,total:3});
 for(const values of [{passed:4,total:3},{passed:0,total:0},{passed:1.5,total:3}])assert.equal(projectActivity([progress({phase:'tests',...values})],'checking').tests,null);
});
test('all new motion drivers require increasing event identities and stop when hidden',()=>{
 for(const file of ['useEventMotion.ts','useEventHighlights.ts','ObservedCount.tsx']){const s=readFileSync('apps/web/src/'+file,'utf8');assert.match(s,/document.hidden/);assert.match(s,/prefers-reduced-motion: reduce/);assert.match(s,/visibilitychange/);assert.doesNotMatch(s,/setInterval|requestAnimationFrame|transition: all/);assert.match(s,/duration:\.2[24]|duration:\.18/);assert.match(s,/bounce:0/);}
});

test('provider absolute read paths use the safe structured name; frozen paths are real changes',()=>{
 const read=e(1,'agent_event',{kind:'tool.started',data:{type:'commandExecution',actions:[{type:'read',path:'/private/owned/cli.py',name:'cli.py'}]}});
 assert.equal(projectActivity([read],'building').line,'Reading cli.py');
 assert.deepEqual(projectActivity([e(2,'candidate_frozen',{candidate:{paths:['src/cli.py']}})],'checking').files,[{path:'src/cli.py',sequence:2}]);
});

test('a long real stream retains its recorded stage without exporting raw command strings',async()=>{
 const {DatabaseSync}=await import('node:sqlite');const {deskSnapshot}=await import('../apps/server/desk-stream.ts');const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE tickets(id,title,status,check_verdict,created_at,updated_at);CREATE TABLE ticket_events(sequence INTEGER PRIMARY KEY,ticket_id,kind,data_json,created_at);INSERT INTO tickets VALUES('a','Task','building',null,'now','now')`);
 const put=db.prepare('INSERT INTO ticket_events VALUES(?,?,?,?,?)');put.run(1,'a','state_changed',JSON.stringify({to:'building'}),'now');for(let n=2;n<250;n++)put.run(n,'a','agent_event',JSON.stringify({kind:'tool.started',data:{type:'commandExecution',command:'private raw command',actions:[]}}),'now');
 try{const t=deskSnapshot(db,{messages:[],drafts:[],cards:[]}).tickets[0]!;assert.equal(t.activity?.stages[0],'running');assert.doesNotMatch(JSON.stringify(t),/private raw command/);assert.ok(t.activity!.steps.length<=40);}finally{db.close();}
});

import {observedOldTestCount} from '../apps/server/playbook-checks.ts';
test('old-test progress excludes new tests and unadmitted BASE tests',()=>{
 const baseline=[{tests:[{id:'old',status:'PASS' as const},{id:'skipped',status:'SKIPPED' as const}]},{tests:[{id:'second',status:'PASS' as const}]}];
 const results=[{tests:[{id:'old',status:'PASS' as const},{id:'new',status:'PASS' as const},{id:'skipped',status:'PASS' as const}]}];
 assert.deepEqual(observedOldTestCount(results,baseline),{passed:1,total:2});assert.deepEqual(observedOldTestCount([...results,{tests:[{id:'second',status:'FAIL'}]}],baseline),{passed:1,total:2});
});
test('production serves the exact installed font but no arbitrary font path or escaping symlink',async()=>{
 const {serveWeb}=await import('../apps/server/static.ts');const {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'ui5-font-')),root=join(dir,'web');mkdirSync(join(root,'fonts'),{recursive:true});const file=join(root,'fonts/InstrumentSans.ttf');writeFileSync(file,'synthetic font bytes');let headers:Record<string,string>={};const response={writeHead(_code:number,h:Record<string,string>){headers=h;},end(){}};
 try{assert.equal(serveWeb('/fonts/InstrumentSans.ttf',root,response as any),true);assert.equal(headers['Content-Type'],'font/ttf');for(const path of ['/fonts/other.ttf','/fonts/../../private','/fonts/OFL.txt'])assert.equal(serveWeb(path,root,response as any),false);rmSync(file);const outside=join(dir,'outside');writeFileSync(outside,'private');symlinkSync(outside,file);assert.equal(serveWeb('/fonts/InstrumentSans.ttf',root,response as any),false);}finally{rmSync(dir,{recursive:true,force:true});}
});
