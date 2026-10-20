import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {scoreVerdict} from '../packages/shared/verdict-core.ts';
import {originalScoreV1} from './fixtures/core1-original-score.ts';
import type {V1Layer} from '../packages/shared/verification-v1.ts';
const status=fc.constantFrom('PASS' as const,'FAIL' as const,'ERROR' as const,'NOT CHECKED' as const);
const check=fc.record({id:fc.string({minLength:1,maxLength:20}),status,reason:fc.option(fc.string(),{nil:null}),baseStatus:fc.constantFrom('PASS' as const,'FAIL' as const,'ERROR' as const),candidateStatus:fc.constantFrom('PASS' as const,'FAIL' as const,'ERROR' as const)});
const layer=fc.record({layer:fc.constantFrom(1 as const,2 as const,3 as const),status,checks:fc.array(check,{maxLength:5}),gaps:fc.constant([])});
const options={numRuns:10000,seed:31001};
const good=():V1Layer[]=>[1,2,3].map(layer=>({layer:layer as 1|2|3,status:'PASS',checks:[{id:'guard',status:'PASS',reason:null}],gaps:[]}));
test('I1 thousands of generated fact combinations exactly match frozen pre-refactor policy',()=>{
 fc.assert(fc.property(fc.array(layer,{maxLength:5}),layers=>{const scored=scoreVerdict({path:'native',layers});assert.deepEqual({verdict:scored.verdict,canLand:scored.canLand},originalScoreV1(layers));}),options);
});
test('I2 a harness error can never authorize landing',()=>{
 fc.assert(fc.property(fc.string(),fc.boolean(),fc.boolean(),(reason,aborted,queued)=>{const result=scoreVerdict({path:'runtime',code:'UNKNOWN',reason,aborted,queued});assert.equal(result.verdict,'NOT CHECKED');assert.equal(result.canLand,false);}),options);
});
test('I3 adding a protected failure or error never improves eligibility',()=>{
 fc.assert(fc.property(fc.integer({min:0,max:2}),fc.constantFrom('FAIL' as const,'ERROR' as const),fc.string(),(index,status,reason)=>{const layers=good();layers[index]!.checks.push({id:'bad',status,reason});assert.equal(scoreVerdict({path:'native',layers}).canLand,false);}),options);
});
test('I4 admission requires an assertion failure on BASE and two matching Candidate passes',()=>{
 fc.assert(fc.property(fc.constantFrom('PASS','ERROR','SKIPPED','NOT CHECKED'),fc.array(fc.string(),{maxLength:5}),(baseStatus,ids)=>{assert.equal(scoreVerdict({path:'writer-admission',baseStatus,baseIds:ids,candidates:[{status:'PASS',ids},{status:'PASS',ids}]}).admitted,false);}),options);
});
test('I5 Candidate-only tests cannot replace missing passing BASE identities',()=>{
 fc.assert(fc.property(fc.string({minLength:1}),id=>{const result=scoreVerdict({path:'project-tests',base:[{exitCode:0,tests:[{id:'base:'+id,status:'PASS'}]}],candidate:[{exitCode:0,tests:[{id:'candidate:'+id,status:'PASS'}]}]});assert.equal(result.verdict,'FAILED');assert.equal(result.canLand,false);}),options);
});
test('I6 native and playbook paths agree for equivalent regression and unchecked-intent facts',()=>{
 fc.assert(fc.property(fc.boolean(),fc.string({minLength:1}),(failed,reason)=>{
  const layers=good();layers[2]!.status='NOT CHECKED';if(failed)layers[0]!.checks[0]!.status='FAIL';
  const native=scoreVerdict({path:'native',layers});const project=scoreVerdict({path:'playbook',failures:failed?[reason]:[],gaps:['New intent is unchecked.']});
  assert.equal(native.verdict,project.verdict);assert.equal(native.canLand,project.canLand);
 }),options);
});
test('I7 empty protected layers never pass and unchecked work remains visible',()=>{
 const layers=good();layers[0]!.checks=[];assert.equal(scoreVerdict({path:'native',layers}).canLand,false);
 const gap=good();gap[2]!.status='NOT CHECKED';assert.equal(scoreVerdict({path:'native',layers:gap}).verdict,'PASSED WITH GAPS');
});
test('I8 input facts are immutable and trace is deterministic',()=>{
 fc.assert(fc.property(fc.array(layer,{maxLength:5}),layers=>{const before=JSON.stringify(layers);scoreVerdict({path:'native',layers});assert.equal(JSON.stringify(layers),before);}),options);
});
