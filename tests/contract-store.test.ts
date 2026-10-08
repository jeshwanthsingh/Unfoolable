import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openDatabase} from '../apps/server/database.ts';
import {createContractStore,canonicalContractJson,acceptedContentCanonical,type ContractDrafter} from '../apps/server/contract-store.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
import type {ContractPayload} from '../packages/shared/contracts.ts';
const quiet=()=>{};
const payload=():ContractPayload=>({goal:{id:'G1',text:'Preserve retry behavior.',sourceIds:['intent']},requirements:[{id:'R1',text:'Stop retrying after denial.',sourceIds:['answer:question']}],scope:[{id:'S1',text:'Retry behavior.',sourceIds:['intent']}],nonGoals:[{id:'NG1',text:'Mobile integrations.',sourceIds:['intent']}],constraints:[],assumptions:[],risks:[]});
export function contractFixture(drafter:ContractDrafter=async()=>({output:payload(),toolVersion:'fake',elapsedMs:2})){
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
test('successful draft never autoaccepts; review attention and explicit hashed acceptance persist exactly',async()=>{
 const f=contractFixture();try{
  assert.equal(f.store.view('mission').phase,'CLARIFIED');const review=await f.store.compile('mission');assert.equal(review.phase,'CONTRACT_REVIEW');assert.equal(review.accepted,null);assert.equal(f.store.attention().length,1);
  const accepted=f.store.accept(review.draft!.id);assert.equal(accepted.phase,'CONTRACT_READY');assert.equal(f.store.attention().length,0);assert.equal(accepted.accepted!.contractHash,createHash('sha256').update(accepted.accepted!.canonical).digest('hex'));assert.equal(accepted.accepted!.canonical,acceptedContentCanonical(payload()));assert.deepEqual(accepted.accepted!.input,review.draft!.input);
  assert.deepEqual(f.store.accept(review.draft!.id),accepted);assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_contract_revisions').get()!.n,1);
  f.store.close();f.database.close();const reopened=openDatabase(join(f.root,'data'),quiet);try{const store=createContractStore(reopened.connection,quiet,async()=>{throw Error('no model');});assert.deepEqual(store.view('mission'),accepted);store.close();}finally{reopened.close();}
 }finally{f.finish();}
});
test('edits create immutable child history and truthful USER_EDIT provenance; source tampering/addition rejected',async()=>{
 const f=contractFixture();try{
  const first=(await f.store.compile('mission')).draft!,changed=structuredClone(first.payload!);changed.requirements[0]!.text='Stop immediately after denial.';
  const edited=f.store.edit(first.id,{payload:changed}).draft!;assert.notEqual(edited.id,first.id);assert.equal(edited.parentDraftId,first.id);assert.equal(edited.origin,'USER_EDIT');assert.equal(edited.userEdits[0]!.type,'USER_EDIT');assert.equal(edited.userEdits[0]!.text,changed.requirements[0]!.text);assert.deepEqual(edited.payload!.goal,first.payload!.goal);assert.deepEqual(edited.payload!.requirements[0]!.sourceIds,[edited.userEdits[0]!.id]);
  assert.equal(f.db.prepare('SELECT payload_json FROM contract_drafts WHERE id=?').get(first.id)!.payload_json,JSON.stringify(first.payload));assert.throws(()=>f.store.accept(first.id),{code:'SUPERSEDED_CONTRACT_DRAFT'});
  const second=structuredClone(edited.payload!);second.requirements[0]!.text='Stop after any denial.';const next=f.store.edit(edited.id,{payload:second}).draft!;assert.equal(next.userEdits.length,1);assert.notEqual(next.userEdits[0]!.id,edited.userEdits[0]!.id);
  const tampered=structuredClone(next.payload!);tampered.goal.sourceIds=['answer:question'];assert.throws(()=>f.store.edit(next.id,{payload:tampered}),{code:'INVALID_CONTRACT_EDIT'});
  const added=structuredClone(next.payload!);added.requirements.push({id:'R2',text:'Other behavior',sourceIds:['intent']});assert.throws(()=>f.store.edit(next.id,{payload:added}),{code:'INVALID_CONTRACT_EDIT'});
  f.store.accept(next.id);assert.throws(()=>f.store.edit(next.id,{payload:next.payload}),{code:'CONTRACT_ALREADY_ACCEPTED'});
 }finally{f.finish();}
});
test('explicit revision forks accepted draft, v2 keeps v1 unchanged, and terminal records reject all mutations',async()=>{
 const f=contractFixture();try{
  const first=f.store.accept((await f.store.compile('mission')).draft!.id).accepted!;
  const revision=f.store.revise('mission',first.id);assert.equal(revision.phase,'CONTRACT_REVIEW');assert.equal(revision.draft!.origin,'REVISION');
  const changed=structuredClone(revision.draft!.payload!);changed.goal.text='Preserve controlled retry behavior.';const edited=f.store.edit(revision.draft!.id,{payload:changed});const second=f.store.accept(edited.draft!.id).accepted!;assert.equal(second.revision,2);assert.notEqual(second.contractHash,first.contractHash);assert.equal(f.db.prepare('SELECT canonical FROM mission_contract_revisions WHERE id=?').get(first.id)!.canonical,first.canonical);
  for(const table of ['contract_drafts','mission_contract_revisions']){assert.throws(()=>f.db.exec(`UPDATE ${table} SET mission_id='mission'`),/immutable/i);assert.throws(()=>f.db.exec(`DELETE FROM ${table}`),/immutable/i);assert.throws(()=>f.db.exec(`INSERT OR REPLACE INTO ${table} SELECT * FROM ${table}`),/immutable/i);}
  assert.notEqual(canonicalContractJson([1,2]),canonicalContractJson([2,1]));
 }finally{f.finish();}
});
test('answer text and timestamp, latest context, latest analysis and pending analysis invalidate exact input bindings',async()=>{
 for(const change of ['answer','timestamp','context','analysis','pending']){
  const f=contractFixture();try{
   const draft=(await f.store.compile('mission')).draft!;const accepted=f.store.accept(draft.id).accepted!;
   if(change==='answer')f.db.exec("UPDATE clarification_answers SET answer_text='Retry instead.',updated_at='2027-01-01'");
   if(change==='timestamp')f.db.exec("UPDATE clarification_answers SET updated_at='2027-01-01'");
   if(change==='context')f.db.exec("INSERT INTO project_context_snapshots VALUES('fresh','mission','{}','"+'c'.repeat(64)+"','2027-01-01')");
   if(change==='analysis')f.db.exec("INSERT INTO mission_analyses SELECT 'new-analysis',mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,packet_millis,analysis_millis,'2027-01-01',completed_at,error FROM mission_analyses WHERE id='analysis'");
   if(change==='pending')f.db.exec("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,prompt_version,created_at) VALUES('pending','mission','snapshot','"+'a'.repeat(40)+"','PREPARING','v1','2027-01-01')");
   const view=f.store.view('mission');assert.equal(view.draftStale,true,change);assert.equal(view.acceptedStale,true,change);assert.equal(view.current,false,change);assert.equal(f.store.attention().length,0);assert.throws(()=>f.store.revise('mission',accepted.id),{code:'STALE_CONTRACT_DRAFT'});assert.equal(view.accepted!.canonical,accepted.canonical);assert.throws(()=>f.store.accept(draft.id),{code:'STALE_CONTRACT_DRAFT'});
  }finally{f.finish();}
 }
 const f=contractFixture();try{const draft=(await f.store.compile('mission')).draft!;f.db.exec("UPDATE clarification_answers SET answer_text='Changed',updated_at='2027-01-01'");assert.throws(()=>f.store.accept(draft.id),{code:'STALE_CONTRACT_DRAFT'});}finally{f.finish();}
});
test('malformed and provenance-invalid model output fail atomically without an active draft',async()=>{
 for(const output of [{bad:true},{...payload(),goal:{id:'G1',text:'Goal',sourceIds:['invented']}}]){
  const f=contractFixture(async()=>({output,toolVersion:'fake',elapsedMs:1}));try{await assert.rejects(f.store.compile('mission'));assert.equal(f.store.view('mission').draft,null);assert.equal(f.store.view('mission').phase,'CLARIFIED');assert.equal(f.store.view('mission').operation!.status,'FAILED');assert.equal(f.store.attention().length,0);}finally{f.finish();}
 }
});
test('busy, actual onStarted RUNNING, close interruption and abandoned startup interruption',async()=>{
 let release!:(v:{output:unknown;toolVersion:string;elapsedMs:number})=>void,signal:AbortSignal|undefined;const f=contractFixture(async(_input,s,onStarted)=>{signal=s;onStarted!();return new Promise(r=>release=r);});try{
  const running=f.store.compile('mission');assert.equal(f.store.view('mission').operation!.status,'RUNNING');await assert.rejects(f.store.compile('mission'),{code:'CONTRACT_BUSY'});const rejection=assert.rejects(running,{code:'CONTRACT_INTERRUPTED'});f.store.close();assert.equal(signal!.aborted,true);assert.equal(f.db.prepare('SELECT status FROM contract_drafts').get()!.status,'INTERRUPTED');release({output:payload(),toolVersion:'fake',elapsedMs:1});await rejection;
  const row=f.db.prepare('SELECT * FROM contract_drafts LIMIT 1').get()!;f.db.prepare("INSERT INTO contract_drafts(id,mission_id,origin,status,input_json,input_hash,user_edits_json,prompt_version,created_at) VALUES('abandoned','mission','CODEX','PREPARING',?,?,'[]','v1','2027-01-01')").run(row.input_json!,row.input_hash!);
  const restarted=createContractStore(f.db,quiet,async()=>{throw Error('no resume');});assert.equal(restarted.view('mission').operation!.status,'INTERRUPTED');restarted.close();
 }finally{f.finish();}
});
test('missing or unclarified missions never invoke drafter; DB enforces active input uniqueness',async()=>{
 let calls=0;const f=contractFixture(async()=>{calls++;return {output:payload(),toolVersion:'fake',elapsedMs:1};});try{
  await assert.rejects(f.store.compile('missing'),{code:'MISSION_NOT_FOUND'});f.db.exec('DELETE FROM clarification_answers');await assert.rejects(f.store.compile('mission'),{code:'CLARIFICATION_REQUIRED'});assert.equal(calls,0);
  f.db.exec("INSERT INTO clarification_answers VALUES('question','Stop retrying after denial.','2026-01-06')");const draft=(await f.store.compile('mission')).draft!;
  const insert=f.db.prepare("INSERT INTO contract_drafts(id,mission_id,origin,status,input_json,input_hash,user_edits_json,prompt_version,created_at) VALUES(?,'mission','CODEX','PREPARING',?,?,'[]','v1','2027-01-01')");insert.run('one',JSON.stringify(draft.input),draft.inputHash);assert.throws(()=>insert.run('two',JSON.stringify(draft.input),draft.inputHash),/unique/i);
 }finally{f.finish();}
});
test('concurrent explicit acceptance creates one immutable revision; failed retry preserves current review',async()=>{
 let calls=0;const f=contractFixture(async()=>{if(++calls===2)throw Error('private process details');return {output:payload(),toolVersion:'fake',elapsedMs:1};});try{
  const first=(await f.store.compile('mission')).draft!;await assert.rejects(f.store.compile('mission'),{code:'CONTRACT_FAILED'});assert.deepEqual(f.store.view('mission').draft,first);assert.equal(f.store.view('mission').operation!.error,'Contract compilation failed. Try again.');assert.equal(f.store.view('mission').phase,'CONTRACT_REVIEW');assert.equal(f.store.attention().length,1);
  const accepted=await Promise.all([Promise.resolve().then(()=>f.store.accept(first.id)),Promise.resolve().then(()=>f.store.accept(first.id))]);assert.deepEqual(accepted[0]!.accepted,accepted[1]!.accepted);assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_contract_revisions').get()!.n,1);
 }finally{f.finish();}
});
test('PREPARING is distinct from started process and mid-compilation decision changes yield a stale unaccepted candidate',async()=>{
 let release!:(v:{output:unknown;toolVersion:string;elapsedMs:number})=>void;const f=contractFixture(async()=>new Promise(r=>release=r));try{
  const compiling=f.store.compile('mission');assert.equal(f.store.view('mission').operation!.status,'PREPARING');f.db.exec("UPDATE clarification_answers SET updated_at='2027-01-01'");release({output:payload(),toolVersion:'fake',elapsedMs:1});const completed=await compiling;assert.equal(completed.draft!.status,'SUCCEEDED');assert.equal(completed.draftStale,true);assert.equal(completed.phase,'CLARIFIED');assert.equal(f.store.attention().length,0);assert.throws(()=>f.store.accept(completed.draft!.id),{code:'STALE_CONTRACT_DRAFT'});
 }finally{f.finish();}
});
