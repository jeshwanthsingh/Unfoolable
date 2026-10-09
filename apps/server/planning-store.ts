import {acceptedPlanningRow,draftAccepted,migrateContentIdentity,planningContentIdentity} from './content-identity.ts';
import {createHash,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {DatabaseSync} from 'node:sqlite';
import {PLANNING_LIMITS} from '../../packages/shared/planning.ts';
import type {PlanningInput,PlanningDraft,PlanningPayload,PlanningEdit,PlanningCoverage,PlanRevision,EvaluationRevision,PlanningPair,PlanningView,PlanningAttentionItem} from '../../packages/shared/planning.ts';
import {draftMissionPlan} from './planning-drafter.ts';
import {prepareNativeEvaluation,readOracle,evaluationSignature} from './oracle-author.ts';
import {buildPlanningInput} from './planning-input.ts';
import {validatePlanningPayload} from './planning-validation.ts';
import {PlanningError} from './planning-errors.ts';
import {canonicalContractJson,acceptedContentCanonical,boundContentId} from './contract-store.ts';
import {contractPhase} from './contract-phase.ts';
import {planningPhase,currentPlanningInputHash,COMPLETE_PLANNING_PAIR} from './planning-phase.ts';
import type {Logger} from './log.ts';
export type PlanningDrafter=(input:PlanningInput,signal:AbortSignal,onStarted?:()=>void)=>Promise<{output:unknown;toolVersion:string;elapsedMs:number}>;
type Row=Record<string,string|number|null>;
const parse=(r:Row,key:string)=>JSON.parse(String(r[key]));
const boundInputHash=(input:PlanningInput)=>createHash('sha256').update(canonicalContractJson(input)).digest('hex');
const draftRecord=(r:Row):PlanningDraft=>({id:String(r.id),missionId:String(r.mission_id),parentDraftId:r.parent_draft_id as string|null,origin:r.origin as PlanningDraft['origin'],status:r.status as PlanningDraft['status'],input:parse(r,'input_json'),inputHash:String(r.input_hash),payload:r.payload_json===null?null:parse(r,'payload_json'),coverage:r.coverage_json===null?null:parse(r,'coverage_json'),userEdits:parse(r,'user_edits_json'),promptVersion:String(r.prompt_version),toolVersion:r.tool_version as string|null,elapsedMs:r.elapsed_ms as number|null,createdAt:String(r.created_at),completedAt:r.completed_at as string|null,error:r.error as string|null});
const planRecord=(r:Row):PlanRevision=>({id:String(r.id),pairId:String(r.pair_id),missionId:String(r.mission_id),revision:Number(r.revision),draftId:String(r.draft_id),contractRevisionId:String(r.contract_revision_id),inputHash:String(r.input_hash),payload:parse(r,'payload_json'),coverage:parse(r,'coverage_json'),userEdits:parse(r,'user_edits_json'),planHash:String(r.plan_hash),canonical:String(r.canonical),acceptedAt:String(r.accepted_at)});
const evaluationRecord=(r:Row):EvaluationRevision=>({id:String(r.id),pairId:String(r.pair_id),missionId:String(r.mission_id),revision:Number(r.revision),draftId:String(r.draft_id),contractRevisionId:String(r.contract_revision_id),inputHash:String(r.input_hash),payload:parse(r,'payload_json'),evaluationHash:String(r.evaluation_hash),canonical:String(r.canonical),acceptedAt:String(r.accepted_at)});
export function createPlanningStore(db:DatabaseSync,logger:Logger,drafter:PlanningDrafter,options:{dataDir?:string;prepareOracle?:typeof prepareNativeEvaluation}={}){
 migrateContentIdentity(db);
 const native=options.prepareOracle??(drafter===draftMissionPlan?prepareNativeEvaluation:null);
 const trusted=(payload:unknown,input:PlanningInput)=>validatePlanningPayload(payload,input,{allowOracleReferences:true});
 const checkOracles=(payload:PlanningPayload)=>{
  const present=payload.evaluationContract.claims.filter(c=>c.oracle);
  if(!present.length&&!native)return;
  if(present.length!==payload.evaluationContract.claims.length)throw new PlanningError('ORACLE_REQUIRED','Every Evaluation claim needs an admitted protected native test.',409);
  const signature=evaluationSignature(payload);
  for(const claim of present){const ref=claim.oracle!;if(ref.admission!=='ADMITTED')throw new PlanningError('ORACLE_REJECTED',ref.reason??'Protected native test did not pass BASE admission.',409);
   try{const manifest=readOracle(ref);if(manifest.evaluationSignature!==signature||manifest.tests.length!==present.length||manifest.tests.some(t=>!present.some(c=>c.id===t.claimId)))throw Error('Evaluation changed');}
   catch{throw new PlanningError('STALE_ORACLE','Protected test content or Evaluation binding changed. Compile a fresh planning draft.',409);}
  }
 };
 const freezeOracles=(before:PlanningPayload,after:PlanningPayload)=>{
  if(before.evaluationContract.claims.some((c,i)=>canonicalContractJson(c.oracle??null)!==canonicalContractJson(after.evaluationContract.claims[i]?.oracle??null)))throw new PlanningError('IMMUTABLE_ORACLE','Protected test references cannot be edited, removed, or supplied by the reviewer.',409);
  if(before.evaluationContract.claims.some(c=>c.oracle)&&evaluationSignature(before)!==evaluationSignature(after))throw new PlanningError('STALE_ORACLE','Planning content changed after protected test authoring. Compile a fresh planning draft.',409);
 };
 let closed=false,active:{id:string;controller:AbortController}|null=null;
 db.prepare("UPDATE planning_drafts SET status='INTERRUPTED',completed_at=?,error=? WHERE status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Planning was interrupted when the coordinator stopped.');
 const ensureOpen=()=>{if(closed)throw new PlanningError('PLANNING_INTERRUPTED','The planning coordinator has stopped.',409);};
 const latestDraft=(missionId:string)=>{const row=db.prepare("SELECT * FROM planning_drafts WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId) as Row|undefined;return row?draftRecord(row):null;};
 const pair=(missionId:string,pairId:string):PlanningPair=>{
  ensureOpen();const row=db.prepare('SELECT p.* '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? AND p.pair_id=?').get(missionId,pairId) as Row|undefined;
  if(!row)throw new PlanningError('PLAN_PAIR_NOT_FOUND','That complete accepted plan pair could not be found.',404);
  const evaluation=db.prepare('SELECT * FROM evaluation_contract_revisions WHERE pair_id=?').get(pairId) as Row;
  const input=db.prepare('SELECT input_json FROM planning_drafts WHERE id=?').get(String(row.draft_id)) as Row;
  return {plan:planRecord(row),evaluation:evaluationRecord(evaluation),input:parse(input,'input_json')};
 };
 const latestPair=(missionId:string)=>{const row=acceptedPlanningRow(db,missionId);return row?pair(missionId,String(row.pair_id)):null;};
 const basePhase=(missionId:string)=>{
  const analysis=db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
  const pending=analysis?Number(db.prepare('SELECT count(*) AS n FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? AND a.question_id IS NULL').get(analysis.id!)?.n):0;
  return contractPhase(db,missionId,analysis?(pending?'NEEDS_CLARIFICATION':'CLARIFIED'):'DRAFT');
 };
 const view=(missionId:string):PlanningView=>{
  ensureOpen();if(!db.prepare('SELECT id FROM missions WHERE id=?').get(missionId))throw new PlanningError('MISSION_NOT_FOUND','That mission could not be found.',404);
  const draft=latestDraft(missionId),accepted=latestPair(missionId),row=db.prepare('SELECT * FROM planning_drafts WHERE mission_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(missionId) as Row|undefined;
  const hash=currentPlanningInputHash(db,missionId),draftStale=!!draft&&(hash!==draft.inputHash||boundInputHash(draft.input)!==draft.inputHash),acceptedStale=!!accepted&&(hash!==accepted.plan.inputHash||boundInputHash(accepted.input)!==accepted.plan.inputHash);
  const history=db.prepare('SELECT p.pair_id,p.revision,p.plan_hash,e.evaluation_hash,p.accepted_at '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? ORDER BY p.revision DESC').all(missionId).map(r=>({pairId:String(r.pair_id),revision:Number(r.revision),planHash:String(r.plan_hash),evaluationHash:String(r.evaluation_hash),acceptedAt:String(r.accepted_at)}));
  const base=basePhase(missionId);
  return {draft,operation:row?draftRecord(row):null,accepted,history,current:!!accepted&&!acceptedStale&&base==='CONTRACT_READY',draftStale,acceptedStale,eligible:hash!==null&&base==='CONTRACT_READY',phase:planningPhase(db,missionId,base)};
 };
 const getDraft=(id:string)=>{ensureOpen();const row=db.prepare("SELECT * FROM planning_drafts WHERE id=? AND status='SUCCEEDED'").get(id) as Row|undefined;if(!row)throw new PlanningError('PLAN_DRAFT_NOT_FOUND','That successful planning draft could not be found.',404);return draftRecord(row);};
 const ensureNotBusy=(missionId:string)=>{if(db.prepare("SELECT id FROM planning_drafts WHERE mission_id=? AND status IN('PREPARING','RUNNING')").get(missionId))throw new PlanningError('PLANNING_BUSY','A planning operation is in progress.',409);};
 const checkCurrent=(draft:PlanningDraft)=>{
  if(currentPlanningInputHash(db,draft.missionId)!==draft.inputHash||boundInputHash(draft.input)!==draft.inputHash||basePhase(draft.missionId)!=='CONTRACT_READY')throw new PlanningError('STALE_PLAN_DRAFT','Mission decisions, evidence or the accepted contract changed. Compile a fresh plan.',409);
  if(latestDraft(draft.missionId)?.id!==draft.id)throw new PlanningError('SUPERSEDED_PLAN_DRAFT','Review the latest planning candidate.',409);
  ensureNotBusy(draft.missionId);
 };
 const transact=<T>(fn:()=>T):T=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}};
 const candidate=(previous:PlanningDraft,payload:PlanningPayload,coverage:PlanningCoverage,userEdits:PlanningEdit[],origin:'USER_EDIT'|'REVISION')=>{
  const now=new Date().toISOString();db.prepare("INSERT INTO planning_drafts(id,mission_id,contract_revision_id,parent_draft_id,origin,status,input_json,input_hash,payload_json,coverage_json,user_edits_json,prompt_version,tool_version,created_at,completed_at) VALUES(?,?,?,?,?,'SUCCEEDED',?,?,?,?,?,?,?,?,?)").run(randomUUID(),previous.missionId,previous.input.contractRevisionId,previous.id,origin,JSON.stringify(previous.input),previous.inputHash,JSON.stringify(payload),JSON.stringify(coverage),JSON.stringify(userEdits),previous.promptVersion,previous.toolVersion,now,now);
 };
 const compile=async(missionId:string):Promise<PlanningView>=>{
  ensureOpen();if(active)throw new PlanningError('PLANNING_BUSY','Another planning operation is in progress.',409);ensureNotBusy(missionId);
  const before=performance.now(),built=buildPlanningInput(db,missionId);if(basePhase(missionId)!=='CONTRACT_READY')throw new PlanningError('CONTRACT_NOT_READY','Accept the current Mission Contract before planning.',409);logger({event:'planning.input_prepared',elapsedMs:performance.now()-before});
  const owned={id:randomUUID(),controller:new AbortController()};active=owned;
  try{
   db.prepare("INSERT INTO planning_drafts(id,mission_id,contract_revision_id,origin,status,input_json,input_hash,user_edits_json,prompt_version,created_at) VALUES(?,?,?,'CODEX','PREPARING',?,?,'[]',?,?)").run(owned.id,missionId,built.input.contractRevisionId,JSON.stringify(built.input),built.hash,built.input.promptVersion,new Date().toISOString());
   const output=await drafter(built.input,owned.controller.signal,()=>{ensureOpen();if(owned.controller.signal.aborted||Number(db.prepare("UPDATE planning_drafts SET status='RUNNING' WHERE id=? AND status='PREPARING'").run(owned.id).changes)!==1)throw new PlanningError('PLANNING_INTERRUPTED','Planning was interrupted.',409);});
   ensureOpen();if(owned.controller.signal.aborted)throw new PlanningError('PLANNING_INTERRUPTED','Planning was interrupted.',409);
   const validationStart=performance.now();let validated=validatePlanningPayload(output.output,built.input);
   if(native){if(!options.dataDir)throw new PlanningError('ORACLE_CONFIGURATION','Native Evaluation requires the coordinator data directory.',503);const enriched=await native(db,options.dataDir,missionId,built.input,validated.payload,owned.controller.signal);validated=trusted(enriched,built.input);}
   ensureOpen();if(owned.controller.signal.aborted)throw new PlanningError('PLANNING_INTERRUPTED','Planning was interrupted during protected test authoring.',409);
   if(currentPlanningInputHash(db,missionId)!==built.hash)throw new PlanningError('STALE_PLAN_DRAFT','Planning input changed during protected test authoring.',409);
   if(Number(db.prepare("UPDATE planning_drafts SET status='SUCCEEDED',payload_json=?,coverage_json=?,tool_version=?,elapsed_ms=?,completed_at=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(JSON.stringify(validated.payload),JSON.stringify(validated.coverage),output.toolVersion,output.elapsedMs,new Date().toISOString(),owned.id).changes)!==1)throw new PlanningError('PLANNING_INTERRUPTED','Planning was interrupted.',409);
   logger({event:'planning.completed',draftingMillis:output.elapsedMs,validationMillis:performance.now()-validationStart});return view(missionId);
  }catch(error){
   if(closed)throw new PlanningError('PLANNING_INTERRUPTED','Planning was interrupted when the coordinator stopped.',409);
   const failure=error instanceof PlanningError?error:new PlanningError('PLANNING_FAILED','Planning failed. Try again.',502);
   db.prepare("UPDATE planning_drafts SET status=?,completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(owned.controller.signal.aborted?'INTERRUPTED':'FAILED',new Date().toISOString(),failure.message,owned.id);logger({event:'planning.failed',code:failure.code});throw failure;
  }finally{if(active===owned)active=null;}
 };
 const identity=(payload:PlanningPayload)=>({slices:payload.plan.verticalSlices.map(s=>({id:s.id,order:s.order})),claims:payload.evaluationContract.claims.map(c=>c.id),crossCutting:payload.plan.crossCuttingRequirements.map(c=>c.requirementId),risks:payload.plan.riskHandling.map(r=>r.riskId)});
 const editableItems=(payload:PlanningPayload):[string,Record<string,unknown>][]=>[
  ...payload.plan.verticalSlices.map(s=>[s.id,s] as [string,Record<string,unknown>]),...payload.evaluationContract.claims.map(c=>[c.id,c] as [string,Record<string,unknown>]),...payload.plan.crossCuttingRequirements.map(c=>[c.requirementId,c] as [string,Record<string,unknown>]),...payload.plan.riskHandling.map(r=>[r.riskId,r] as [string,Record<string,unknown>])
 ];
 const edit=(draftId:string,body:{payload:unknown}):PlanningView=>{
  const draft=getDraft(draftId);if(!body||Object.keys(body).length!==1||!('payload'in body))throw new PlanningError('INVALID_PLAN_EDIT','Provide the complete planning payload only.',400);
  transact(()=>{
   checkCurrent(draft);if(db.prepare('SELECT id FROM plan_revisions WHERE draft_id=?').get(draft.id)||draftAccepted(db,'planning',draft.id))throw new PlanningError('PLAN_ALREADY_ACCEPTED','Choose Revise Plan before editing an accepted revision.',409);
   try{if(canonicalContractJson(identity(body.payload as PlanningPayload))!==canonicalContractJson(identity(draft.payload!)))throw Error('identity');}catch{throw new PlanningError('INVALID_PLAN_EDIT','Keep the slice and claim IDs, order, cross-cutting classifications and risk IDs unchanged.',400);}
   const validated=trusted(body.payload,draft.input);freezeOracles(draft.payload!,validated.payload);if(canonicalContractJson(validated.payload)===canonicalContractJson(draft.payload))return;
   let original=draft;while(original.parentDraftId)original=getDraft(original.parentDraftId);
   const baseline=new Map(editableItems(original.payload!)),edits:PlanningEdit[]=[];
   for(const [targetId,item] of editableItems(validated.payload)){
    const old=baseline.get(targetId)!;const fields=Object.keys(item).filter(field=>!['id','order','requirementId','riskId'].includes(field)&&canonicalContractJson(item[field])!==canonicalContractJson(old[field])).sort();
    if(fields.length)edits.push({targetId,kind:'USER_EDIT',fields});
   }
   candidate(draft,validated.payload,validated.coverage,edits,'USER_EDIT');
  });return view(draft.missionId);
 };
 const accept=(draftId:string):PlanningView=>{
  const draft=getDraft(draftId);checkOracles(trusted(draft.payload,draft.input).payload);transact(()=>{
   const existing=db.prepare('SELECT p.pair_id '+COMPLETE_PLANNING_PAIR+' WHERE p.draft_id=?').get(draft.id);
   if(existing||draftAccepted(db,'planning',draft.id)){if(currentPlanningInputHash(db,draft.missionId)!==draft.inputHash||boundInputHash(draft.input)!==draft.inputHash||basePhase(draft.missionId)!=='CONTRACT_READY')throw new PlanningError('STALE_PLAN_DRAFT','The accepted plan is bound to an older Mission Contract or decisions.',409);return;}
   checkCurrent(draft);const {payload,coverage}=trusted(draft.payload,draft.input);
   const identity=planningContentIdentity(payload),planCanonical=acceptedContentCanonical(identity.plan),evaluationCanonical=acceptedContentCanonical(identity.evaluationContract);
   const matching=(db.prepare('SELECT p.* '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? AND p.input_hash=? ORDER BY p.revision DESC').all(draft.missionId,draft.inputHash)).find(row=>{const e=db.prepare('SELECT payload_json FROM evaluation_contract_revisions WHERE pair_id=?').get(row.pair_id!)!;const old=planningContentIdentity({plan:JSON.parse(String(row.payload_json)),evaluationContract:JSON.parse(String(e.payload_json))});return acceptedContentCanonical(old.plan)===planCanonical&&acceptedContentCanonical(old.evaluationContract)===evaluationCanonical;});
   if(matching){db.prepare('INSERT INTO planning_acceptances VALUES(?,?,?,?)').run(draft.id,draft.missionId,matching.pair_id!,new Date().toISOString());return;}
   if([planCanonical,evaluationCanonical].some(c=>Buffer.byteLength(c)>PLANNING_LIMITS.canonicalBytes))throw new PlanningError('PLAN_CANONICAL_LIMIT','An accepted planning document exceeds its size bound.',422);
   const revision=Number(db.prepare('SELECT COALESCE(MAX(revision),0)+1 AS n FROM plan_revisions WHERE mission_id=?').get(draft.missionId)?.n),pairId=boundContentId('pair',draft.missionId,createHash('sha256').update(planCanonical+evaluationCanonical).digest('hex'),draft.inputHash),now=new Date().toISOString(),hash=(canonical:string)=>createHash('sha256').update(canonical).digest('hex');
   db.prepare('INSERT INTO plan_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(boundContentId('plan',draft.missionId,hash(planCanonical),pairId),pairId,draft.missionId,revision,draft.id,draft.input.contractRevisionId,draft.inputHash,JSON.stringify(payload.plan),JSON.stringify(coverage),JSON.stringify(draft.userEdits),hash(planCanonical),planCanonical,now);
   db.prepare('INSERT INTO evaluation_contract_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(boundContentId('evaluation',draft.missionId,hash(evaluationCanonical),pairId),pairId,draft.missionId,revision,draft.id,draft.input.contractRevisionId,draft.inputHash,JSON.stringify(payload.evaluationContract),hash(evaluationCanonical),evaluationCanonical,now);
   db.prepare('INSERT INTO planning_acceptances VALUES(?,?,?,?)').run(draft.id,draft.missionId,pairId,now);
  });return view(draft.missionId);
 };
 const revise=(missionId:string,pairId:string):PlanningView=>{
  ensureOpen();transact(()=>{const accepted=latestPair(missionId);if(!accepted||accepted.plan.pairId!==pairId)throw new PlanningError('PLAN_PAIR_NOT_FOUND','Choose the latest accepted plan pair.',409);const draft=getDraft(accepted.plan.draftId);checkCurrent(draft);const validated=trusted(draft.payload,draft.input);candidate(draft,validated.payload,validated.coverage,draft.userEdits,'REVISION');});return view(missionId);
 };
 const attention=():PlanningAttentionItem[]=>{
  ensureOpen();const items:PlanningAttentionItem[]=[];
  for(const row of db.prepare('SELECT m.id,p.id AS project_id,p.display_name,m.original_intent FROM missions m JOIN projects p ON p.id=m.project_id').all()){
   const state=view(String(row.id));if(state.phase!=='PLAN_REVIEW'||!state.draft||state.draftStale)continue;
   items.push({kind:'plan_review',draftId:state.draft.id,missionId:String(row.id),projectId:String(row.project_id),projectName:String(row.display_name),originalIntent:String(row.original_intent),slices:state.draft.payload!.plan.verticalSlices.length,claims:state.draft.payload!.evaluationContract.claims.length});
  }return items;
 };
 const interrupt=(missionId:string)=>{if(active&&db.prepare('SELECT mission_id FROM planning_drafts WHERE id=?').get(active.id)?.mission_id===missionId)active.controller.abort();};
 const close=()=>{if(closed)return;if(active){active.controller.abort();db.prepare("UPDATE planning_drafts SET status='INTERRUPTED',completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Planning was interrupted when the coordinator stopped.',active.id);}closed=true;};
 return {view,compile,edit,accept,revise,pair,attention,close,interrupt};
}
