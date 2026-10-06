import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
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
import {PlanningError} from '../apps/server/planning-errors.ts';
import {createPlanningStore,type PlanningDrafter} from '../apps/server/planning-store.ts';
import type {PlanningPayload} from '../packages/shared/planning.ts';
const planningPayload=():PlanningPayload=>({plan:{verticalSlices:[{id:'S1',title:'Denial stops retrying',outcome:'Denied retry produces no subsequent action.',requirementIds:['R1'],preconditions:[],userVisibleFlow:['Retry request is denied.','No subsequent retry occurs.'],evaluationClaimIds:['E1'],order:1}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:[{id:'E1',claim:'Denied retry produces no subsequent retry.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'integration',requiredEvidence:['Observable retry count remains unchanged after denial.'],preconditions:[],manualRationale:null,notes:''}]}});
async function fixture(drafter:PlanningDrafter=async()=>({output:planningPayload(),toolVersion:'fake',elapsedMs:2})){
 const f=contractFixture();f.store.accept((await f.store.compile('mission')).draft!.id);const planning=createPlanningStore(f.db,quiet,drafter);
 return {...f,planning,finish(){planning.close();f.finish();}};
}
test('AI success creates review only; explicit pair acceptance and restart preserve hashes, canonical, input, and coverage',async()=>{
 const f=await fixture();try{
 assert.equal(f.planning.view('mission').phase,'CONTRACT_READY');const review=await f.planning.compile('mission');assert.equal(review.phase,'PLAN_REVIEW');assert.equal(review.accepted,null);assert.equal(f.planning.attention().length,1);
 const accepted=f.planning.accept(review.draft!.id);assert.equal(accepted.phase,'PLAN_READY');assert.equal(f.planning.attention().length,0);const pair=accepted.accepted!;assert.equal(pair.plan.pairId,pair.evaluation.pairId);assert.equal(pair.plan.planHash,createHash('sha256').update(pair.plan.canonical).digest('hex'));assert.equal(pair.evaluation.evaluationHash,createHash('sha256').update(pair.evaluation.canonical).digest('hex'));assert.deepEqual(f.planning.pair('mission',pair.plan.pairId),pair);assert.deepEqual(f.planning.accept(review.draft!.id),accepted);
 f.planning.close();f.database.close();const db=openDatabase(join(f.root,'data'),quiet);try{const restarted=createPlanningStore(db.connection,quiet,async()=>{throw Error('no resume');});assert.deepEqual(restarted.view('mission'),accepted);restarted.close();}finally{db.close();}
 }finally{f.finish();}
});
test('pair acceptance rolls back both artifacts on failure between inserts',async()=>{
 const f=await fixture();try{const review=await f.planning.compile('mission');f.db.exec("CREATE TRIGGER reject_evaluation BEFORE INSERT ON evaluation_contract_revisions BEGIN SELECT RAISE(ABORT,'forced evaluation failure'); END");assert.throws(()=>f.planning.accept(review.draft!.id),/forced evaluation failure/);for(const table of ['plan_revisions','evaluation_contract_revisions'])assert.equal(f.db.prepare('SELECT count(*) AS n FROM '+table).get()!.n,0);assert.equal(f.planning.view('mission').phase,'PLAN_REVIEW');}finally{f.finish();}
});
test('edits preserve original AI and IDs/order, revalidate coverage, prune truthful field audit and fork immutable revision 2',async()=>{
 const f=await fixture();try{const original=(await f.planning.compile('mission')).draft!,broken=structuredClone(original.payload!);broken.evaluationContract.claims[0]!.requirementIds=[];assert.throws(()=>f.planning.edit(original.id,{payload:broken}));assert.equal(f.planning.view('mission').draft!.id,original.id);
 const renamed=structuredClone(original.payload!);renamed.plan.verticalSlices[0]!.title='Denied retry stops';const edited=f.planning.edit(original.id,{payload:renamed});assert.equal(edited.draft!.origin,'USER_EDIT');assert.deepEqual(edited.draft!.userEdits,[{targetId:'S1',kind:'USER_EDIT',fields:['title']}]);assert.equal(f.db.prepare('SELECT payload_json FROM planning_drafts WHERE id=?').get(original.id)!.payload_json,JSON.stringify(original.payload));assert.throws(()=>f.planning.accept(original.id),{code:'SUPERSEDED_PLAN_DRAFT'});
 const reverted=f.planning.edit(edited.draft!.id,{payload:original.payload!});assert.deepEqual(reverted.draft!.userEdits,[]);const first=f.planning.accept(reverted.draft!.id).accepted!;const revision=f.planning.revise('mission',first.plan.pairId);assert.equal(revision.phase,'PLAN_REVIEW');assert.equal(f.planning.accept(reverted.draft!.id).draft!.id,revision.draft!.id);
 const changed=structuredClone(revision.draft!.payload!);changed.evaluationContract.claims[0]!.notes='Observe externally.';const second=f.planning.accept(f.planning.edit(revision.draft!.id,{payload:changed}).draft!.id).accepted!;assert.equal(second.plan.revision,2);assert.deepEqual(f.planning.pair('mission',first.plan.pairId),first);assert.equal(f.planning.view('mission').history.length,2);
 const invalid=structuredClone(second.plan.payload);invalid.verticalSlices[0]!.id='S9';const fresh=f.planning.revise('mission',second.plan.pairId);assert.throws(()=>f.planning.edit(fresh.draft!.id,{payload:{...fresh.draft!.payload!,plan:invalid}}),{code:'INVALID_PLAN_EDIT'});
 }finally{f.finish();}
});
test('accepted revisions and terminal drafts reject update/delete/replacement and alternate-key upserts',async()=>{
 const f=await fixture();try{const accepted=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!;
 for(const table of ['planning_drafts','plan_revisions','evaluation_contract_revisions']){assert.throws(()=>f.db.exec(`UPDATE ${table} SET mission_id='mission'`),/immutable/i);assert.throws(()=>f.db.exec(`DELETE FROM ${table}`),/immutable/i);assert.throws(()=>f.db.exec(`INSERT OR REPLACE INTO ${table} SELECT * FROM ${table}`),/immutable/i);const row=f.db.prepare('SELECT * FROM '+table).get()!,keys=Object.keys(row),values=keys.map(k=>k==='id'&&table!=='planning_drafts'?'alternate-id':(row[k]??null));assert.throws(()=>f.db.prepare('INSERT OR REPLACE INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...values));assert.throws(()=>f.db.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+') ON CONFLICT DO UPDATE SET mission_id=excluded.mission_id').run(...values));}
 assert.equal(f.planning.pair('mission',accepted.plan.pairId).plan.canonical,accepted.plan.canonical);
 }finally{f.finish();}
});
test('answer, context, new analysis and new accepted contract identity stale historical plans without deleting them',async()=>{
 for(const change of ['answer','context','analysis','contract']){const f=await fixture();try{const draft=(await f.planning.compile('mission')).draft!,pair=f.planning.accept(draft.id).accepted!;
 if(change==='answer')f.db.exec("UPDATE clarification_answers SET updated_at='2027-01-01'");if(change==='context')f.db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('new-context','mission','{}','c'.repeat(64),'2027-01-01');if(change==='analysis')f.db.exec("INSERT INTO mission_analyses SELECT 'new-analysis',mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,packet_millis,analysis_millis,'2027-01-01',completed_at,error FROM mission_analyses WHERE id='analysis'");if(change==='contract'){const c=f.store.view('mission').accepted!;f.store.accept(f.store.revise('mission',c.id).draft!.id);}
 const v=f.planning.view('mission');assert.equal(v.current,false,change);assert.equal(v.acceptedStale,true,change);assert.notEqual(v.phase,'PLAN_READY');assert.equal(f.planning.attention().length,0);assert.throws(()=>f.planning.accept(draft.id),{code:'STALE_PLAN_DRAFT'});assert.deepEqual(f.planning.pair('mission',pair.plan.pairId),pair);
 }finally{f.finish();}}
});
test('busy, PREPARING, actual process RUNNING, close and startup interruption never publish partial output',async()=>{
 let release!:(v:{output:unknown;toolVersion:string;elapsedMs:number})=>void,signal!:AbortSignal,start!:()=>void;const f=await fixture(async(_i,s,started)=>{signal=s;start=started!;return new Promise(r=>release=r);});try{const pending=f.planning.compile('mission');assert.equal(f.planning.view('mission').operation!.status,'PREPARING');start();assert.equal(f.planning.view('mission').operation!.status,'RUNNING');await assert.rejects(f.planning.compile('mission'),{code:'PLANNING_BUSY'});const rejection=assert.rejects(pending,{code:'PLANNING_INTERRUPTED'});f.planning.close();assert.equal(signal.aborted,true);release({output:planningPayload(),toolVersion:'fake',elapsedMs:1});await rejection;
 const row=f.db.prepare('SELECT * FROM planning_drafts').get()!;f.db.prepare("INSERT INTO planning_drafts(id,mission_id,contract_revision_id,origin,status,input_json,input_hash,user_edits_json,prompt_version,created_at) VALUES('abandoned','mission',?,'CODEX','PREPARING',?,?,'[]','v1','2027-01-01')").run(row.contract_revision_id!,row.input_json!,row.input_hash!);const restarted=createPlanningStore(f.db,quiet,async()=>{throw Error('no resume');});assert.equal(restarted.view('mission').operation!.status,'INTERRUPTED');assert.equal(restarted.view('mission').draft,null);restarted.close();}finally{f.finish();}
});
test('malformed output and process failures have no candidate or accepted artifact',async()=>{
 for(const fail of ['malformed','process']){const f=await fixture(async()=>{if(fail==='process')throw Error('private detail');return {output:{bad:true},toolVersion:'fake',elapsedMs:1};});try{await assert.rejects(f.planning.compile('mission'));assert.equal(f.planning.view('mission').operation!.status,'FAILED');assert.equal(f.planning.view('mission').draft,null);assert.equal(f.planning.view('mission').accepted,null);assert.equal(f.planning.attention().length,0);}finally{f.finish();}}
});

test('acceptance independently revalidates a malformed successful row instead of trusting stored coverage',async()=>{
 const f=await fixture();try{const first=(await f.planning.compile('mission')).draft!,bad=structuredClone(first.payload!);bad.plan.verticalSlices[0]!.requirementIds=[];
 f.db.prepare("INSERT INTO planning_drafts(id,mission_id,contract_revision_id,origin,status,input_json,input_hash,payload_json,coverage_json,user_edits_json,prompt_version,created_at,completed_at) VALUES('malformed-success','mission',?,'CODEX','SUCCEEDED',?,?,?,?, '[]',?,'2027-01-01','2027-01-01')").run(first.input.contractRevisionId,JSON.stringify(first.input),first.inputHash,JSON.stringify(bad),JSON.stringify(first.coverage),first.promptVersion);
 assert.throws(()=>f.planning.accept('malformed-success'));assert.equal(f.db.prepare('SELECT count(*) AS n FROM plan_revisions').get()!.n,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM evaluation_contract_revisions').get()!.n,0);
 }finally{f.finish();}
});
test('evaluation FK rejects pairing another plan draft or contract and PLAN_READY requires both artifacts',async()=>{
 const f=await fixture();try{const first=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!;const next=f.planning.revise('mission',first.plan.pairId).draft!;
 // Insert a plan-only fixture to test the join independently of the store transaction.
 const row=f.db.prepare('SELECT * FROM plan_revisions').get()!,keys=Object.keys(row),values=keys.map(k=>k==='id'?'half-plan':k==='pair_id'?'half-pair':k==='revision'?2:k==='draft_id'?next.id:(row[k]??null));
 f.db.prepare('INSERT INTO plan_revisions('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...values);
 assert.notEqual(f.planning.view('mission').phase,'PLAN_READY');assert.equal(f.planning.view('mission').accepted!.plan.pairId,first.plan.pairId);
 const e=f.db.prepare('SELECT * FROM evaluation_contract_revisions').get()!,ek=Object.keys(e),ev=ek.map(k=>k==='id'?'mixed-evaluation':k==='pair_id'?'half-pair':k==='revision'?2:k==='draft_id'?'wrong-draft':(e[k]??null));
 assert.throws(()=>f.db.prepare('INSERT INTO evaluation_contract_revisions('+ek.join(',')+') VALUES('+ek.map(()=>'?').join(',')+')').run(...ev),/FOREIGN KEY/);
 assert.throws(()=>f.planning.pair('mission','half-pair'),{code:'PLAN_PAIR_NOT_FOUND'});
 }finally{f.finish();}
});

test('a forged successful input cannot accept scope not present in the current bound contract',async()=>{
 const f=await fixture();try{const draft=(await f.planning.compile('mission')).draft!,input=structuredClone(draft.input);input.contract.requirements[0]!.text='Stop retrying and persist an unrelated public record.';
 f.db.prepare("INSERT INTO planning_drafts(id,mission_id,contract_revision_id,origin,status,input_json,input_hash,payload_json,coverage_json,user_edits_json,prompt_version,created_at,completed_at) VALUES('forged-input','mission',?,'CODEX','SUCCEEDED',?,?,?,?, '[]',?,'2027-01-01','2027-01-01')").run(draft.input.contractRevisionId,JSON.stringify(input),draft.inputHash,JSON.stringify(draft.payload),JSON.stringify(draft.coverage),draft.promptVersion);
 assert.throws(()=>f.planning.accept('forged-input'),{code:'STALE_PLAN_DRAFT'});assert.equal(f.db.prepare('SELECT count(*) AS n FROM plan_revisions').get()!.n,0);
 }finally{f.finish();}
});

test('typed process timeout remains a failed terminal operation with no reviewable partial result',async()=>{
 const f=await fixture(async()=>{throw new PlanningError('PLANNING_TIMEOUT','Planning exceeded its bounded timeout.',504);});try{
 await assert.rejects(f.planning.compile('mission'),{code:'PLANNING_TIMEOUT',status:504});const state=f.planning.view('mission');assert.equal(state.operation!.status,'FAILED');assert.equal(state.draft,null);assert.equal(state.accepted,null);assert.equal(state.phase,'CONTRACT_READY');assert.equal(f.planning.attention().length,0);
 }finally{f.finish();}
});
