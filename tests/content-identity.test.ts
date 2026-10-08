import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
import {createContractStore,type ContractDrafter} from '../apps/server/contract-store.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
import type {ContractPayload} from '../packages/shared/contracts.ts';
const quiet=()=>{};
const payload=():ContractPayload=>({goal:{id:'G1',text:'Preserve retry behavior.',sourceIds:['intent']},requirements:[{id:'R1',text:'Stop retrying after denial.',sourceIds:['answer:question']}],scope:[{id:'S1',text:'Retry behavior.',sourceIds:['intent']}],nonGoals:[{id:'NG1',text:'Mobile integrations.',sourceIds:['intent']}],constraints:[],assumptions:[],risks:[]});
function contractFixture(drafter:ContractDrafter=async()=>({output:payload(),toolVersion:'fake',elapsedMs:2})){
 const root=mkdtempSync(join(tmpdir(),'cc-contract-')),database=openDatabase(join(root,'data'),quiet),db=database.connection;
 db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Project','/fixture','a'.repeat(40),null,'2026-01-01');
 db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','Preserve retry behavior.','DRAFT','2026-01-02');
 db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission','{}','b'.repeat(64),'2026-01-03');
 const packet={version:'analysis-packet-v1',missionId:'mission',snapshotId:'snapshot',originalIntent:'Preserve retry behavior.',project:{baseHead:'a'.repeat(40),branch:'main',dirty:false,structure:[]},evidence:[],limits:PACKET_LIMITS,evidenceTruncated:false,sourcePolicy:'committed-head-only'};
 db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,created_at,completed_at) VALUES('analysis','mission','snapshot',?,'SUCCEEDED',?,?,'v1','fake',?,'2026-01-04','2026-01-05')").run('a'.repeat(40),JSON.stringify(packet),payloadHash(packet),JSON.stringify({understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}));
 db.prepare("INSERT INTO clarification_questions VALUES('question','analysis','What happens after denial?','Determine behavior','behavior','[]','[]',1,0,'2026-01-05')").run();
 db.prepare("INSERT INTO clarification_answers VALUES('question','Stop retrying after denial.','2026-01-06')").run();
 const store=createContractStore(db,quiet,drafter);
 return {root,database,db,store,finish(){store.close();database.close();rmSync(root,{recursive:true,force:true});}};
}
import {createPlanningStore,type PlanningDrafter} from '../apps/server/planning-store.ts';
import type {PlanningPayload} from '../packages/shared/planning.ts';
const planningPayload=():PlanningPayload=>({plan:{verticalSlices:[{id:'S1',title:'Denial stops retrying',outcome:'Denied retry produces no subsequent action.',requirementIds:['R1'],preconditions:[],userVisibleFlow:['Retry request is denied.','No subsequent retry occurs.'],evaluationClaimIds:['E1'],order:1}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:[{id:'E1',claim:'Denied retry produces no subsequent retry.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'integration',requiredEvidence:['Observable retry count remains unchanged after denial.'],preconditions:[],manualRationale:null,notes:''}]}});
async function fixture(drafter:PlanningDrafter=async()=>({output:planningPayload(),toolVersion:'fake',elapsedMs:2})){
 const f=contractFixture();f.store.accept((await f.store.compile('mission')).draft!.id);const planning=createPlanningStore(f.db,quiet,drafter);
 return {...f,planning,finish(){planning.close();f.finish();}};
}
import {createVerificationRecipe,recipeCanonicalMatches} from '../apps/server/verification-recipe.ts';
import {acceptedContentCanonical} from '../apps/server/contract-store.ts';
test('identical revised acceptance reuses immutable Evaluation and Recipe identities while recording acceptance',async()=>{
 const f=await fixture();try{
  const first=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!;
  const before=JSON.stringify(first);
  const revised=f.planning.revise('mission',first.plan.pairId);
  const again=f.planning.accept(revised.draft!.id);
  assert.equal(again.phase,'PLAN_READY');assert.deepEqual(again.accepted,first);assert.equal(JSON.stringify(f.planning.pair('mission',first.plan.pairId)),before);
  const bind=(p:typeof first)=>({missionId:'mission',contractRevisionId:p.plan.contractRevisionId,planRevisionId:p.plan.id,evaluationRevisionId:p.evaluation.id,evaluationHash:p.evaluation.evaluationHash,claims:p.evaluation.payload.claims,input:p.input,sliceClaimIds:['E1'],evaluatorHash:'f'.repeat(64)});
  const recipe=createVerificationRecipe(bind(first)),second=createVerificationRecipe(bind(again.accepted!));
  assert.equal(recipe.id,second.id);assert.equal(recipe.hash,second.hash);assert.ok(recipeCanonicalMatches(recipe));
  const changed=createVerificationRecipe({...bind(first),evaluatorHash:'e'.repeat(64)});assert.notEqual(changed.hash,recipe.hash);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM planning_acceptances').get()!.n,2);
  assert.throws(()=>f.db.exec('UPDATE planning_acceptances SET mission_id=mission_id'),/immutable/);
 }finally{f.finish();}
});
test('A to B to A reuses historical pair and strict accepted selection without modifying history',async()=>{
 const f=await fixture();try{
  const first=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!;
  const rev=f.planning.revise('mission',first.plan.pairId),changed=structuredClone(rev.draft!.payload!);changed.evaluationContract.claims[0]!.notes='Changed executable acceptance content.';
  const second=f.planning.accept(f.planning.edit(rev.draft!.id,{payload:changed}).draft!.id).accepted!;
  assert.notEqual(second.evaluation.id,first.evaluation.id);assert.notEqual(second.evaluation.evaluationHash,first.evaluation.evaluationHash);
  const back=f.planning.revise('mission',second.plan.pairId),restored=f.planning.edit(back.draft!.id,{payload:planningPayload()});
  const result=f.planning.accept(restored.draft!.id);assert.equal(result.phase,'PLAN_READY');assert.deepEqual(result.accepted,first);assert.equal(result.history.length,2);
  assert.deepEqual(f.planning.pair('mission',second.plan.pairId),second);
 }finally{f.finish();}
});
test('unchanged contract reaccept retains contract identity and changed input remains fenced',async()=>{
 const f=contractFixture();try{
  const first=f.store.accept((await f.store.compile('mission')).draft!.id).accepted!;
  const revised=f.store.revise('mission',first.id),again=f.store.accept(revised.draft!.id);
  assert.equal(again.phase,'CONTRACT_READY');assert.deepEqual(again.accepted,first);
  f.db.prepare("UPDATE clarification_answers SET answer_text='Changed decision.' WHERE question_id='question'").run();
  assert.equal(f.store.view('mission').current,false);assert.throws(()=>f.store.accept(revised.draft!.id),{code:'STALE_CONTRACT_DRAFT'});
  assert.equal(first.canonical,acceptedContentCanonical(first.payload));
 }finally{f.finish();}
});
test('Recipe revision UUIDs and creation times do not influence semantics, semantic fields still do',async()=>{
 const f=await fixture();try{
  const p=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!;
  const binding={missionId:'mission',contractRevisionId:p.plan.contractRevisionId,planRevisionId:p.plan.id,evaluationRevisionId:p.evaluation.id,evaluationHash:p.evaluation.evaluationHash,claims:p.evaluation.payload.claims,input:p.input,sliceClaimIds:['E1'],evaluatorHash:'f'.repeat(64)};
  const a=createVerificationRecipe(binding),b=createVerificationRecipe({...binding,contractRevisionId:'other-contract',planRevisionId:'other-plan',evaluationRevisionId:'other-evaluation'});
  assert.equal(a.hash,b.hash);assert.equal(a.id,b.id);assert.equal(a.contractRevisionId,binding.contractRevisionId);assert.notEqual(a.contractRevisionId,b.contractRevisionId);
  const bad={...a,steps:[{...a.steps[0]!,description:'Tampered trusted step'}]};assert.equal(recipeCanonicalMatches(bad),false);
  assert.notEqual(createVerificationRecipe({...binding,sliceClaimIds:[]}).hash,a.hash);
 }finally{f.finish();}
});

import {planningContentIdentity} from '../apps/server/content-identity.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {verificationHash} from '../apps/server/verification-recipe.ts';
test('oracle storage IDs and paths are excluded while BASE, code and request inputs remain semantic',()=>{
 const directory=realpathSync(mkdtempSync(join(tmpdir(),'cc-semantic-oracle-')));
 try {
  const content=(id:string,code='assert result == 1',base='a'.repeat(40))=>{
   const manifest={version:'process-oracle-v1',id,sourceRoot:'/fixture',baseHead:base,evaluationSignature:'b'.repeat(64),runner:'unittest',runnerDirectory:'backend',dependencyRoot:null,componentPath:null,assurance:'INTERFACE',tests:[{claimId:'E1',classification:'CHANGE',testId:'T1',summary:'Exercise observable behavior',code,requests:[{id:'Q1',kind:'CLI',module:'research_router.cli',args:['check']}],assurance:'INTERFACE'}]};
   const dir=join(directory,id);mkdirSync(dir);const path=join(dir,'manifest.json');writeFileSync(path,JSON.stringify(manifest));const payload=planningPayload();payload.evaluationContract.claims[0]!.oracle={path,hash:verificationHash(canonicalContractJson(manifest)),runner:'unittest',claimId:'E1',testId:'T1',classification:'CHANGE',summary:'Exercise observable behavior',admission:'ADMITTED',reason:null,assurance:'INTERFACE'};return payload;
  };
  const a=planningContentIdentity(content('one')),b=planningContentIdentity(content('two'));assert.deepEqual(a,b);
  assert.notEqual(acceptedContentCanonical(a.evaluationContract),acceptedContentCanonical(planningContentIdentity(content('changed-code','assert result == 2')).evaluationContract));
  assert.notEqual(acceptedContentCanonical(a.evaluationContract),acceptedContentCanonical(planningContentIdentity(content('changed-base','assert result == 1','c'.repeat(40))).evaluationContract));
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('contract source edit UUIDs do not change semantic hashes while source bindings remain explicit',()=>{
 const a=payload(),b=structuredClone(a);b.goal.sourceIds=['user-edit:arbitrary-uuid'];
 assert.equal(acceptedContentCanonical(a),acceptedContentCanonical(b));
 b.goal.text='Different accepted behavior.';assert.notEqual(acceptedContentCanonical(a),acceptedContentCanonical(b));
});
