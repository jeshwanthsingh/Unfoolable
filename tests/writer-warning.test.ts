import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {INDEPENDENT_TEST_WARNING,isWriterWarning,writerWarnings} from '../packages/shared/test-writer.ts';
import {scoreV1,testWriterLayer} from '../packages/shared/verification-v1.ts';
test('independent candidate failures are advisory and cannot change the verdict',()=>{
 const evidence:any={version:'test-writer-v1',advisoryOnly:true,coverage:'NONE',checks:[],warnings:[{testName:'test_cancel',summary:'Cancellation preserves the entered reason.',assertion:'Expected reason, received undefined'}]};
 const gates:any=[{layer:1,status:'PASS',checks:[{id:'old',status:'PASS'}],gaps:[]},{layer:2,status:'PASS',checks:[{id:'guard',status:'PASS'}],gaps:[]}];
 assert.equal(scoreV1([...gates,testWriterLayer(evidence)]).verdict,scoreV1([...gates,testWriterLayer({...evidence,warnings:[]})]).verdict);assert.equal(writerWarnings(undefined).length,0);assert.equal(isWriterWarning(evidence.warnings[0]),true);assert.equal(isWriterWarning({summary:'missing failure'}),false);
});
test('red warning is an alert before Keep in both review surfaces, never hidden in disclosure',()=>{
 assert.equal(INDEPENDENT_TEST_WARNING,'Independent test fails on this change - look closely');
 for(const path of ['apps/web/src/TicketPanel.tsx','apps/web/src/ChatPanel.tsx']){const source=readFileSync(path,'utf8');assert.ok(source.includes('<IndependentTestWarnings'));assert.ok(source.indexOf('<IndependentTestWarnings')<source.indexOf('<div className="'+(path.includes('TicketPanel')?'ticket-actions':'chat-actions')+'">',source.indexOf('<IndependentTestWarnings')));}
 const component=readFileSync('apps/web/src/WriterWarning.tsx','utf8');assert.match(component,/role="alert"/);assert.ok(component.indexOf('{warning.summary}')<component.indexOf('<details>'));
});
