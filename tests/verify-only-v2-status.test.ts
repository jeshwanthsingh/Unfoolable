import test from 'node:test';import assert from 'node:assert/strict';
import {scoreVerifyV2} from '../packages/shared/verify-only-v2.ts';
test('all exact REQUIRED PASS is the only verified acceptance; advisory errors are disclosed',()=>{
 assert.equal(scoreVerifyV2([{id:'E1',requirement:'REQUIRED',status:'PASS',reason:null},{id:'E2',requirement:'ADVISORY',status:'ERROR',reason:'environment'}]).acceptance,'VERIFIED');
 for(const status of ['FAIL','NOT CHECKED','ERROR','CANCELLED','STALE'] as const)assert.notEqual(scoreVerifyV2([{id:'E1',requirement:'REQUIRED',status,reason:'reason'}]).acceptance,'VERIFIED');
 assert.notEqual(scoreVerifyV2([]).acceptance,'VERIFIED');
 assert.notEqual(scoreVerifyV2([{id:'E1',requirement:'ADVISORY',status:'PASS',reason:null}]).acceptance,'VERIFIED');
});

 test('provisional review is visible only during AUTHORING and cannot masquerade as sealed review',async()=>{const {isVerifyView}=await import('../packages/shared/verify-only.ts');const v={id:'fixture',state:'AUTHORING',input:{repoPath:'/fixture',baseRef:'base',candidateRef:'candidate',intent:'Fix',repoRoot:'/fixture',runnerDirectory:'.',baseCommit:'a'.repeat(40),candidateCommit:'b'.repeat(40),baseTree:'c'.repeat(40),candidateTree:'d'.repeat(40)},review:{hash:'',evaluatorHash:'f'.repeat(64),claims:[],manifest:null},result:null,error:null,approvedAt:null,protocolVersion:2,abandonedAt:null,waiver:null};assert.equal(isVerifyView(v),true);assert.equal(isVerifyView({...v,state:'RESULT'}),true);assert.equal(isVerifyView({...v,state:'REVIEW'}),false);assert.equal(isVerifyView({...v,state:'VERIFYING'}),false);});
