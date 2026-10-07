import test from 'node:test';
import assert from 'node:assert/strict';
import {isVerificationView,VERIFICATION_VERSION,type VerificationView} from '../packages/shared/verification.ts';
const hash='a'.repeat(64),git='b'.repeat(40),time='2026-10-06T00:00:00.000Z';
function fixture():VerificationView {
 const recipe:NonNullable<VerificationView['recipe']>={id:'R1',missionId:'M1',contractRevisionId:'C1',planRevisionId:'P1',evaluationRevisionId:'E1',evaluationHash:hash,version:VERIFICATION_VERSION,steps:[{id:'step:E1',claimIds:['E1'],kind:'MANUAL' as const,timeoutMs:10000,description:'Observe behavior directly.',provenance:'PROTECTED' as const}],claims:[{id:'E1',claim:'Denial prevents effects.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'manual' as const,requiredEvidence:['Observed effect count.'],preconditions:[],manualRationale:'A local operator must directly observe the effect.',notes:''}],canonical:'{"protected":true}',hash,evaluatorHash:hash,createdAt:time};
 const result={claimId:'E1',status:'PASS' as const,stepId:'step:E1',durationMs:1,note:'Observed zero effects.',operator:'local-operator',decidedAt:time};
 const evidence={id:'artifact',runId:'V1',claimId:'E1',kind:'MANUAL',path:'/tmp/verification/evidence/artifact.json',sha256:hash,bytes:25,createdAt:time,excerpt:'{"status":"PASS"}',truncated:false};
 const run={id:'V1',missionId:'M1',candidateId:'candidate',attemptId:'attempt',generation:1,treeHash:git,diffHash:hash,baseHead:git,recipeId:'R1',recipeHash:hash,evaluationHash:hash,evaluatorHash:hash,status:'PASSED' as const,workspace:'/tmp/disposable',createdAt:time,endedAt:time,environment:{platform:'darwin',nodeVersion:'v24.21.0'},processes:[],cleanup:{verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null},results:[result],evidence:[evidence],error:null};
 return {recipe,runs:[run],current:true,eligible:true,reason:null};
}
const mutate=(action:(view:VerificationView)=>void)=>{const view=fixture();action(view);return view;};
test('complete bound verification view and no-run view validate',()=>{assert.equal(isVerificationView(fixture()),true);assert.equal(isVerificationView({recipe:null,runs:[],current:false,eligible:true,reason:null}),true);assert.equal(isVerificationView(mutate(v=>{v.runs[0]!.treeHash='c'.repeat(64);})),true);});
test('missing or malformed response facts cannot reach acceptance UI',()=>{
 const invalid:unknown[]=[null,[],{}, {...fixture(),extra:true},mutate(v=>{v.runs[0]!.results=[];}),mutate(v=>{v.runs[0]!.results[0]!.status='INCONCLUSIVE';}),mutate(v=>{v.runs[0]!.results.push({...v.runs[0]!.results[0]!});}),mutate(v=>{v.recipe!.claims.push({...v.recipe!.claims[0]!,id:'E2'});v.recipe!.steps[0]!.claimIds.push('E2');}),mutate(v=>{v.runs[0]!.evidence=[];}),mutate(v=>{v.runs[0]!.evidence[0]!.truncated=true;}),mutate(v=>{v.runs[0]!.recipeHash='d'.repeat(64);}),mutate(v=>{v.runs[0]!.evaluatorHash='d'.repeat(64);}),mutate(v=>{v.runs[0]!.results[0]!.stepId='unknown';}),mutate(v=>{v.runs[0]!.endedAt=null;}),mutate(v=>{v.runs[0]!.cleanup!.verified=false;})];
 for(const value of invalid)assert.equal(isVerificationView(value),false);
});
test('run, claim, step, evidence and process fields are bounded and typed',()=>{
 const invalid=[mutate(v=>{v.runs[0]!.treeHash='bad';}),mutate(v=>{v.runs[0]!.generation=0;}),mutate(v=>{v.runs[0]!.createdAt='tomorrow';}),mutate(v=>{v.runs[0]!.results[0]!.durationMs=NaN;}),mutate(v=>{v.runs[0]!.results[0]!.note='x'.repeat(4001);}),mutate(v=>{v.runs[0]!.evidence[0]!.sha256='bad';}),mutate(v=>{v.runs[0]!.evidence[0]!.bytes=65537;}),mutate(v=>{v.runs[0]!.evidence[0]!.runId='other';}),mutate(v=>{v.runs[0]!.evidence[0]!.excerpt='x'.repeat(4097);}),mutate(v=>{v.recipe!.steps[0]!.claimIds=['unknown'];}),mutate(v=>{v.recipe!.steps[0]!.timeoutMs=-1;}),mutate(v=>{v.runs[0]!.environment={unbounded:'x'.repeat(65537)};}),mutate(v=>{v.runs[0]!.processes=[{pid:0,ppid:1,pgid:1,sid:1,birth:'kernel',executable:'python',observedAt:time,exitedAt:null}];})];
 for(const value of invalid)assert.equal(isVerificationView(value),false);
 assert.equal(isVerificationView(mutate(v=>{v.runs[0]!.results[0]!.note='x'.repeat(4000);})),true);
});
test('live manual wait remains valid while finalized or mismatched operator metadata is rejected',()=>{const live=mutate(v=>{const run=v.runs[0]!;run.status='RUNNING';run.endedAt=null;run.results[0]={...run.results[0]!,status:'RUNNING',note:'Waiting for human evidence.',operator:null,decidedAt:null};run.evidence=[];v.eligible=false;v.reason='Verification is already active.';});assert.equal(isVerificationView(live),true);assert.equal(isVerificationView(mutate(v=>{v.runs[0]!.results[0]!.operator=null;})),false);assert.equal(isVerificationView(mutate(v=>{v.current=false;})),true);});

test('denial oracle case accepts explicit denied or allowed and legacy absent case only',()=>{
 for(const oracleCase of ['DENIED','ALLOWED'] as const){const view=fixture();view.recipe!.steps[0]={...view.recipe!.steps[0]!,kind:'DENIAL_ORACLE',oracleCase};assert.equal(isVerificationView(view),true);}
 const legacy=fixture();legacy.recipe!.steps[0]!.kind='DENIAL_ORACLE';assert.equal(isVerificationView(legacy),true);
 for(const kind of ['MANUAL','STATIC_DIFF','UNSUPPORTED'] as const){const view=fixture();view.recipe!.steps[0]={...view.recipe!.steps[0]!,kind,oracleCase:'DENIED'};assert.equal(isVerificationView(view),false);}
 const invalid=fixture();invalid.recipe!.steps[0]!.kind='DENIAL_ORACLE';Object.assign(invalid.recipe!.steps[0]!,{oracleCase:'BOTH'});assert.equal(isVerificationView(invalid),false);
});
