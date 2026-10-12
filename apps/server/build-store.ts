import {requireHuman} from './human-context.ts';
import {acceptedPlanningRow} from './content-identity.ts';
import type {VerificationView} from '../../packages/shared/verification.ts';
import {diagnosisOwnershipUncertain} from './debug-ownership.ts';
import {admitCorrectionContext} from './correction-admission.ts';
import {createCorrectionWorkspace} from './correction-workspace.ts';
import type {CorrectionContext} from '../../packages/shared/debug.ts';
import {mkdirSync} from 'node:fs';
import {createPermissionStore} from './runtime-permissions.ts';
import {reconcileAttemptEffects} from './effect-reconciliation.ts';
import type {PermissionDispatch,EffectEvidence,PermissionDecision} from '../../packages/shared/permissions.ts';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {realpathSync} from 'node:fs';
import type {DatabaseSync} from 'node:sqlite';
import type {Logger} from './log.ts';
import {BuildError} from './build-errors.ts';
import {createBuildWorkspace,captureBuildCandidate,sourceIndexHash,safeBuildGit} from './build-workspace.ts';
import {admitBuild} from './build-admission.ts';
import {buildPhase,isCurrentBuildAttempt} from './build-phase.ts';
import {planningPhase,currentPlanningInputHash} from './planning-phase.ts';
import {contractPhase} from './contract-phase.ts';
import {BUILD_LIMITS} from '../../packages/shared/build.ts';
import type {BuildAttempt,BuildCandidate,BuildEvent,BuildView,BuilderDriver,RuntimeBinding,CleanupResult} from '../../packages/shared/build.ts';
type Row=Record<string,string|number|null>;
const parse=(row:Row,key:string)=>row[key]===null?null:JSON.parse(String(row[key]));
const record=(r:Row):BuildAttempt=>({id:String(r.id),missionId:String(r.mission_id),planRevisionId:String(r.plan_revision_id),evaluationRevisionId:String(r.evaluation_revision_id),sliceId:String(r.slice_id),generation:Number(r.generation),status:r.status as BuildAttempt['status'],workspacePath:String(r.workspace_path),baseHead:String(r.base_head),sourceRoot:String(r.source_root),input:parse(r,'input_json'),provider:'codex',providerVersion:String(r.provider_version),transportId:String(r.transport_id),transportValid:r.transport_valid===1,providerThreadId:r.provider_thread_id as string|null,providerTurnId:r.provider_turn_id as string|null,processes:parse(r,'processes_json'),cleanup:parse(r,'cleanup_json'),checks:parse(r,'checks_json'),summary:r.summary as string|null,logsTruncated:r.logs_truncated===1,startedAt:String(r.started_at),endedAt:r.ended_at as string|null,failureCode:r.failure_code as string|null,failureMessage:r.failure_message as string|null,timings:parse(r,'timings_json')});
const activeStatuses=['CREATED','STARTING','RUNNING','FINALIZING'];
/** Overrides are internal test seams; HTTP configuration never supplies them. */
type Hooks={admit?:typeof admitBuild;workspace?:typeof createBuildWorkspace;capture?:typeof captureBuildCandidate;sourceFence?:(attempt:BuildAttempt,indexHash:string)=>Promise<boolean>;current?:(db:DatabaseSync,missionId:string,row:Row)=>boolean};
export function createBuildStore(db:DatabaseSync,config:{dataDir:string;projectRoots:readonly string[]},logger:Logger,driver:BuilderDriver,hooks:Hooks={}) {
 const dataDir=realpathSync(config.dataDir);
 let closed=false,recovered=false,recovering:Promise<void>|null=null;
 let owned:{id:string;controller:AbortController;task:Promise<void>}|null=null;let correctionView:((missionId:string)=>VerificationView)|null=null;
 const correctionAdmission=(missionId:string,sliceId:string,context:CorrectionContext)=>{if(!correctionView)throw new BuildError('CORRECTION_VERIFIER_UNBOUND','Correction requires the existing protected Verifier.');return admitCorrectionContext(db,correctionView(missionId),missionId,sliceId,context);};
 const dispatchers=new Map<string,{binding:RuntimeBinding;write:(d:PermissionDispatch)=>Promise<void>}>();
 const cancelled=(id:string)=>!!db.prepare('SELECT cancel_requested_at FROM build_runtime_state WHERE attempt_id=?').get(id)?.cancel_requested_at;
 const current=hooks.current??isCurrentBuildAttempt;
 const get=(id:string)=>db.prepare('SELECT * FROM build_attempts WHERE id=?').get(id) as Row|undefined;
 const transaction=<T>(fn:()=>T):T=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const verificationBusy=()=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='verification_runs'").get()&&!!db.prepare("SELECT id FROM verification_runs WHERE status IN('CREATED','PREPARING','RUNNING') OR json_extract(run_json,'$.cleanup.verified') IS NOT 1 OR json_extract(run_json,'$.cleanup.ambiguous') IS NOT 0 OR json_array_length(run_json,'$.cleanup.remaining') IS NOT 0 OR json_extract(run_json,'$.environment.launchPending')=1 LIMIT 1").get();
 const debuggingBusy=(context?:CorrectionContext)=>{if(diagnosisOwnershipUncertain(db))return true;if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debug_sessions'").get())return false;const active=db.prepare("SELECT id,status FROM debug_sessions WHERE status IN('CREATED','DIAGNOSING','CORRECTING','VERIFYING') LIMIT 1").get();return !!active&&(!context||active.id!==context.sessionId||active.status!=='CORRECTING');};
 const ensure=()=>{if(closed)throw new BuildError('BUILD_INTERRUPTED','The Builder coordinator has stopped.');};
 const phase=(missionId:string)=>{const analysis=db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);const pending=analysis?Number(db.prepare('SELECT count(*) AS n FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? AND a.question_id IS NULL').get(analysis.id!)?.n):0;return planningPhase(db,missionId,contractPhase(db,missionId,analysis?(pending?'NEEDS_CLARIFICATION':'CLARIFIED'):'DRAFT'));};
 const view=(missionId:string,after=0):BuildView=>{
  ensure();if(!db.prepare('SELECT id FROM missions WHERE id=?').get(missionId))throw new BuildError('MISSION_NOT_FOUND','That mission could not be found.',404);
  const row=db.prepare('SELECT * FROM build_attempts WHERE mission_id=? ORDER BY generation DESC LIMIT 1').get(missionId) as Row|undefined;
  const runtime=row?db.prepare('SELECT * FROM build_runtime_state WHERE attempt_id=?').get(row.id!):null;
  const stored=row?record(row):null,attempt=stored&&runtime?.cancel_requested_at&&activeStatuses.includes(stored.status)?{...stored,status:'CANCELLING' as const}:stored,candidateRow=row?db.prepare('SELECT candidate_json FROM build_candidates WHERE attempt_id=?').get(row.id!):null;
  const events=db.prepare('SELECT e.* FROM build_events e JOIN build_attempts a ON a.id=e.attempt_id WHERE a.mission_id=? AND e.attempt_id=? AND e.sequence>? ORDER BY e.sequence LIMIT 100').all(missionId,row?.id??'',after).map(r=>({sequence:Number(r.sequence),attemptId:String(r.attempt_id),generation:Number(r.generation),transportId:String(r.transport_id),threadId:r.thread_id as string|null,turnId:r.turn_id as string|null,kind:String(r.kind),data:JSON.parse(String(r.data_json)),createdAt:String(r.created_at)} satisfies BuildEvent));
  const bound=!!row&&current(db,missionId,row),base=phase(missionId),busy=!!db.prepare("SELECT id FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED')").get();
  return {permissionHistory:row?permissions.history(missionId,String(row.id)):[],permissions:row?permissions.list(String(row.id)):[],effect:runtime?.effect_json?JSON.parse(String(runtime.effect_json)):null,cancelRequestedAt:runtime?.cancel_requested_at as string|null??null,attempt,candidate:candidateRow?JSON.parse(String(candidateRow.candidate_json)):null,events,nextSequence:events.at(-1)?.sequence??after,eventsTruncated:!!attempt?.logsTruncated,workerPresent:!!attempt&&(activeStatuses.includes(attempt.status)||attempt.status==='CANCELLING')&&attempt.processes.some(p=>{if(p.exitedAt!==null)return false;try{process.kill(p.pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code==='EPERM';}}),current:bound,eligible:base==='PLAN_READY'&&!busy&&!debuggingBusy()&&!verificationBusy()&&recovered&&!(bound&&attempt?.status==='CANDIDATE'),phase:buildPhase(db,missionId,base)};
 };
 const matches=(row:Row|undefined,b:RuntimeBinding)=>!!row&&!cancelled(String(row.id))&&row.transport_valid===1&&activeStatuses.includes(String(row.status))&&row.generation===b.generation&&row.transport_id===b.transportId&&row.provider_thread_id===b.threadId&&row.provider_turn_id===b.turnId&&current(db,String(row.mission_id),row);
 const truncate=(id:string)=>{
  const r=get(id);if(!r||!activeStatuses.includes(String(r.status))||r.logs_truncated===1)return;
  db.prepare('UPDATE build_attempts SET logs_truncated=1 WHERE id=?').run(id);
  db.prepare("INSERT INTO build_events(attempt_id,generation,transport_id,thread_id,turn_id,kind,data_json,created_at) VALUES(?,?,?,?,?,'logs.truncated','{}',?)").run(id,r.generation!,r.transport_id!,r.provider_thread_id??null,r.provider_turn_id??null,new Date().toISOString());
 };
 const event=(b:RuntimeBinding,kind:string,data:Record<string,unknown>):boolean=>{
  const row=get(b.attemptId);if(!matches(row,b)||!row)return false;
  const count=Number(db.prepare('SELECT count(*) AS n FROM build_events WHERE attempt_id=?').get(b.attemptId)?.n);
  const redact=(value:unknown):unknown=>typeof value==='string'?value.replace(/\b(?:sk-[A-Za-z0-9_-]+|(?:token|password|secret|api[_-]?key)\s*[=:]\s*[^\s,;]+)/gi,'[redacted]'):Array.isArray(value)?value.map(redact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/token|password|secret|api.?key/i.test(k)?'[redacted]':redact(v)])):value;
  let json:string;try{json=JSON.stringify(redact(data));}catch{return false;}
  if(count>=BUILD_LIMITS.events-1||Buffer.byteLength(json)>BUILD_LIMITS.eventBytes){truncate(b.attemptId);return true;}
  db.prepare('INSERT INTO build_events(attempt_id,generation,transport_id,thread_id,turn_id,kind,data_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(b.attemptId,b.generation,b.transportId,b.threadId,b.turnId,kind.slice(0,100),json!,new Date().toISOString());return true;
 };
 const lifecycle=(id:string,kind:string,data:Record<string,unknown>)=>{
  const row=get(id);if(!row||!activeStatuses.includes(String(row.status)))return;
  const count=Number(db.prepare('SELECT count(*) AS n FROM build_events WHERE attempt_id=?').get(id)?.n);
  const json=JSON.stringify(data);if(count>=BUILD_LIMITS.events-1||Buffer.byteLength(json)>BUILD_LIMITS.eventBytes){truncate(id);return;}
  db.prepare('INSERT INTO build_events(attempt_id,generation,transport_id,thread_id,turn_id,kind,data_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,row.generation!,row.transport_id!,row.provider_thread_id??null,row.provider_turn_id??null,kind,json,new Date().toISOString());
 };
 const permissions=createPermissionStore(db,{dataDir},{current:b=>matches(get(b.attemptId),b),event:(b,k,d)=>{event(b,k,d);},dispatch:async d=>{const channel=dispatchers.get(d.binding.attemptId);if(!channel||JSON.stringify(channel.binding)!==JSON.stringify(d.binding)||!matches(get(d.binding.attemptId),d.binding)||owned?.controller.signal.aborted)throw new BuildError('STALE_PERMISSION_REQUEST','Permission transport is no longer current.');await channel.write(d);}});
 const saveEffect=(id:string,e:EffectEvidence)=>db.prepare('UPDATE build_runtime_state SET effect_state=?,effect_json=? WHERE attempt_id=?').run(e.state,JSON.stringify(e),id);
 const unknownEffect=(e:EffectEvidence,reason:string):EffectEvidence=>({...e,state:'UNKNOWN',reason});
 const uncertainAllow=(id:string)=>permissions.list(id).some(p=>p.decision==='ALLOW');
 const observe=async(id:string)=>{const e=await reconcileAttemptEffects(db,id);saveEffect(id,e);return e;};
 const attention=()=>[...permissions.attention(),...db.prepare("SELECT b.id,b.mission_id,m.project_id,m.original_intent,p.display_name,b.failure_message FROM build_attempts b JOIN missions m ON m.id=b.mission_id JOIN projects p ON p.id=m.project_id WHERE b.status='RECONCILE_REQUIRED' ORDER BY b.started_at").all().map(row=>({kind:'reconciliation' as const,attemptId:String(row.id),missionId:String(row.mission_id),projectId:String(row.project_id),projectName:String(row.display_name),originalIntent:String(row.original_intent),reason:String(row.failure_message??'Previous execution or effects could not be safely reconciled. New Builds are blocked.')}))];
 const safe=(c:CleanupResult)=>c.verified&&!c.ambiguous&&c.remaining.length===0;
 const sourceFence=hooks.sourceFence??(async(a:BuildAttempt,index:string)=>{const head=await safeBuildGit(a.sourceRoot,['rev-parse','HEAD']);return head.toString('utf8').trim()===a.baseHead&&await sourceIndexHash(a.sourceRoot)===index;});
 const run=async(id:string,controller:AbortController)=>{
  let cleanup:CleanupResult|null=null;let timer:ReturnType<typeof setInterval>|null=null;let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},BUILD_LIMITS.timeoutMs);
  try{
   let row=get(id)!;const attempt=record(row);
   const admission={input:attempt.input,sourceRoot:attempt.sourceRoot,baseHead:attempt.baseHead,gitCommonDir:String(row.git_common_dir),sourceIndexHash:String(row.source_index_hash),admissionMs:attempt.timings.admissionMs};
   if(controller.signal.aborted)throw new BuildError('BUILD_INTERRUPTED','Build interrupted.');
   const parentId=attempt.input.correction?.parentCandidateId,parentRow=parentId?db.prepare('SELECT candidate_json FROM build_candidates WHERE id=?').get(parentId):null;
   const workspace=parentRow?await createCorrectionWorkspace(admission,id,dataDir,JSON.parse(String(parentRow.candidate_json))):await (hooks.workspace??createBuildWorkspace)(admission,id,dataDir);
   if(controller.signal.aborted)throw new BuildError('BUILD_INTERRUPTED','Build interrupted.');
   db.prepare("UPDATE build_attempts SET status='STARTING',timings_json=? WHERE id=? AND status='CREATED'").run(JSON.stringify({...attempt.timings,worktreeMs:workspace.worktreeMs}),id);
   timer=setInterval(()=>{const r=get(id);if(r&&!current(db,attempt.missionId,r))controller.abort();},1000);
   mkdirSync(join(workspace.artifactDir,'effects'),{recursive:true,mode:0o700});
   const result=await driver.run({attemptId:id,generation:attempt.generation,transportId:attempt.transportId,workspace:workspace.workspacePath,artifactDir:workspace.artifactDir,dataDir:dataDir,sourceRoot:attempt.sourceRoot,gitCommonDir:workspace.gitCommonDir},attempt.input,controller.signal,{
    binding:b=>{const r=get(id);if(!r||r.transport_valid!==1||!activeStatuses.includes(String(r.status))||r.generation!==b.generation||r.transport_id!==b.transportId||b.attemptId!==id||!current(db,attempt.missionId,r))throw new BuildError('STALE_BUILD_BINDING','Builder binding is stale.');if((r.provider_thread_id!==null&&r.provider_thread_id!==b.threadId)||(r.provider_turn_id!==null&&r.provider_turn_id!==b.turnId))throw new BuildError('STALE_BUILD_BINDING','Builder thread or turn changed.');db.prepare("UPDATE build_attempts SET provider_thread_id=?,provider_turn_id=?,status=CASE WHEN ? IS NOT NULL THEN 'RUNNING' ELSE status END WHERE id=?").run(b.threadId,b.turnId,b.turnId,id);},
    processes:processes=>{if(processes.length>BUILD_LIMITS.processes)throw new BuildError('BUILD_PROCESS_LIMIT','Builder process inventory exceeded its safety bound.');const r=get(id);if(r&&r.transport_valid===1&&r.generation===attempt.generation&&r.transport_id===attempt.transportId&&activeStatuses.includes(String(r.status)))db.prepare('UPDATE build_attempts SET processes_json=? WHERE id=?').run(JSON.stringify(processes.slice(0,BUILD_LIMITS.processes)),id);},event,truncated:()=>truncate(id),permission:envelope=>permissions.request(envelope),permissionResolved:(b,p)=>permissions.resolved(b,p),control:(b,write)=>{if(!matches(get(id),b))throw new BuildError('STALE_BUILD_BINDING','Runtime control is stale.');dispatchers.set(id,{binding:{...b},write});}
   });
   cleanup=result.cleanup;row=get(id)!;
   if(permissions.unresolved(id))throw new BuildError('UNRESOLVED_RUNTIME_PERMISSION','Provider resolution is incomplete; Candidate cannot be captured.');
   if(!safe(cleanup))throw new BuildError('BUILD_RECONCILE_REQUIRED','Builder cleanup could not be verified.');
   if(controller.signal.aborted)throw new BuildError(timedOut?'BUILD_TIMEOUT':'BUILD_INTERRUPTED',timedOut?'Builder timed out.':'Build interrupted.');
   if(!matches(row,{attemptId:id,generation:attempt.generation,transportId:attempt.transportId,threadId:result.threadId,turnId:result.turnId}))throw new BuildError('STALE_BUILD_BINDING','Builder result is stale.');
   db.prepare("UPDATE build_attempts SET status='FINALIZING',processes_json=?,cleanup_json=?,checks_json=?,summary=?,timings_json=? WHERE id=?").run(JSON.stringify(record(row).processes.map(p=>({...p,exitedAt:p.exitedAt??new Date().toISOString()}))),JSON.stringify(cleanup),JSON.stringify(result.checks.slice(0,BUILD_LIMITS.commands)),result.summary.slice(0,BUILD_LIMITS.summary),JSON.stringify({...record(row).timings,startupMs:result.startupMs,builderMs:result.builderMs}),id);
   const effect=await observe(id);if(!effect.stable||effect.state==='UNKNOWN')throw new BuildError('BUILD_RECONCILE_REQUIRED','Observable effects could not be reconciled.');
   row=get(id)!;if(!current(db,attempt.missionId,row)||!await sourceFence(attempt,String(row.source_index_hash)))throw new BuildError('STALE_BUILD_INPUT','Build inputs or source repository changed.');
   const captured=await (hooks.capture??captureBuildCandidate)(record(row),dataDir);
   if(controller.signal.aborted||!current(db,attempt.missionId,get(id)!)||!await sourceFence(attempt,String(row.source_index_hash)))throw new BuildError('STALE_BUILD_INPUT','Build inputs or source repository changed.');
   transaction(()=>{const latest=get(id)!;if(permissions.unresolved(id)||cancelled(id)||latest.status!=='FINALIZING'||latest.transport_valid!==1||!current(db,attempt.missionId,latest))throw new BuildError('STALE_BUILD_BINDING','Build completion is stale.');const candidate:BuildCandidate={...captured.candidate,attemptId:id};if(attempt.input.correction)candidate.parentCandidateId=attempt.input.correction.parentCandidateId;
   db.prepare('INSERT INTO build_candidates VALUES(?,?,?,?)').run(candidate.id,id,JSON.stringify(candidate),candidate.createdAt);lifecycle(id,'candidate.captured',{candidateId:candidate.id,treeHash:candidate.treeHash,diffHash:candidate.diffHash});db.prepare("UPDATE build_attempts SET status='CANDIDATE',ended_at=?,timings_json=? WHERE id=?").run(new Date().toISOString(),JSON.stringify({...record(latest).timings,captureMs:captured.captureMs}),id);});
  }catch(error){
   const row=get(id);if(!row||!activeStatuses.includes(String(row.status)))return;
   permissions.invalidate(id);
   const evidence=error as Partial<import('../../packages/shared/build.ts').BuilderResult>;
   const timings=record(row).timings;
   db.prepare('UPDATE build_attempts SET checks_json=?,summary=?,timings_json=? WHERE id=?').run(JSON.stringify(Array.isArray(evidence.checks)?evidence.checks.slice(0,BUILD_LIMITS.commands):record(row).checks),typeof evidence.summary==='string'?evidence.summary.slice(0,BUILD_LIMITS.summary):row.summary??null,JSON.stringify({...timings,startupMs:typeof evidence.startupMs==='number'&&Number.isFinite(evidence.startupMs)?evidence.startupMs:timings.startupMs,builderMs:typeof evidence.builderMs==='number'&&Number.isFinite(evidence.builderMs)?evidence.builderMs:timings.builderMs}),id);
   cleanup=cleanup??(error as {cleanup?:CleanupResult}).cleanup??null;
   if(!cleanup){try{cleanup=await driver.reconcile(record(row).processes);}catch{cleanup={verified:false,ambiguous:true,remaining:record(row).processes,terminalCount:0,reason:'Cleanup verification failed.'};}}
   const code=error instanceof BuildError?error.code:controller.signal.aborted?(timedOut?'BUILD_TIMEOUT':'BUILD_INTERRUPTED'):'BUILD_FAILED';
   let effect=await observe(id);if(uncertainAllow(id)&&['BUILD_TRANSPORT_LOST','BUILD_PROTOCOL_INVALID','PERMISSION_DELIVERY_UNKNOWN'].includes(code)){effect=unknownEffect(effect,'An Allow may have reached the lost transport; its outcome is unknown.');saveEffect(id,effect);}
   const status=!safe(cleanup)||!effect.stable||effect.state==='UNKNOWN'||code==='UNRESOLVED_RUNTIME_PERMISSION'?'RECONCILE_REQUIRED':controller.signal.aborted||code==='BUILD_INTERRUPTED'||code==='BUILD_TIMEOUT'?'INTERRUPTED':'FAILED';
   transaction(()=>{lifecycle(id,status==='INTERRUPTED'?'attempt.interrupted':status==='RECONCILE_REQUIRED'?'attempt.reconcile_required':'attempt.failed',{code,status});
   db.prepare('UPDATE build_attempts SET status=?,transport_valid=0,cleanup_json=?,ended_at=?,failure_code=?,failure_message=? WHERE id=?').run(status,JSON.stringify(cleanup),new Date().toISOString(),code,error instanceof BuildError?error.message:'Builder failed.',id);});logger({event:'build.failed',code});
  }finally{clearTimeout(timeout);if(timer)clearInterval(timer);dispatchers.delete(id);if(owned?.id===id)owned=null;}
 };
 const recover=():Promise<void>=>{
  ensure();if(recovered&&!db.prepare("SELECT id FROM build_attempts WHERE status='RECONCILE_REQUIRED'").get())return Promise.resolve();if(recovering)return recovering;
  recovering=(async()=>{const rows=db.prepare("SELECT * FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED')").all() as Row[];
   for(const row of rows){permissions.invalidate(String(row.id));db.prepare("UPDATE build_attempts SET status='RECONCILE_REQUIRED',transport_valid=0,failure_code='BUILD_RESTARTED',failure_message='Coordinator restarted; cleanup requires reconciliation.' WHERE id=?").run(row.id!);}
   for(const row of rows){const reconciliationStarted=performance.now();let cleanup:CleanupResult;try{cleanup=record(row).processes.length===0&&row.status!=='CREATED'?{verified:false,ambiguous:true,remaining:[],terminalCount:0,reason:'A launched Attempt has no durable process inventory; an unrecorded spawn cannot be ruled out.'}:await driver.reconcile(record(row).processes);}catch{cleanup={verified:false,ambiguous:true,remaining:record(row).processes,terminalCount:0,reason:'Cleanup verification failed.'};}let effect=await observe(String(row.id));if(uncertainAllow(String(row.id))){effect=unknownEffect(effect,'Restart after a committed Allow cannot establish its completion. No response will be replayed.');saveEffect(String(row.id),effect);}db.prepare('UPDATE build_attempts SET status=?,cleanup_json=?,ended_at=? WHERE id=? AND status=\'RECONCILE_REQUIRED\'').run(safe(cleanup)&&effect.stable&&effect.state!=='UNKNOWN'?'INTERRUPTED':'RECONCILE_REQUIRED',JSON.stringify(cleanup),new Date().toISOString(),row.id!);db.prepare('UPDATE build_runtime_state SET reconcile_ms=? WHERE attempt_id=?').run(performance.now()-reconciliationStarted,row.id!);}
   recovered=true;
  })().finally(()=>{recovering=null;});return recovering;
 };
 const start=async(missionId:string,sliceId:string,correction?:CorrectionContext):Promise<BuildView>=>{
  const terminal=()=>!!db.prepare("SELECT sequence FROM mission_decisions WHERE mission_id=? AND kind IN('LAND','ABANDON')").get(missionId);if(terminal())throw new BuildError('MISSION_TERMINAL','Mission has a terminal decision.');
  if(debuggingBusy(correction))throw new BuildError('DEBUG_BUSY','The bounded Debug Session owns this execution slot.');
  ensure();if(verificationBusy())throw new BuildError('VERIFICATION_BUSY','Verification or verifier cleanup is active.');if(!recovered)throw new BuildError('BUILD_RECOVERY_PENDING','Builder startup reconciliation has not completed.');if(owned||db.prepare("SELECT id FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED')").get())throw new BuildError('BUILD_BUSY','Another build or cleanup reconciliation is active.');
  const latest=db.prepare('SELECT * FROM build_attempts WHERE mission_id=? ORDER BY generation DESC LIMIT 1').get(missionId) as Row|undefined;if(!correction&&latest?.status==='CANDIDATE'&&current(db,missionId,latest))throw new BuildError('CANDIDATE_EXISTS','The current Candidate awaits verification.');
  if(correction)correctionAdmission(missionId,sliceId,correction);
  const admission=await (hooks.admit??admitBuild)(db,missionId,sliceId,config.projectRoots,logger,await driver.version());ensure();if(correction){correctionAdmission(missionId,sliceId,correction);admission.input={...admission.input,correction:structuredClone(correction)};}
  const id=randomUUID(),transport=randomUUID();
  transaction(()=>{if(terminal())throw new BuildError('MISSION_TERMINAL','Mission ended during admission.');if(debuggingBusy(correction))throw new BuildError('DEBUG_BUSY','The bounded Debug Session owns this execution slot.');if(correction)correctionAdmission(missionId,sliceId,correction);if(verificationBusy())throw new BuildError('VERIFICATION_BUSY','Verification or verifier cleanup is active.');if(db.prepare("SELECT id FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED')").get())throw new BuildError('BUILD_BUSY','Another build is active.');const pair=acceptedPlanningRow(db,missionId);if(!pair||pair.id!==admission.input.planRevisionId||db.prepare('SELECT id FROM evaluation_contract_revisions WHERE pair_id=?').get(pair.pair_id!)?.id!==admission.input.evaluationRevisionId||pair.input_hash!==admission.input.planningInputHash||currentPlanningInputHash(db,missionId)!==admission.input.planningInputHash)throw new BuildError('STALE_BUILD_INPUT','The accepted planning input changed during admission.');const generation=Number(db.prepare('SELECT COALESCE(MAX(generation),0)+1 AS generation FROM build_attempts WHERE mission_id=?').get(missionId)?.generation);db.prepare("INSERT INTO build_attempts(id,mission_id,plan_revision_id,evaluation_revision_id,slice_id,generation,status,workspace_path,base_head,source_root,source_index_hash,git_common_dir,input_json,provider_version,transport_id,transport_valid,started_at,timings_json) VALUES(?,?,?,?,?,?,'CREATED',?,?,?,?,?,?,?,?,1,?,?)").run(id,missionId,admission.input.planRevisionId,admission.input.evaluationRevisionId,sliceId,generation,join(dataDir,'workspaces',id),admission.baseHead,admission.sourceRoot,admission.sourceIndexHash,admission.gitCommonDir,JSON.stringify(admission.input),'codex-cli 0.160.0',transport,new Date().toISOString(),JSON.stringify({admissionMs:admission.admissionMs,worktreeMs:null,startupMs:null,builderMs:null,captureMs:null}));db.prepare('INSERT INTO build_runtime_state(attempt_id) VALUES(?)').run(id);lifecycle(id,'attempt.created',{sliceId});});
  const controller=new AbortController();const task=Promise.resolve().then(()=>run(id,controller));owned={id,controller,task};return view(missionId);
 };
 const cancel=async(id:string)=>{ensure();const row=get(id);if(!row)throw new BuildError('ATTEMPT_NOT_FOUND','Build Attempt was not found.',404);if(cancelled(id))return view(String(row.mission_id));if(!activeStatuses.includes(String(row.status))||owned?.id!==id)throw new BuildError('BUILD_NOT_ACTIVE','This Attempt is no longer active.');transaction(()=>{db.prepare('UPDATE build_runtime_state SET cancel_requested_at=? WHERE attempt_id=?').run(new Date().toISOString(),id);permissions.invalidate(id);lifecycle(id,'attempt.cancel_requested',{});});owned.controller.abort();return view(String(row.mission_id));};
 const retry=async(id:string)=>{ensure();const row=get(id);if(!row||!['FAILED','INTERRUPTED'].includes(String(row.status)))throw new BuildError('RETRY_NOT_SAFE','Only a safely ended Attempt can be retried.');const latest=db.prepare('SELECT id FROM build_attempts WHERE mission_id=? ORDER BY generation DESC LIMIT 1').get(row.mission_id!);if(latest?.id!==id)throw new BuildError('STALE_BUILD_BINDING','Retry belongs to an older Attempt.');return start(String(row.mission_id),String(row.slice_id));};
 const decide=(id:string,decision:PermissionDecision,hash:string)=>{requireHuman(config.dataDir,{item:'permission:'+id,action:decision.toLowerCase()});return permissions.decide(id,decision,hash);};
 const stopAll=async()=>{if(owned){const current=owned;await cancel(current.id);await current.task;}};
 const close=async()=>{if(closed)return;closed=true;if(owned){const active=owned;active.controller.abort();await active.task;}if(recovering)await recovering;};
 return {bindCorrectionVerifier:(reader:(missionId:string)=>VerificationView)=>{if(correctionView||owned)throw new BuildError('CORRECTION_VERIFIER_BOUND','Verifier binding is fixed for this coordinator.');correctionView=reader;},view,start:(missionId:string,sliceId:string)=>start(missionId,sliceId),startCorrection:(missionId:string,sliceId:string,context:CorrectionContext)=>start(missionId,sliceId,context),close,stopAll,recover,event,cancel,waitForExit:async(id:string)=>{if(owned?.id===id)await owned.task;},retry,decide,attention};
}
