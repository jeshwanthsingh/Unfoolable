import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {realpathSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,chmodSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createBuildWorkspace,captureBuildCandidate,sourceIndexHash} from '../apps/server/build-workspace.ts';
import {createMissionOutcomeStore} from '../apps/server/mission-outcomes.ts';
import {migrateOutcomes} from '../apps/server/outcome-migration.ts';
import type {BuildAttempt,BuildInput,BuildView} from '../packages/shared/build.ts';
import {VERIFICATION_VERSION,type VerificationView} from '../packages/shared/verification.ts';
const gitCmd=(root:string,...args:string[])=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const hash='a'.repeat(64),git='b'.repeat(40),time='2026-10-06T00:00:00.000Z';
function verdict():VerificationView {
 const recipe:NonNullable<VerificationView['recipe']>={id:'R1',missionId:'M1',contractRevisionId:'C1',planRevisionId:'P1',evaluationRevisionId:'E1',evaluationHash:hash,version:VERIFICATION_VERSION,steps:[{id:'step:E1',claimIds:['E1'],kind:'MANUAL' as const,timeoutMs:10000,description:'Observe behavior directly.',provenance:'PROTECTED' as const}],claims:[{id:'E1',claim:'Denial prevents effects.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'manual' as const,requiredEvidence:['Observed effect count.'],preconditions:[],manualRationale:'A local operator must directly observe the effect.',notes:''}],canonical:'{"protected":true}',hash,evaluatorHash:hash,createdAt:time};
 const result={claimId:'E1',status:'PASS' as const,stepId:'step:E1',durationMs:1,note:'Observed zero effects.',operator:'local-operator',decidedAt:time};
 const evidence={id:'artifact',runId:'V1',claimId:'E1',kind:'MANUAL',path:'/tmp/verification/evidence/artifact.json',sha256:hash,bytes:25,createdAt:time,excerpt:'{"status":"PASS"}',truncated:false};
 const run={id:'V1',missionId:'M1',candidateId:'candidate',attemptId:'attempt',generation:1,treeHash:git,diffHash:hash,baseHead:git,recipeId:'R1',recipeHash:hash,evaluationHash:hash,evaluatorHash:hash,status:'PASSED' as const,workspace:'/tmp/disposable',createdAt:time,endedAt:time,environment:{platform:'darwin',nodeVersion:'v24.21.0'},processes:[],cleanup:{verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null},results:[result],evidence:[evidence],error:null};
 return {recipe,runs:[run],current:true,eligible:true,reason:null};
}

async function setup(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'cc-land-'))),source=join(root,'source'),data=join(root,'data');mkdirSync(source);gitCmd(source,'init','-q');gitCmd(source,'config','user.name','Fixture');gitCmd(source,'config','user.email','fixture@localhost');writeFileSync(join(source,'file.txt'),'base\n');gitCmd(source,'add','.');gitCmd(source,'commit','-qm','base');const base=gitCmd(source,'rev-parse','HEAD'),index=await sourceIndexHash(source),common=gitCmd(source,'rev-parse','--path-format=absolute','--git-common-dir');const w=await createBuildWorkspace({sourceRoot:source,baseHead:base,gitCommonDir:common,sourceIndexHash:index,input:{} as BuildInput,admissionMs:0},'attempt',data);writeFileSync(join(w.workspacePath,'file.txt'),'candidate\n');const {candidate}=await captureBuildCandidate({id:'attempt',workspacePath:w.workspacePath,sourceRoot:source,baseHead:base} as BuildAttempt,data);
 const v=verdict();Object.assign(v.runs[0]!,{treeHash:candidate.treeHash,diffHash:candidate.diffHash,baseHead:base,candidateId:candidate.id,environment:{packHash:createHash('sha256').update(readFileSync(join(w.artifactDir,'candidate.pack'))).digest('hex'),evidenceValidated:true,currentnessValidated:true}});
 const b={current:true,workerPresent:false,candidate,attempt:{id:'attempt',sourceRoot:source,baseHead:base,generation:1,status:'CANDIDATE',cleanup:v.runs[0]!.cleanup}} as BuildView;
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE projects(id TEXT PRIMARY KEY,repo_root TEXT); CREATE TABLE missions(id TEXT PRIMARY KEY,project_id TEXT);');db.prepare('INSERT INTO projects VALUES(?,?)').run('P1',source);db.exec("INSERT INTO missions VALUES('M1','P1')");migrateOutcomes(db);const readers={build:()=>b,verification:()=>v},config={dataDir:data,projectRoots:[root]},store=createMissionOutcomeStore(db,config,()=>{},readers);
 const snapshot=async()=>({head:gitCmd(source,'rev-parse','HEAD'),index:await sourceIndexHash(source),status:gitCmd(source,'status','--porcelain=v1'),files:readFileSync(join(source,'file.txt'),'utf8'),worktrees:gitCmd(source,'worktree','list','--porcelain'),remotes:gitCmd(source,'remote','-v')});
 return {root,source,data,base,candidate,b,v,db,store,config,readers,snapshot,finish(){db.close();const unseal=(dir:string)=>{chmodSync(dir,0o700);for(const e of readdirSync(dir,{withFileTypes:true}))if(e.isDirectory())unseal(join(dir,e.name));};unseal(root);rmSync(root,{recursive:true,force:true});}};
}
import {createMissionWorkflow} from '../apps/server/mission-workflow.ts';
import {migrateWorkflow} from '../apps/server/workflow-migration.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {evaluatorBundle} from '../apps/server/verification-executor.ts';
function attachWorkflow(f:Awaited<ReturnType<typeof setup>>,approved=true){
 migrateWorkflow(f.db);
 const payload={plan:{verticalSlices:[{id:'S1'}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:f.v.recipe!.claims}};
 const specId='spec-'+createHash('sha256').update(canonicalContractJson({missionId:'M1',contractHash:hash,content:payload,evaluatorHash:evaluatorBundle().hash})).digest('hex');
 f.db.prepare('INSERT INTO mission_workflows VALUES(?,?,?,?,?)').run('M1','CHECKS_PASSED',specId,null,time);
 if(approved)f.db.prepare('INSERT INTO mission_decisions(mission_id,kind,spec_id,run_id,created_at) VALUES(?,?,?,?,?)').run('M1','APPROVE_SPEC',specId,null,time);
 let starts=0,verifications=0;
 const services={outcomes:f.store,contract:{view:()=>({accepted:{contractHash:hash,payload:{goal:{text:'Change behavior.'},nonGoals:[]}},acceptedStale:false})},planning:{view:()=>({draft:{payload},draftStale:false,accepted:{plan:{payload}}})},verification:{view:()=>f.v,start:async()=>{verifications++;throw Error('Unexpected verifier start');}},build:{view:()=>f.b,start:async()=>{starts++;throw Error('Unexpected worker start');}}};
 const workflow=createMissionWorkflow(f.db,services as unknown as Parameters<typeof createMissionWorkflow>[1],()=>{});
 return {workflow,specId,get starts(){return starts;},get verifications(){return verifications;}};
}
test('recovery interrupts QUEUED and tick cannot launch an unknown-stage worker',async()=>{
 const f=await setup(),w=attachWorkflow(f);try{f.db.exec("UPDATE mission_workflows SET status='QUEUED'");w.workflow.recover();await w.workflow.tick();assert.equal(w.starts,0);assert.equal(w.workflow.view('M1').phase,'NEEDS_YOU');assert.match(w.workflow.view('M1').reason!,/restarted/);}finally{await w.workflow.close();f.finish();}
});
test('terminal request insertion failure prevents every Git/outcome side effect',async()=>{
 for(const kind of ['LAND','ABANDON']){const f=await setup(),w=attachWorkflow(f);try{const before=await f.snapshot();f.db.exec("CREATE TRIGGER reject_request BEFORE INSERT ON mission_decisions WHEN NEW.kind!='APPROVE_SPEC' BEGIN SELECT RAISE(ABORT,'request insert fault'); END");await assert.rejects(kind==='LAND'?w.workflow.land('M1','V1'):w.workflow.abandon('M1'),/request insert fault/);assert.equal(f.store.view('M1'),null);assert.equal(f.db.prepare('SELECT count(*) n FROM mission_land_intents').get()!.n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM mission_decisions').get()!.n,1);assert.deepEqual(await f.snapshot(),before);assert.throws(()=>gitCmd(f.source,'show-ref','--verify','refs/heads/cc/M1'));}finally{await w.workflow.close();f.finish();}}
});
test('retry adopts only the journaled exact ref after crash even when current verifier is stale',async()=>{
 for(const mode of ['exact','conflict','missing']){const f=await setup(),w=attachWorkflow(f);try{
  f.db.exec("CREATE TRIGGER outcome_fault BEFORE INSERT ON mission_outcomes BEGIN SELECT RAISE(ABORT,'outcome crash'); END");await assert.rejects(w.workflow.land('M1','V1'),/outcome crash/);const commit=gitCmd(f.source,'rev-parse','refs/heads/cc/M1');f.db.exec('DROP TRIGGER outcome_fault');
  assert.deepEqual(w.workflow.view('M1').decisionEvents.map(d=>d.kind),['APPROVE_SPEC','LAND']);assert.equal(f.store.view('M1'),null);f.v.current=false;f.v.reason='Historical verifier changed.';
  if(mode==='conflict')gitCmd(f.source,'update-ref','refs/heads/cc/M1',f.base,commit);if(mode==='missing')gitCmd(f.source,'update-ref','-d','refs/heads/cc/M1',commit);
  const before=await f.snapshot();assert.equal(w.workflow.view('M1').phase,'NEEDS_YOU');assert.match(w.workflow.view('M1').reason!,/Land request/);assert.throws(()=>w.workflow.prepare('M1'),{code:'MISSION_ENDED'});await assert.rejects(w.workflow.abandon('M1'),{code:'LAND_RECONCILE_REQUIRED'});
  if(mode==='exact'){await w.workflow.retry('M1');assert.equal(w.workflow.view('M1').phase,'LANDED');assert.equal(f.store.view('M1')!.commit,commit);assert.deepEqual(w.workflow.view('M1').decisionEvents.map(d=>d.kind),['APPROVE_SPEC','LAND']);}
  else await assert.rejects(w.workflow.retry('M1'),{code:mode==='conflict'?'LAND_BRANCH_CONFLICT':'LAND_NOT_CURRENT'});
  assert.equal(w.starts,0);assert.deepEqual(await f.snapshot(),before);
 }finally{await w.workflow.close();f.finish();}}
});
test('pending journal alone cannot fabricate missing human Land authorization',async()=>{
 const f=await setup(),w=attachWorkflow(f);try{
  f.db.exec("CREATE TRIGGER outcome_fault BEFORE INSERT ON mission_outcomes BEGIN SELECT RAISE(ABORT,'outcome crash'); END");await assert.rejects(f.store.land('M1','V1'),/outcome crash/);f.db.exec('DROP TRIGGER outcome_fault');f.v.current=false;
  await assert.rejects(w.workflow.retry('M1'),{code:'LAND_RECONCILE_REQUIRED'});assert.equal(f.store.view('M1'),null);assert.deepEqual(w.workflow.view('M1').decisionEvents.map(d=>d.kind),['APPROVE_SPEC']);
 }finally{await w.workflow.close();f.finish();}
});
test('terminal retries reconcile historical second event only with stored prior Spec approval',async()=>{
 for(const approved of [true,false]){const f=await setup(),w=attachWorkflow(f,approved);try{
  const outcome=await f.store.land('M1','V1');f.v.current=false;const before=await f.snapshot();
  if(approved){const result=await w.workflow.land('M1','V1');assert.deepEqual(result.decisionEvents.map(d=>d.kind),['APPROVE_SPEC','LAND']);assert.equal(result.decisionEvents[1]!.createdAt,outcome.createdAt);await w.workflow.land('M1','V1');assert.equal(w.workflow.view('M1').decisionEvents.length,2);}
  else await assert.rejects(w.workflow.land('M1','V1'),{code:'SPEC_NOT_APPROVED'});
  assert.deepEqual(await f.snapshot(),before);
 }finally{await w.workflow.close();f.finish();}}
});

test('prejournal Land failure retries only original V1 without a new verifier, worker or decision',async()=>{
 const f=await setup(),w=attachWorkflow(f);try{
  f.db.exec("CREATE TRIGGER prejournal_fault BEFORE INSERT ON mission_land_intents BEGIN SELECT RAISE(ABORT,'prejournal fault'); END");await assert.rejects(w.workflow.land('M1','V1'),/prejournal fault/);f.db.exec('DROP TRIGGER prejournal_fault');
  assert.equal(f.db.prepare('SELECT count(*) n FROM mission_land_intents').get()!.n,0);assert.equal(w.workflow.view('M1').phase,'NEEDS_YOU');assert.deepEqual(w.workflow.view('M1').decisionEvents.map(d=>d.kind),['APPROVE_SPEC','LAND']);
  assert.throws(()=>w.workflow.prepare('M1'),{code:'MISSION_ENDED'});assert.throws(()=>w.workflow.approve('M1',w.specId),{code:'MISSION_ENDED'});await assert.rejects(w.workflow.land('M1','V2'),{code:'TERMINAL_DECISION_CONFLICT'});
  await w.workflow.retry('M1');assert.equal(w.workflow.view('M1').phase,'LANDED');assert.equal(f.store.view('M1')!.runId,'V1');assert.equal(f.v.runs.length,1);assert.equal(w.starts,0);assert.equal(w.verifications,0);assert.equal(w.workflow.view('M1').decisionEvents.length,2);
 }finally{await w.workflow.close();f.finish();}
});
test('Abandon outcome failure replays its recorded request through idle admission only',async()=>{
 const f=await setup(),w=attachWorkflow(f);try{
  f.db.exec("CREATE TRIGGER abandon_fault BEFORE INSERT ON mission_outcomes BEGIN SELECT RAISE(ABORT,'abandon fault'); END");await assert.rejects(w.workflow.abandon('M1'),/abandon fault/);f.db.exec('DROP TRIGGER abandon_fault');const before=await f.snapshot();
  assert.equal(f.db.prepare('SELECT count(*) n FROM mission_land_intents').get()!.n,0);assert.equal(w.workflow.view('M1').phase,'NEEDS_YOU');assert.deepEqual(w.workflow.view('M1').decisionEvents.map(d=>d.kind),['APPROVE_SPEC','ABANDON']);assert.throws(()=>w.workflow.prepare('M1'),{code:'MISSION_ENDED'});assert.throws(()=>w.workflow.approve('M1',w.specId),{code:'MISSION_ENDED'});
  f.b.attempt!.status='RUNNING';await assert.rejects(w.workflow.retry('M1'),{code:'OUTCOME_BUSY'});assert.equal(f.store.view('M1'),null);f.b.attempt!.status='CANDIDATE';await w.workflow.retry('M1');assert.equal(w.workflow.view('M1').phase,'ABANDONED');assert.equal(w.starts,0);assert.equal(w.verifications,0);assert.equal(w.workflow.view('M1').decisionEvents.length,2);assert.deepEqual(await f.snapshot(),before);
 }finally{await w.workflow.close();f.finish();}
});
test('unjournaled terminal replay refuses wrong run, wrong Spec, missing approval and stale V1',async()=>{
 for(const mode of ['wrong-run','wrong-spec','missing-approval','stale']){const f=await setup(),w=attachWorkflow(f,mode!=='missing-approval');try{
  f.db.prepare('INSERT INTO mission_decisions(mission_id,kind,spec_id,run_id,created_at) VALUES(?,?,?,?,?)').run('M1','LAND',w.specId,mode==='wrong-run'?'V2':'V1',time);
  if(mode==='wrong-spec')f.db.exec("UPDATE mission_workflows SET spec_id='another-spec'");if(mode==='stale'){f.v.current=false;f.v.reason='V1 became stale.';}
  const before=await f.snapshot();await assert.rejects(w.workflow.retry('M1'),{code:['wrong-spec','missing-approval'].includes(mode)?'TERMINAL_RECONCILE_REQUIRED':'LAND_NOT_CURRENT'});
  assert.equal(f.store.view('M1'),null);assert.equal(f.db.prepare('SELECT count(*) n FROM mission_land_intents').get()!.n,0);assert.equal(w.workflow.view('M1').phase,'NEEDS_YOU');assert.equal(w.starts,0);assert.equal(w.verifications,0);assert.deepEqual(await f.snapshot(),before);
 }finally{await w.workflow.close();f.finish();}}
});
