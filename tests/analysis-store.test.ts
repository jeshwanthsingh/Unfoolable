import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
import {createAnalysisStore} from '../apps/server/analysis-store.ts';
import {createContextStore} from '../apps/server/context-store.ts';
import {AnalysisError} from '../apps/server/analysis-errors.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
import {CONTEXT_LIMITS} from '../packages/shared/context.ts';
import type {ProjectContextPayload} from '../packages/shared/context.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
import type {AnalysisResult,AnalysisPacket} from '../packages/shared/analysis.ts';
import type {MissionAnalyzer} from '../apps/server/mission-analyzer.ts';

const quiet=()=>{};
const payload:ProjectContextPayload={baseHead:'a'.repeat(40),branch:'main',workingTree:{clean:true,count:0,summary:{modified:0,added:0,deleted:0,renamed:0,untracked:0,conflicted:0},changes:[],truncated:false},trackedFiles:{count:1,pathSetHash:'b'.repeat(64)},structure:{entries:[],total:0,truncated:false},importantPaths:{paths:[],total:0,truncated:false},manifestPaths:{paths:[],total:0,truncated:false},testLikePaths:{paths:[],total:0,truncated:false},limits:CONTEXT_LIMITS};
const result=(count=2):AnalysisResult=>({understanding:{relevantAreas:[{text:'Retry control lives in the source.',kind:'observation',evidenceIds:['E1']}],currentBehavior:[],constraints:[],uncertainties:[]},questions:Array.from({length:count},(_,i)=>({question:`Which retry behavior should case ${i+1} use?`,whyItMatters:'This determines observable behavior.',decisionArea:'behavior',options:['Retry','Stop'],evidenceIds:['E1']}))});
const packetBuilder:Parameters<typeof createAnalysisStore>[4]=async(mission,snapshot,repoRoot)=>{
 assert.equal(repoRoot,'/authoritative/project');
 const packet:AnalysisPacket={version:'analysis-packet-v1',missionId:mission.id,snapshotId:snapshot.id,originalIntent:mission.originalIntent,project:{baseHead:snapshot.payload.baseHead,branch:'main',dirty:false,structure:[]},evidence:[{id:'E1',path:'src/retry.ts',kind:'source',startLine:1,endLine:1,content:'retry();',contentHash:'c'.repeat(64)}],limits:PACKET_LIMITS,evidenceTruncated:false,sourcePolicy:'committed-head-only'};
 return {packet,hash:'d'.repeat(64),elapsedMs:2};
};
function fixture(analyzer:MissionAnalyzer=async()=>({output:result(),toolVersion:'fake-v1',elapsedMs:3}),withContext=true){
 const root=mkdtempSync(join(tmpdir(),'cc-analysis-store-'));const database=openDatabase(join(root,'data'),quiet);const db=database.connection;
 db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Registered','/authoritative/project','a'.repeat(40),null,'2026-01-01');
 db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','  Fix retry behavior.\n','DRAFT','2026-01-02');
 if(withContext)db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission',JSON.stringify(payload),payloadHash(payload),'2026-01-03');
 const store=createAnalysisStore(db,[root],quiet,analyzer,packetBuilder);
 return {root,database,db,store,finish(){store.close();database.close();rmSync(root,{recursive:true});}};
}
test('analysis persists provenance and ordered required questions; answers derive phase and attention without model calls',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {output:result(),toolVersion:'fake-v1',elapsedMs:3};});
 try{
  assert.deepEqual(f.store.view('mission'),{analysis:null,operation:null,questions:[],phase:'DRAFT',stale:false});
  const view=await f.store.analyze('mission');assert.equal(calls,1);assert.equal(view.phase,'NEEDS_CLARIFICATION');assert.equal(view.operation?.status,'SUCCEEDED');assert.equal(view.analysis?.packet?.originalIntent,'  Fix retry behavior.\n');assert.equal(view.analysis?.snapshotId,'snapshot');assert.equal(view.analysis?.baseHead,payload.baseHead);assert.equal(view.analysis?.packetHash,'d'.repeat(64));assert.equal(view.analysis?.packetMillis,2);assert.equal(view.analysis?.analysisMillis,3);assert.equal(view.analysis?.toolVersion,'fake-v1');
  assert.deepEqual(view.questions.map(q=>[q.order,q.required,q.answer]),[[0,true,null],[1,true,null]]);assert.equal(f.store.attention().count,2);
  const [a,b]=view.questions;assert.equal(f.store.answer(a!.id,'  Preserve exact answer.\n').phase,'NEEDS_CLARIFICATION');assert.equal(f.store.attention().count,1);assert.equal(f.store.answer(b!.id,'Stop').phase,'CLARIFIED');assert.equal(f.store.attention().count,0);assert.equal(calls,1);
  const edited=f.store.answer(a!.id,'Retry twice');assert.equal(edited.questions[0]?.answer?.text,'Retry twice');assert.equal(f.db.prepare('SELECT count(*) AS n FROM clarification_answers').get()?.n,2);assert.equal(calls,1);assert.equal(f.db.prepare('SELECT phase FROM missions').get()?.phase,'DRAFT');
  for(const answer of ['', '   ',null,42,'x'.repeat(4001)])assert.throws(()=>f.store.answer(a!.id,answer),{code:'INVALID_CLARIFICATION_ANSWER'});
  assert.throws(()=>f.store.answer('unknown','valid'),{code:'QUESTION_NOT_FOUND'});
 }finally{f.finish();}
});
test('zero-question success immediately clarifies; recapture marks old analysis stale without changing its provenance',async()=>{
 const f=fixture(async()=>({output:result(0),toolVersion:'fake',elapsedMs:1}));try{
  const completed=await f.store.analyze('mission');assert.equal(completed.phase,'CLARIFIED');assert.equal(f.store.attention().count,0);
  await createContextStore(f.db,[f.root],quiet,async()=>payload).capture('mission');
  const stale=f.store.view('mission');assert.equal(stale.stale,true);assert.deepEqual(stale.analysis,completed.analysis);assert.equal(stale.phase,'CLARIFIED');
 }finally{f.finish();}
});
test('missing mission/context never builds a packet or calls the model',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;throw new Error('must not call');},false);let builds=0;
 const store=createAnalysisStore(f.db,[f.root],quiet,async()=>{calls++;throw new Error('must not call');},async()=>{builds++;throw new Error('must not build');});
 try{await assert.rejects(store.analyze('missing'),{code:'MISSION_NOT_FOUND'});await assert.rejects(store.analyze('mission'),{code:'CONTEXT_REQUIRED'});assert.equal(calls,0);assert.equal(builds,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_analyses').get()?.n,0);}finally{store.close();f.finish();}
});
test('invalid output, unknown evidence and excess questions fail atomically with no active questions',async()=>{
 for(const output of [{bad:'schema'}, {...result(),questions:result().questions.map(q=>({...q,evidenceIds:['UNKNOWN']}))},result(7)]){
  const f=fixture(async()=>({output,toolVersion:'fake',elapsedMs:1}));try{
   await assert.rejects(f.store.analyze('mission'));assert.equal(f.store.view('mission').phase,'DRAFT');assert.equal(f.store.view('mission').operation?.status,'FAILED');assert.equal(f.store.view('mission').analysis,null);assert.equal(f.db.prepare('SELECT count(*) AS n FROM clarification_questions').get()?.n,0);assert.equal(f.store.attention().count,0);
  }finally{f.finish();}
 }
});
test('failed attempts preserve earlier successful analysis; successful retries clear visible failure and retain history',async()=>{
 let calls=0;const f=fixture(async()=>{if(++calls===2)throw new AnalysisError('ANALYSIS_TIMEOUT','Analysis timed out.',504);return {output:result(calls===1?2:1),toolVersion:'fake',elapsedMs:1};});try{
  const first=await f.store.analyze('mission');await assert.rejects(f.store.analyze('mission'),{code:'ANALYSIS_TIMEOUT'});assert.equal(f.store.view('mission').operation?.status,'FAILED');assert.deepEqual(f.store.view('mission').analysis,first.analysis);assert.equal(f.store.attention().count,2);
  const retried=await f.store.analyze('mission');assert.equal(retried.operation?.status,'SUCCEEDED');assert.notEqual(retried.analysis?.id,first.analysis?.id);assert.equal(f.store.attention().count,1);assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_analyses').get()?.n,3);assert.equal(f.db.prepare('SELECT count(*) AS n FROM clarification_questions').get()?.n,3);
  f.store.answer(first.questions[0]!.id,'Old answer');assert.equal(f.store.attention().count,1);assert.equal(f.store.view('mission').questions[0]?.answer,null);
 }finally{f.finish();}
});
test('one active analysis rejects duplicate work; process failures leave terminal failure without questions',async()=>{
 let release!:(value:{output:unknown;toolVersion:string;elapsedMs:number})=>void;let calls=0;
 const f=fixture(async()=>{calls++;return new Promise(resolve=>{release=resolve;});});try{
  f.db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('other','project','Other mission','DRAFT','2026-01-02');f.db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('other-snapshot','other',JSON.stringify(payload),payloadHash(payload),'2026-01-03');
  const running=f.store.analyze('mission');await Promise.resolve();assert.equal(f.store.view('mission').operation?.status,'PREPARING');await assert.rejects(f.store.analyze('mission'),{code:'ANALYSIS_BUSY'});await assert.rejects(f.store.analyze('other'),{code:'ANALYSIS_BUSY'});assert.equal(calls,1);release({output:result(),toolVersion:'fake',elapsedMs:1});await running;assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_analyses').get()?.n,1);
 }finally{f.finish();}
 const failed=fixture(async()=>{throw new Error('private stderr or process details');});try{await assert.rejects(failed.store.analyze('mission'),{code:'ANALYSIS_FAILED'});assert.equal(failed.store.view('mission').operation?.error,'Mission analysis failed. Try again.');assert.equal(failed.store.attention().count,0);}finally{failed.finish();}
});
test('packet construction failure never calls the model and preserves a failed attempt',async()=>{
 const f=fixture();let calls=0;const store=createAnalysisStore(f.db,[f.root],quiet,async()=>{calls++;throw new Error('not reached');},async()=>{throw new AnalysisError('ANALYSIS_PACKET_FAILED','Evidence could not be prepared.');});
 try{await assert.rejects(store.analyze('mission'),{code:'ANALYSIS_PACKET_FAILED'});assert.equal(calls,0);assert.equal(store.view('mission').operation?.status,'FAILED');assert.equal(store.view('mission').analysis,null);assert.equal(store.attention().count,0);}finally{store.close();f.finish();}
});
test('successful analysis and saved answer survive database restart exactly',async()=>{
 const f=fixture();try{
  const completed=await f.store.analyze('mission');const answered=f.store.answer(completed.questions[0]!.id,'Keep retrying twice.');f.store.close();f.database.close();
  const reopened=openDatabase(join(f.root,'data'),quiet);try{const store=createAnalysisStore(reopened.connection,[f.root],quiet,async()=>{throw new Error('do not resume');},packetBuilder);assert.deepEqual(store.view('mission'),answered);assert.equal(store.attention().count,1);store.close();}finally{reopened.close();}
 }finally{f.finish();}
});
test('question insertion failure rolls back successful result and all questions',async()=>{
 const f=fixture();try{
  f.db.exec("CREATE TRIGGER reject_second_question BEFORE INSERT ON clarification_questions WHEN NEW.display_order=1 BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
  await assert.rejects(f.store.analyze('mission'));assert.equal(f.store.view('mission').analysis,null);assert.equal(f.store.view('mission').operation?.status,'FAILED');assert.equal(f.db.prepare('SELECT result_json FROM mission_analyses').get()?.result_json,null);assert.equal(f.db.prepare('SELECT count(*) AS n FROM clarification_questions').get()?.n,0);
 }finally{f.finish();}
});
test('close aborts owned model call and persists INTERRUPTED before database close; startup interrupts abandoned RUNNING',async()=>{
 let signal:AbortSignal|undefined;let reject!:(reason:Error)=>void;const f=fixture(async(_packet,s)=>{signal=s;return new Promise((_resolve,r)=>{reject=r;});});try{
  const running=f.store.analyze('mission');await Promise.resolve();const rejection=assert.rejects(running,{code:'ANALYSIS_INTERRUPTED'});f.store.close();assert.equal(signal?.aborted,true);assert.equal(f.db.prepare('SELECT status FROM mission_analyses').get()?.status,'INTERRUPTED');f.database.close();reject(new Error('aborted'));await rejection;
  const reopened=openDatabase(join(f.root,'data'),quiet);try{
   const db=reopened.connection;db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,prompt_version,created_at) VALUES('abandoned','mission','snapshot',?,'RUNNING','v1','2027-01-01')").run(payload.baseHead);
   let calls=0;const restarted=createAnalysisStore(db,[f.root],quiet,async()=>{calls++;throw new Error('no resume');},packetBuilder);assert.equal(restarted.view('mission').operation?.status,'INTERRUPTED');assert.equal(calls,0);assert.equal(restarted.attention().count,0);restarted.close();
  }finally{reopened.close();}
 }finally{f.finish();}
});
test('completed analyses and clarification question rows reject update, delete, and replacement',async()=>{
 const f=fixture();try{
  const completed=await f.store.analyze('mission');const id=completed.analysis!.id,q=completed.questions[0]!.id;
  assert.throws(()=>f.db.prepare('UPDATE mission_analyses SET error=? WHERE id=?').run('tamper',id),/immutable/i);assert.throws(()=>f.db.prepare('DELETE FROM mission_analyses WHERE id=?').run(id),/immutable/i);
  assert.throws(()=>f.db.prepare('INSERT OR REPLACE INTO mission_analyses SELECT * FROM mission_analyses WHERE id=?').run(id),/immutable/i);
  assert.throws(()=>f.db.prepare('UPDATE clarification_questions SET question=? WHERE id=?').run('tamper',q),/immutable/i);assert.throws(()=>f.db.prepare('DELETE FROM clarification_questions WHERE id=?').run(q),/immutable/i);
  assert.throws(()=>f.db.prepare('INSERT OR REPLACE INTO clarification_questions SELECT * FROM clarification_questions WHERE id=?').run(q),/immutable/i);assert.deepEqual(f.store.view('mission'),completed);
 }finally{f.finish();}
});
test('database rejects duplicate RUNNING work for the same mission and snapshot',()=>{
 const f=fixture();try{
  const insert=f.db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,prompt_version,created_at) VALUES(?,'mission','snapshot',?,'RUNNING','v1','2026-01-04')");
  insert.run('first-running',payload.baseHead);assert.throws(()=>insert.run('second-running',payload.baseHead),/unique/i);assert.equal(f.db.prepare('SELECT count(*) AS n FROM mission_analyses').get()?.n,1);
 }finally{f.finish();}
});
