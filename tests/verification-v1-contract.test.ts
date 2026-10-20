import test from 'node:test';
import assert from 'node:assert/strict';
import {isV1Report,scoreV1,type V1Layer,type V1Report} from '../packages/shared/verification-v1.ts';
import {isVerifyView} from '../packages/shared/verify-only.ts';

function layers():V1Layer[]{return [1,2,3].map(layer=>({layer:layer as 1|2|3,status:'PASS',checks:[{id:'check-'+layer,status:'PASS',reason:null}],gaps:[]}));}
function report():V1Report{return {version:'verification-v1',...scoreV1(layers()),layers:layers(),gaps:[],recipeIds:['unit'],recipeHash:'a'.repeat(64),admittedTaskChecksHash:'b'.repeat(64),candidateTests:null,landed:null};}
function view(){return {id:'fixture',state:'RESULT',input:{repoPath:'/fixture',baseRef:'base',candidateRef:'candidate',intent:'Fix',repoRoot:'/fixture',runnerDirectory:'.',baseCommit:'a'.repeat(40),candidateCommit:'b'.repeat(40),baseTree:'c'.repeat(40),candidateTree:'d'.repeat(40)},review:{hash:'e'.repeat(64),evaluatorHash:'f'.repeat(64),claims:[],manifest:null},result:{status:'PASS',automatedStatus:'PASS',acceptance:'VERIFIED',claims:[],evidence:{hash:'e'.repeat(64)},v1:report()},error:null,approvedAt:null,protocolVersion:2,abandonedAt:null,waiver:null};}

test('v1 gates integrity and recipes while disclosing omitted task checks',()=>{
 assert.deepEqual(scoreV1(layers()),{verdict:'VERIFIED',canLand:true});
 const skipped=layers();skipped[2]={layer:3,status:'NOT CHECKED',checks:[],gaps:[{id:'task-checks',layer:3,reason:'Not requested'}]};
 assert.deepEqual(scoreV1(skipped),{verdict:'PASSED WITH GAPS',canLand:true});
 const missingRecipe=layers();missingRecipe[1]={layer:2,status:'ERROR',checks:[],gaps:[{id:'recipe',layer:2,reason:'No project recipe configured'}]};
 assert.deepEqual(scoreV1(missingRecipe),{verdict:'ERROR',canLand:false});
 for(const layer of [0,1]){const empty=layers();empty[layer]!.checks=[];assert.deepEqual(scoreV1(empty),{verdict:'FAILED',canLand:false});}
 for(const layer of [0,1]){const failed=layers();failed[layer]!.status='NOT CHECKED';assert.deepEqual(scoreV1(failed),{verdict:'FAILED',canLand:false});}
});

test('v1 admitted task failures and errors block landing even if aggregate status says PASS',()=>{
 for(const layer of [0,1,2])for(const status of ['FAIL','ERROR'] as const){const failed=layers();failed[layer]!.checks[0]!.status=status;assert.deepEqual(scoreV1(failed),{verdict:status==='ERROR'?'ERROR':'FAILED',canLand:false});}
 assert.deepEqual(scoreV1(layers().slice(0,2)),{verdict:'ERROR',canLand:false});
});

test('v1 report rejects unknown nested fields, malformed proof and forged landing eligibility',()=>{
 assert.equal(isV1Report(report()),true);
 for(const mutate of [
  (r:any)=>r.fake=true,
  (r:any)=>r.layers[0].checks[0].fake=true,
  (r:any)=>r.layers[0].gaps.push({id:'gap',layer:2,reason:'Wrong layer'}),
  (r:any)=>r.recipeHash='not-a-hash',
  (r:any)=>r.candidateTests={authoritative:true,status:'PASS',paths:['candidate.test.ts']},
  (r:any)=>r.candidateTests={authoritative:false,status:'PASS',paths:[],fake:true},
  (r:any)=>r.landed={branch:'verified',commit:'invalid',createdAt:'today'},
 ]){const r=report();mutate(r);assert.equal(isV1Report(r),false);}
});

test('v1 view maps verdict to public result while preserving historical result shape',()=>{
 assert.equal(isVerifyView(view()),true);
 const gap=view();gap.result.v1.layers[2]={layer:3,status:'NOT CHECKED',checks:[],gaps:[]};gap.result.v1.verdict='PASSED WITH GAPS';gap.result.acceptance='PASSED WITH GAPS';assert.equal(isVerifyView(gap),true);
 gap.result.acceptance='VERIFIED';assert.equal(isVerifyView(gap),false);
 const historical:any=view();delete historical.result.v1;assert.equal(isVerifyView(historical),true);
 historical.result.acceptance='PASSED WITH GAPS';assert.equal(isVerifyView(historical),false);
 for(const mutate of [(v:any)=>v.review=null,(v:any)=>v.result.evidence=null,(v:any)=>v.result.v1.recipeIds=[]]){const v=view();mutate(v);assert.equal(isVerifyView(v),false);}
});

test('v1 scopes regression recipes by measured BASE outcome and keeps nonapplicable results informational',()=>{
 const scoped=layers();scoped[1]!.checks=[{id:'new-behavior',status:'NOT CHECKED',reason:'Not applicable to this BASE; newly satisfied.',baseStatus:'FAIL',candidateStatus:'PASS'}];
 assert.deepEqual(scoreV1(scoped),{verdict:'VERIFIED',canLand:true});
 scoped[1]!.checks[0]!.candidateStatus='FAIL';assert.deepEqual(scoreV1(scoped),{verdict:'VERIFIED',canLand:true});
 scoped[1]!.checks[0]!.baseStatus='PASS';assert.deepEqual(scoreV1(scoped),{verdict:'FAILED',canLand:false});
 scoped[1]!.checks[0]!.status='FAIL';assert.deepEqual(scoreV1(scoped),{verdict:'FAILED',canLand:false});
 scoped[1]!.checks[0]!.status='ERROR';scoped[1]!.checks[0]!.baseStatus='ERROR';assert.deepEqual(scoreV1(scoped),{verdict:'ERROR',canLand:false});
 const valid=report();valid.layers[1]!.checks=[{id:'new-behavior',status:'NOT CHECKED',reason:'Not applicable to this BASE',baseStatus:'FAIL',candidateStatus:'PASS'}];Object.assign(valid,scoreV1(valid.layers));assert.equal(isV1Report(valid),true);
 for(const mutate of [(v:any)=>v.layers[1].checks[0].baseStatus='NOT CHECKED',(v:any)=>delete v.layers[1].checks[0].candidateStatus,(v:any)=>v.layers[0].checks[0].baseStatus='FAIL']){const r=structuredClone(valid);mutate(r);assert.equal(isV1Report(r),false);}
});

test('shape checking does not score; explicit public boundary rejects every forged result',()=>{
 for(const mutate of [(r:any)=>r.layers[2].checks[0].status='FAIL',(r:any)=>r.layers[2].status='NOT CHECKED',(r:any)=>r.layers[0].checks=[],(r:any)=>r.layers[1].checks=[]]){
  const v=view();mutate(v.result.v1);assert.equal(isV1Report(v.result.v1),true);assert.equal(isVerifyView(v),false);
 }
});
