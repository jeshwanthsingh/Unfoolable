import type {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import type {Logger} from './log.ts';
import type {createContextStore} from './context-store.ts';
import type {createAnalysisStore} from './analysis-store.ts';
import type {createContractStore} from './contract-store.ts';
import type {createPlanningStore} from './planning-store.ts';
import type {createBuildStore} from './build-store.ts';
import type {createVerificationStore} from './verification-store.ts';
import type {createDebugStore} from './debug-store.ts';
import type {createMissionOutcomeStore} from './mission-outcomes.ts';
import {canonicalContractJson} from './contract-store.ts';
import {planningContentIdentity} from './content-identity.ts';
import {readOracle} from './oracle-author.ts';
import {evaluatorBundle} from './verification-executor.ts';
import {SpecError} from './spec-errors.ts';
import type {SpecView,SpecPhase,SpecClaim,SpecAttention,MissionDecision} from '../../packages/shared/spec.ts';
type Services={context:ReturnType<typeof createContextStore>;analysis:ReturnType<typeof createAnalysisStore>;contract:ReturnType<typeof createContractStore>;planning:ReturnType<typeof createPlanningStore>;build:ReturnType<typeof createBuildStore>;verification:ReturnType<typeof createVerificationStore>;debug:ReturnType<typeof createDebugStore>;outcomes:ReturnType<typeof createMissionOutcomeStore>};
type Row={mission_id:string;status:SpecPhase;spec_id:string|null;error:string|null;updated_at:string};
export function createMissionWorkflow(db:DatabaseSync,services:Services,logger:Logger){
 let closed=false,ticking=false;let timer:ReturnType<typeof setInterval>|undefined;let preparation=Promise.resolve();const preparing=new Map<string,Promise<void>>();const advancing=new Set<string>();
 const row=(id:string)=>db.prepare('SELECT * FROM mission_workflows WHERE mission_id=?').get(id) as Row|undefined;
 const ensure=(id:string)=>{if(!db.prepare('SELECT id FROM missions WHERE id=?').get(id))throw new SpecError('MISSION_NOT_FOUND','That Mission could not be found.',404);if(closed)throw new SpecError('WORKFLOW_CLOSED','The coordinator has stopped.');};
 const set=(id:string,status:SpecPhase,error:string|null=null,specId=row(id)?.spec_id??null)=>{if(db.prepare("SELECT sequence FROM mission_decisions WHERE mission_id=? AND kind='ABANDON'").get(id)&&!['ABANDONED','NEEDS_YOU'].includes(status))return;db.prepare('INSERT INTO mission_workflows VALUES(?,?,?,?,?) ON CONFLICT(mission_id) DO UPDATE SET status=excluded.status,spec_id=excluded.spec_id,error=excluded.error,updated_at=excluded.updated_at').run(id,status,specId,error?.slice(0,2000)??null,new Date().toISOString());logger({event:'mission.transition',code:status,message:id});};
 const exception=(id:string,error:unknown)=>{if(!closed&&!recordedTerminal(id))set(id,'NEEDS_YOU',error instanceof Error?error.message:'The operation needs inspection.');};
 function claimsFor(id:string):SpecClaim[]{
  const plan=services.planning.view(id),payload=plan.draft?.payload??(plan.accepted?{plan:plan.accepted.plan.payload,evaluationContract:plan.accepted.evaluation.payload}:null);
  if(!payload)return [];
  return payload.evaluationContract.claims.map(claim=>{
   const ref=claim.oracle;let redOnBase:SpecClaim['redOnBase']='INCONCLUSIVE',admitted=false;
   if(ref)try{readOracle(ref);const records=['admission-replay.json','admission.json'].map(name=>{try{return JSON.parse(readFileSync(join(dirname(ref.path),name),'utf8'));}catch{return null;}});const record=records.find(r=>r?.manifestHash===ref.hash);const result=record?.results?.find((r:{claimId:string})=>r.claimId===claim.id)?.result;
    if(result&&['FAIL','PASS'].includes(result.status)&&result.cleanup?.verified===true&&result.cleanup?.ambiguous===false&&Array.isArray(result.cleanup.remaining)&&result.cleanup.remaining.length===0&&!result.truncated){redOnBase=result.status;admitted=ref.admission==='ADMITTED'&&redOnBase===(ref.classification==='CHANGE'?'FAIL':'PASS');}
   }catch{/* Missing immutable evidence never implies admission. */}
   return {claimId:claim.id,testName:ref?.testId??'No native test',summary:ref?.summary??claim.claim,assurance:ref?.assurance??'IN-PROCESS',classification:ref?.classification??'CHANGE',redOnBase,admitted};
  });
 }
 const recordedTerminal=(id:string)=>db.prepare("SELECT kind,spec_id,run_id FROM mission_decisions WHERE mission_id=? AND kind IN('LAND','ABANDON') ORDER BY sequence LIMIT 1").get(id);
 const pendingLand=(id:string)=>!!db.prepare('SELECT mission_id FROM mission_land_intents WHERE mission_id=?').get(id);
 const pendingLandRun=(id:string):string|null=>{const intent=db.prepare('SELECT intent_json FROM mission_land_intents WHERE mission_id=?').get(id);if(!intent)return null;try{const run=JSON.parse(String(intent.intent_json)).outcome?.runId;return typeof run==='string'&&run.length>0?run:null;}catch{return null;}};
 // Record the human request before any terminal side effect. This never asserts an outcome.
 const terminalDecision=(id:string,kind:'LAND'|'ABANDON',specId:string|null,runId:string|null,createdAt=new Date().toISOString())=>{
  db.exec('BEGIN IMMEDIATE');try{
   if(kind==='LAND'&&!db.prepare("SELECT sequence FROM mission_decisions WHERE mission_id=? AND kind='APPROVE_SPEC' AND spec_id=?").get(id,specId))throw new SpecError('SPEC_NOT_APPROVED','Terminal decisions require the recorded approved Spec.');
   const existing=db.prepare("SELECT kind,spec_id,run_id FROM mission_decisions WHERE mission_id=? AND kind IN('LAND','ABANDON') ORDER BY sequence LIMIT 1").get(id);
   if(existing){if(existing.kind!==kind||existing.spec_id!==specId||existing.run_id!==runId)throw new SpecError('TERMINAL_DECISION_CONFLICT','Retry the exact recorded terminal decision.');}
   else db.prepare('INSERT INTO mission_decisions(mission_id,kind,spec_id,run_id,created_at) VALUES(?,?,?,?,?)').run(id,kind,specId,runId,createdAt);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 };
 const reconcileTerminal=(id:string)=>{const outcome=services.outcomes.view(id),specId=row(id)?.spec_id;if(!outcome||(outcome.state==='LANDED'&&!specId))throw new SpecError('TERMINAL_RECONCILE_REQUIRED','Terminal approval identity is unavailable.');const recorded=db.prepare("SELECT run_id FROM mission_decisions WHERE mission_id=? AND kind='ABANDON' AND spec_id=?").get(id,specId??null);terminalDecision(id,outcome.state==='LANDED'?'LAND':'ABANDON',specId??null,outcome.state==='LANDED'?outcome.runId:recorded?.run_id as string|null??null,outcome.createdAt);set(id,outcome.state,null,specId);return view(id);};
 const reconcileLand=async(id:string)=>{const runId=pendingLandRun(id),specId=row(id)?.spec_id,request=db.prepare("SELECT spec_id,run_id FROM mission_decisions WHERE mission_id=? AND kind='LAND' ORDER BY sequence LIMIT 1").get(id);
  if(!runId||!specId||!request||request.spec_id!==specId||request.run_id!==runId||!db.prepare("SELECT sequence FROM mission_decisions WHERE mission_id=? AND kind='APPROVE_SPEC' AND spec_id=?").get(id,specId))throw new SpecError('LAND_RECONCILE_REQUIRED','The exact pending Land request and approved Spec must be recorded.');
  await services.outcomes.land(id,runId);set(id,'LANDED',null,specId);
 };
 const replayTerminalRequest=async(id:string)=>{
  const request=recordedTerminal(id),specId=row(id)?.spec_id;
  if(!request||request.spec_id!==(specId??null)||(request.kind==='LAND'&&(!specId||!db.prepare("SELECT sequence FROM mission_decisions WHERE mission_id=? AND kind='APPROVE_SPEC' AND spec_id=?").get(id,specId))))throw new SpecError('TERMINAL_RECONCILE_REQUIRED','The exact terminal request and prior Spec approval must be recorded.');
  if(request.kind==='LAND'){
   if(typeof request.run_id!=='string'||!request.run_id)throw new SpecError('LAND_RECONCILE_REQUIRED','The original Land run is unavailable.');
   if(pendingLand(id))await reconcileLand(id);
   else {await services.outcomes.land(id,request.run_id);set(id,'LANDED',null,specId);}
  }else {if(pendingLand(id))throw new SpecError('LAND_RECONCILE_REQUIRED','A pending Land journal prevents Abandon.');await services.outcomes.abandon(id);set(id,'ABANDONED',null,specId);}
 };
 const identity=(id:string)=>{const contract=services.contract.view(id),plan=services.planning.view(id),payload=plan.draft?.payload??(plan.accepted?{plan:plan.accepted.plan.payload,evaluationContract:plan.accepted.evaluation.payload}:null);if(!payload||!contract.accepted||plan.draftStale||contract.acceptedStale)return null;return 'spec-'+createHash('sha256').update(canonicalContractJson({missionId:id,contractHash:contract.accepted.contractHash,content:planningContentIdentity(payload),evaluatorHash:evaluatorBundle().hash})).digest('hex');};
 const decisions=(id:string):MissionDecision[]=>db.prepare('SELECT kind,created_at,spec_id,run_id FROM mission_decisions WHERE mission_id=? ORDER BY sequence').all(id).map(r=>({kind:r.kind as MissionDecision['kind'],createdAt:String(r.created_at),specId:r.spec_id as string|null,runId:r.run_id as string|null}));
 const view=(id:string):SpecView=>{
  ensure(id);const stored=row(id),outcome=services.outcomes.view(id),contract=services.contract.view(id),specId=outcome?stored?.spec_id??null:identity(id),events=decisions(id),accepted=!!specId&&stored?.spec_id===specId&&events.some(e=>e.kind==='APPROVE_SPEC'&&e.specId===specId);
  const verification=services.verification.view(id),run=verification.runs[0];let phase=outcome?.state??stored?.status??'NEEDS_YOU';let reason=stored?.error??(!stored?'This older Mission needs Spec preparation.':null);
  const visibleClaims=claimsFor(id);if(!outcome&&phase==='SPEC_REVIEW'&&(!visibleClaims.length||visibleClaims.some(c=>!c.admitted))){phase='NEEDS_YOU';reason='Protected oracle admission failed. Inspect the rejected BASE result before preparing a fresh proposal.';}
  if(!outcome&&accepted&&phase==='CHECKS_PASSED'&&(!verification.current||run?.status!=='PASSED')){phase='NEEDS_YOU';reason=verification.reason??'Passed checks are no longer current.';}
  if(!outcome&&stored&&stored.spec_id&&events.some(e=>e.kind==='APPROVE_SPEC'&&e.specId===stored.spec_id)&&specId!==stored.spec_id&&phase!=='PREPARING'&&phase!=='NEEDS_YOU'){phase='NEEDS_YOU';reason='The accepted Spec or protected evaluator changed. Prepare and review current checks.';}
  if(!outcome&&(pendingLand(id)||recordedTerminal(id))){phase='NEEDS_YOU';reason=pendingLand(id)?'A recorded Land request needs reconciliation. Retry only the original recorded run and exact journaled branch.':'The recorded terminal request needs retry. Retry preserves the original decision and run; no new execution will start.';}
  return {missionId:id,phase,specId,accepted,goal:contract.accepted?.payload.goal.text??contract.draft?.payload?.goal.text??null,nonGoals:(contract.accepted?.payload.nonGoals??contract.draft?.payload?.nonGoals??[]).map(x=>x.text),claims:visibleClaims,reason,runId:pendingLandRun(id)??run?.id??null,landing:outcome?.state==='LANDED'&&outcome.branch&&outcome.commit?{branch:outcome.branch,commit:outcome.commit}:null,decisionEvents:events};
 };
 const prepare=(id:string):Promise<void>=>{
  ensure(id);if(services.outcomes.view(id)||pendingLand(id)||recordedTerminal(id))throw new SpecError('MISSION_ENDED','That Mission has ended.');const existing=preparing.get(id);if(existing)return existing;set(id,'PREPARING');
  const job=preparation.then(async()=>{if(closed||recordedTerminal(id))return;try{
   if(!services.context.list(id).latest)await services.context.capture(id);if(recordedTerminal(id))return;
   let analysis=services.analysis.view(id);if(!analysis.analysis||analysis.stale||analysis.analysis.status!=='SUCCEEDED')analysis=await services.analysis.analyze(id);
   if(recordedTerminal(id))return;
   if(analysis.questions.some(q=>!q.answer)){set(id,'NEEDS_CLARIFICATION');return;}
   let contract=services.contract.view(id);if(!contract.current){contract=await services.contract.compile(id);if(!contract.draft)throw new SpecError('SPEC_PREPARATION_FAILED','Contract generation returned no draft.');services.contract.accept(contract.draft.id);}
   if(recordedTerminal(id))return;const planning=await services.planning.compile(id);if(recordedTerminal(id))return;if(!planning.draft?.payload)throw new SpecError('SPEC_PREPARATION_FAILED','Planning returned no candidate checks.');
   if(planning.draft.payload.plan.verticalSlices.length!==1)throw new SpecError('SPEC_SLICE_COUNT','A normal Mission requires exactly one Vertical Slice.');
   const specId=identity(id);if(!specId)throw new SpecError('SPEC_STALE','Generated Spec is no longer current.');const claims=claimsFor(id);if(!claims.length||claims.some(c=>!c.admitted)){const rejected=planning.draft.payload.evaluationContract.claims.filter(c=>c.oracle?.admission!=='ADMITTED');set(id,'NEEDS_YOU','Oracle admission rejected: '+rejected.map(c=>c.id+': '+(c.oracle?.reason??'Missing protected admission witness')).join('; ').slice(0,1800),specId);return;}set(id,'SPEC_REVIEW',null,specId);
  }catch(error){exception(id,error);}}).finally(()=>{preparing.delete(id);});preparation=job.catch(()=>{});preparing.set(id,job);return job;
 };
 const approve=(id:string,specId:string):SpecView=>{
  const before=view(id);if(services.outcomes.view(id)||pendingLand(id)||recordedTerminal(id))throw new SpecError('MISSION_ENDED','Landing or terminal state prevents new approvals.');if(!specId||before.specId!==specId)throw new SpecError('STALE_SPEC','Review the exact current Spec.');if(before.accepted)return before;if(before.phase!=='SPEC_REVIEW'||!before.claims.length||before.claims.some(c=>!c.admitted))throw new SpecError('ORACLE_NOT_ADMITTED','All acceptance checks must have genuine red-on-base admission.');
  const draft=services.planning.view(id).draft;if(!draft)throw new SpecError('SPEC_NOT_FOUND','Spec draft is unavailable.');services.planning.accept(draft.id);
  db.exec('BEGIN IMMEDIATE');try{db.prepare("INSERT INTO mission_decisions(mission_id,kind,spec_id,run_id,created_at) VALUES(?,'APPROVE_SPEC',?,NULL,?)").run(id,specId,new Date().toISOString());set(id,'QUEUED',null,specId);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}void startBuild(id);return view(id);
 };
 async function startBuild(id:string){if(advancing.has(id)||closed||recordedTerminal(id))return;advancing.add(id);try{const state=services.build.view(id);if(!state.eligible&&db.prepare("SELECT id FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','CANCELLING') UNION ALL SELECT id FROM verification_runs WHERE status IN('CREATED','PREPARING','RUNNING') UNION ALL SELECT id FROM debug_sessions WHERE status IN('CREATED','DIAGNOSING','CORRECTING','VERIFYING') LIMIT 1").get()){set(id,'QUEUED','Waiting for the local execution slot.');return;}if(!state.eligible)throw new SpecError('BUILD_NEEDS_INSPECTION','The source or existing execution needs inspection before building.');const pair=services.planning.view(id).accepted;if(!pair||pair.plan.payload.verticalSlices.length!==1)throw new SpecError('SPEC_STALE','The accepted single-Slice Spec is unavailable.');await services.build.start(id,pair.plan.payload.verticalSlices[0]!.id);set(id,'BUILDING');}catch(error){exception(id,error);}finally{advancing.delete(id);}}
 async function advance(id:string){if(advancing.has(id)||preparing.has(id)||closed)return;const state=row(id);if(!state||!['BUILDING','VERIFYING','CORRECTING'].includes(state.status))return;advancing.add(id);
  try{
   if(identity(id)!==state.spec_id)throw new SpecError('SPEC_STALE','Accepted Spec changed while execution was running.');
   if(state.status==='BUILDING'){const build=services.build.view(id);if(build.attempt?.status==='CANDIDATE'){set(id,'VERIFYING');await services.verification.start(id);}else if(build.attempt&&!['CREATED','STARTING','RUNNING','FINALIZING','CANCELLING'].includes(build.attempt.status))throw new SpecError('BUILD_EXCEPTION',build.attempt.failureMessage??'Builder stopped before producing a Candidate.');}
   else if(state.status==='VERIFYING'){const verification=services.verification.view(id),run=verification.runs[0];if(!run)return;if(run.status==='PASSED'&&verification.current){set(id,'CHECKS_PASSED');return;}if(run.status==='FAILED'&&verification.current){const debugging=services.debug.view(id);if(!debugging.eligible)throw new SpecError('DEBUG_EXCEPTION',debugging.reason??'Protected failure requires inspection.');services.debug.start(id,run.id);set(id,'CORRECTING');}else if(!['CREATED','PREPARING','RUNNING'].includes(run.status))throw new SpecError('VERIFICATION_EXCEPTION',verification.reason??'Protected checks did not establish PASS.');}
   else{const debugging=services.debug.view(id),session=debugging.session;if(session?.status==='RESOLVED'){const verification=services.verification.view(id);if(!verification.current||verification.runs[0]?.status!=='PASSED')throw new SpecError('DEBUG_NOT_VERIFIED','Correction did not establish current protected PASS.');set(id,'CHECKS_PASSED');}else if(session&&!['CREATED','DIAGNOSING','CORRECTING','VERIFYING'].includes(session.status))throw new SpecError('DEBUG_EXCEPTION',session.message??'Correction requires human inspection.');}
  }catch(error){exception(id,error);}finally{advancing.delete(id);}
 }
 const tick=async()=>{if(ticking||closed)return;ticking=true;try{for(const r of db.prepare("SELECT mission_id FROM mission_workflows WHERE status IN('QUEUED','BUILDING','VERIFYING','CORRECTING')").all()){const id=String(r.mission_id);if(row(id)?.status==='QUEUED')await startBuild(id);else await advance(id);}}finally{ticking=false;}};
 const land=async(id:string,runId:string):Promise<SpecView>=>{
  ensure(id);const outcome=services.outcomes.view(id);if(outcome){if(outcome.state!=='LANDED'||outcome.runId!==runId)throw new SpecError('MISSION_ENDED','Retry the exact existing terminal outcome.');return reconcileTerminal(id);}
  if(pendingLand(id)){if(pendingLandRun(id)!==runId)throw new SpecError('LAND_RECONCILE_REQUIRED','Retry the original recorded Land run.');await reconcileLand(id);return view(id);}
  const request=recordedTerminal(id);if(request){if(request.kind!=='LAND'||request.run_id!==runId)throw new SpecError('TERMINAL_DECISION_CONFLICT','Retry the exact recorded terminal request.');try{await replayTerminalRequest(id);return view(id);}catch(error){exception(id,error);throw error;}}
  const state=view(id);if(state.phase!=='CHECKS_PASSED'||state.runId!==runId||!state.accepted||!state.specId)throw new SpecError('CHECKS_NOT_CURRENT','Land requires current protected PASS for the approved Spec.');
  terminalDecision(id,'LAND',state.specId,runId);
  try{await services.outcomes.land(id,runId);set(id,'LANDED');return view(id);}catch(error){exception(id,error);throw error;}
 };
 const abandon=async(id:string):Promise<SpecView>=>{
  ensure(id);const outcome=services.outcomes.view(id);if(outcome){if(outcome.state!=='ABANDONED')throw new SpecError('MISSION_ENDED','Mission is already landed.');return reconcileTerminal(id);}
  if(pendingLand(id))throw new SpecError('LAND_RECONCILE_REQUIRED','The pending Land request prevents another terminal decision.');
  const request=recordedTerminal(id);if(request){if(request.kind!=='ABANDON')throw new SpecError('TERMINAL_DECISION_CONFLICT','Retry the exact recorded terminal request.');try{await replayTerminalRequest(id);return view(id);}catch(error){exception(id,error);throw error;}}
  const state=view(id);terminalDecision(id,'ABANDON',state.specId,state.runId);
  set(id,'NEEDS_YOU','Abandon requested; waiting for owned execution cleanup.',state.specId);
  services.analysis.interrupt(id);services.contract.interrupt(id);services.planning.interrupt(id);
  try{
   const debugging=services.debug.view(id).session;if(debugging&&['CREATED','DIAGNOSING','CORRECTING','VERIFYING'].includes(debugging.status))await services.debug.stop(debugging.id);
   const build=services.build.view(id);if(build.attempt&&['CREATED','STARTING','RUNNING','FINALIZING','CANCELLING'].includes(build.attempt.status)){await services.build.cancel(build.attempt.id);await services.build.waitForExit(build.attempt.id);}
   for(const run of services.verification.view(id).runs)if(['CREATED','PREPARING','RUNNING'].includes(run.status))await services.verification.stop(run.id);
   await preparing.get(id);await services.outcomes.abandon(id);set(id,'ABANDONED',null,state.specId);return view(id);
  }catch{set(id,'NEEDS_YOU','Abandon is recorded; owned cleanup requires reconciliation.',state.specId);return view(id);}

 };
 const retry=(id:string)=>{ensure(id);if(services.outcomes.view(id)){reconcileTerminal(id);return Promise.resolve();}if(recordedTerminal(id))return replayTerminalRequest(id).catch(error=>{exception(id,error);throw error;});if(pendingLand(id))return reconcileLand(id).catch(error=>{exception(id,error);throw error;});const state=view(id);if(state.phase!=='NEEDS_YOU')throw new SpecError('RETRY_NOT_NEEDED','This Mission has no exception to retry.');if(!state.accepted)return prepare(id);const built=services.build.view(id);if(built.current&&built.candidate){set(id,'VERIFYING');return services.verification.start(id).then(()=>{}).catch(error=>exception(id,error));}set(id,'QUEUED');void startBuild(id);return Promise.resolve();};
 const attention=():SpecAttention[]=>db.prepare('SELECT w.mission_id,m.project_id,p.display_name,m.original_intent FROM mission_workflows w JOIN missions m ON m.id=w.mission_id JOIN projects p ON p.id=m.project_id').all().flatMap<SpecAttention>(r=>{const state=view(String(r.mission_id)),common={missionId:String(r.mission_id),projectId:String(r.project_id),projectName:String(r.display_name),originalIntent:String(r.original_intent)};if(state.phase==='SPEC_REVIEW'&&state.specId)return [{...common,kind:'spec_review' as const,specId:state.specId,claims:state.claims.length}];if(state.phase==='CHECKS_PASSED'&&state.runId)return [{...common,kind:'mission_decision' as const,runId:state.runId}];if(state.phase==='NEEDS_YOU')return [{...common,kind:'workflow_exception' as const,reason:state.reason??'Inspect the recorded exception.'}];return [];});
 const recover=()=>{db.prepare("UPDATE mission_workflows SET status='NEEDS_YOU',error='Coordinator restarted. Inspect recovered execution before retrying.',updated_at=? WHERE status IN('PREPARING','QUEUED','BUILDING','VERIFYING','CORRECTING')").run(new Date().toISOString());timer=setInterval(()=>{void tick().catch(error=>logger({event:'workflow.advance_failed',message:error instanceof SpecError?error.message:'Unable to advance the workflow.'}));},250);timer.unref();};
 const close=async()=>{closed=true;clearInterval(timer);await preparation;while(advancing.size||ticking)await new Promise(r=>setTimeout(r,10));};
 return {view,prepare,approve,land,abandon,retry,attention,recover,close,tick};
}
