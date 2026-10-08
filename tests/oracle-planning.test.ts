import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
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
async function fixture(admission:'ADMITTED'|'REJECTED'='ADMITTED',malformed=false,prepareHook?:(signal:AbortSignal)=>Promise<void>){
 const f=contractFixture();f.store.accept((await f.store.compile('mission')).draft!.id);const drafter:PlanningDrafter=async()=>({output:planningPayload(),toolVersion:'fake',elapsedMs:2});
 const planning=createPlanningStore(f.db,quiet,drafter,{dataDir:join(f.root,'data'),prepareOracle:async(_db,dataDir,_mission,_input,payload,signal)=>{
  await prepareHook?.(signal);
  const id='test-oracle';mkdirSync(join(dataDir,'oracles',id),{recursive:true});const path=join(realpathSync(join(dataDir,'oracles',id)),'manifest.json');
  const test={claimId:'E1',classification:'CHANGE' as const,testId:'oracle_judge.TestOracle.test_e1',summary:'Denial count native check',code:'import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertEqual(observations[0]["exitCode"], 1)\n',requests:[{id:'one',kind:'CLI' as const,module:'research_router.cli',args:['--help']}],assurance:'INTERFACE' as const};
  const doc:OracleManifest={version:'process-oracle-v1',id,sourceRoot:'/fixture',baseHead:'a'.repeat(40),evaluationSignature:malformed?'f'.repeat(64):evaluationSignature(payload),runner:'unittest',runnerDirectory:'.',dependencyRoot:null,componentPath:null,tests:[test],assurance:'INTERFACE'};
  writeFileSync(path,JSON.stringify(doc));const hash=createHash('sha256').update(canonical(doc)).digest('hex');return {...payload,evaluationContract:{claims:payload.evaluationContract.claims.map(c=>({...c,oracle:{path,hash,runner:'unittest' as const,claimId:c.id,testId:test.testId,classification:test.classification,summary:test.summary,admission,reason:admission==='REJECTED'?'BASE guard failed':null,assurance:'INTERFACE' as const}}))}};
 }});
 return {...f,planning,finish(){planning.close();f.finish();}};
}

import {evaluationSignature} from '../apps/server/oracle-author.ts';
import type {OracleManifest} from '../packages/shared/oracle.ts';
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
test('coordinator authoring runs before review and human acceptance persists protected references',async()=>{
 const f=await fixture();try{const review=await f.planning.compile('mission');assert.equal(review.phase,'PLAN_REVIEW');assert.equal(review.accepted,null);const oracle=review.draft!.payload!.evaluationContract.claims[0]!.oracle!;assert.equal(oracle.admission,'ADMITTED');const accepted=f.planning.accept(review.draft!.id);assert.deepEqual(accepted.accepted!.evaluation.payload.claims[0]!.oracle,oracle);assert.deepEqual(f.planning.revise('mission',accepted.accepted!.plan.pairId).draft!.payload!.evaluationContract.claims[0]!.oracle,oracle);}finally{f.finish();}
});
test('reviewers cannot change, remove, replace references or alter their Evaluation binding',async()=>{
 const f=await fixture();try{const draft=(await f.planning.compile('mission')).draft!;for(const action of ['remove','replace','semantic']){const next=structuredClone(draft.payload!);if(action==='remove')delete next.evaluationContract.claims[0]!.oracle;if(action==='replace')next.evaluationContract.claims[0]!.oracle!.hash='f'.repeat(64);if(action==='semantic')next.evaluationContract.claims[0]!.notes='Observe denial directly.';assert.throws(()=>f.planning.edit(draft.id,{payload:next}),{code:action==='semantic'?'STALE_ORACLE':'IMMUTABLE_ORACLE'});}assert.equal(f.planning.view('mission').draft!.id,draft.id);}finally{f.finish();}
});
test('rejected admission and stale manifest binding never cross existing human acceptance',async()=>{
 for(const [admission,malformed,code] of [['REJECTED',false,'ORACLE_REJECTED'],['ADMITTED',true,'STALE_ORACLE']] as const){const f=await fixture(admission,malformed);try{const draft=(await f.planning.compile('mission')).draft!;assert.throws(()=>f.planning.accept(draft.id),{code});assert.equal(f.planning.view('mission').accepted,null);}finally{f.finish();}}
});
test('manifest byte tampering is independently rejected at acceptance',async()=>{
 const f=await fixture();try{const draft=(await f.planning.compile('mission')).draft!,path=draft.payload!.evaluationContract.claims[0]!.oracle!.path;const doc=JSON.parse(readFileSync(path,'utf8'));doc.tests[0].code+='\n# tampered';writeFileSync(path,JSON.stringify(doc));assert.throws(()=>f.planning.accept(draft.id),{code:'STALE_ORACLE'});}finally{f.finish();}
});
test('model-authored references remain forbidden before trusted enrichment',async()=>{
 const f=contractFixture();try{f.store.accept((await f.store.compile('mission')).draft!.id);let enriched=false;const payload=planningPayload();payload.evaluationContract.claims[0]!.oracle={path:'/tmp/manifest.json',hash:'f'.repeat(64),runner:'unittest',claimId:'E1',testId:'forged',classification:'CHANGE',summary:'Forged native check',admission:'ADMITTED',reason:null};const store=createPlanningStore(f.db,quiet,async()=>({output:payload,toolVersion:'fake',elapsedMs:1}),{dataDir:join(f.root,'data'),prepareOracle:async(_db,_dir,_id,_input,p)=>{enriched=true;return p;}});try{await assert.rejects(store.compile('mission'));assert.equal(enriched,false);assert.equal(store.view('mission').draft,null);}finally{store.close();}}finally{f.finish();}
});

test('closing during native authoring aborts its signal and never publishes review output',async()=>{
 let release!:()=>void,observed!:()=>void,signal!:AbortSignal;const started=new Promise<void>(r=>observed=r),hold=new Promise<void>(r=>release=r);const f=await fixture('ADMITTED',false,async s=>{signal=s;observed();await hold;});try{const pending=f.planning.compile('mission'),rejection=assert.rejects(pending,{code:'PLANNING_INTERRUPTED'});await started;f.planning.close();assert.equal(signal.aborted,true);release();await rejection;assert.equal(f.db.prepare('SELECT status FROM planning_drafts').get()!.status,'INTERRUPTED');assert.equal(f.db.prepare('SELECT count(*) AS n FROM plan_revisions').get()!.n,0);}finally{release();f.finish();}
});
test('input changes during native authoring reject the completed result instead of publishing stale review',async()=>{
 let release!:()=>void,observed!:()=>void;const started=new Promise<void>(r=>observed=r),hold=new Promise<void>(r=>release=r);const f=await fixture('ADMITTED',false,async()=>{observed();await hold;});try{const pending=f.planning.compile('mission'),rejection=assert.rejects(pending,{code:'STALE_PLAN_DRAFT'});await started;f.db.exec("UPDATE clarification_answers SET updated_at='2027-01-01'");release();await rejection;assert.equal(f.planning.view('mission').draft,null);assert.equal(f.planning.view('mission').operation!.status,'FAILED');}finally{release();f.finish();}
});
