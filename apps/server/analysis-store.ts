import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {ANALYSIS_PROMPT_VERSION} from '../../packages/shared/analysis.ts';
import type {AnalysisView,MissionAnalysis,ClarificationQuestion,AttentionResponse,AnalysisPacket} from '../../packages/shared/analysis.ts';
import {getMission} from './missions.ts';
import {createContextStore} from './context-store.ts';
import {buildAnalysisPacket} from './analysis-packet.ts';
import {validateAnalysisResult} from './analysis-validation.ts';
import {missionAnalysisPhase} from './analysis-phase.ts';
import {AnalysisError} from './analysis-errors.ts';
import type {MissionAnalyzer} from './mission-analyzer.ts';
import type {Logger} from './log.ts';

type Row={id:string;mission_id:string;context_snapshot_id:string;base_head:string;status:MissionAnalysis['status'];packet_json:string|null;packet_hash:string|null;prompt_version:string;tool_version:string|null;result_json:string|null;packet_millis:number|null;analysis_millis:number|null;created_at:string;completed_at:string|null;error:string|null};
type QuestionRow={id:string;analysis_id:string;question:string;why_it_matters:string;decision_area:ClarificationQuestion['decisionArea'];options_json:string;evidence_ids_json:string;display_order:number;created_at:string;answer_text:string|null;updated_at:string|null};
const record=(r:Row):MissionAnalysis=>({id:r.id,missionId:r.mission_id,snapshotId:r.context_snapshot_id,baseHead:r.base_head,status:r.status,packet:r.packet_json===null?null:JSON.parse(r.packet_json),packetHash:r.packet_hash,promptVersion:r.prompt_version,toolVersion:r.tool_version,result:r.result_json===null?null:JSON.parse(r.result_json),packetMillis:r.packet_millis,analysisMillis:r.analysis_millis,createdAt:r.created_at,completedAt:r.completed_at,error:r.error});
const question=(r:QuestionRow):ClarificationQuestion=>({id:r.id,analysisId:r.analysis_id,question:r.question,whyItMatters:r.why_it_matters,decisionArea:r.decision_area,options:JSON.parse(r.options_json),evidenceIds:JSON.parse(r.evidence_ids_json),required:true,order:r.display_order,createdAt:r.created_at,answer:r.answer_text===null?null:{text:r.answer_text,updatedAt:r.updated_at!}});

export function createAnalysisStore(db:DatabaseSync,roots:readonly string[],logger:Logger,analyzer:MissionAnalyzer,packetBuilder=buildAnalysisPacket){
 const context=createContextStore(db,roots,logger);
 let closed=false;
 let active:{id:string;controller:AbortController}|null=null;
 db.prepare("UPDATE mission_analyses SET status='INTERRUPTED',completed_at=?,error=? WHERE status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Analysis was interrupted when the coordinator stopped.');
 const ensureOpen=()=>{if(closed)throw new AnalysisError('ANALYSIS_INTERRUPTED','The analysis coordinator has stopped.',409);};
 const storageError=(error:unknown):never=>{if(error instanceof AnalysisError)throw error;logger({level:'error',event:'analysis.storage_failed',code:'ANALYSIS_STORAGE_FAILED'});throw new AnalysisError('ANALYSIS_STORAGE_FAILED','Mission analysis could not be saved or loaded.',500);};
 const view=(missionId:string):AnalysisView=>{
  ensureOpen();getMission(db,missionId,logger);
  try{
   const latest=db.prepare("SELECT * FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId) as Row|undefined;
   const operation=db.prepare('SELECT * FROM mission_analyses WHERE mission_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(missionId) as Row|undefined;
   const questions=latest?(db.prepare('SELECT q.*,a.answer_text,a.updated_at FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? ORDER BY q.display_order').all(latest.id) as QuestionRow[]).map(question):[];
   const snapshot=context.list(missionId).latest;
   return {analysis:latest?record(latest):null,operation:operation?record(operation):null,questions,phase:missionAnalysisPhase(db,missionId),stale:!!latest&&snapshot?.id!==latest.context_snapshot_id};
  }catch(error){return storageError(error);}
 };
 const attention=():AttentionResponse=>{
  ensureOpen();
  try{
   const items=db.prepare(`SELECT q.id AS questionId,m.id AS missionId,p.id AS projectId,p.display_name AS projectName,m.original_intent AS originalIntent,q.question,q.decision_area AS decisionArea
    FROM clarification_questions q JOIN mission_analyses x ON x.id=q.analysis_id JOIN missions m ON m.id=x.mission_id JOIN projects p ON p.id=m.project_id LEFT JOIN clarification_answers a ON a.question_id=q.id
    WHERE a.question_id IS NULL AND x.id=(SELECT z.id FROM mission_analyses z WHERE z.mission_id=m.id AND z.status='SUCCEEDED' ORDER BY z.created_at DESC,z.rowid DESC LIMIT 1)
    ORDER BY x.created_at DESC,x.rowid DESC,q.display_order`).all() as AttentionResponse['items'];
   return {items,count:items.length};
  }catch(error){return storageError(error);}
 };
 const answer=(questionId:string,text:unknown):AnalysisView=>{
  ensureOpen();
  if(typeof text!=='string'||!text.trim()||text.length>4000||/[\uD800-\uDFFF]/u.test(text))throw new AnalysisError('INVALID_CLARIFICATION_ANSWER','Enter a nonblank answer of up to 4,000 characters.',400);
  let missionId:string;
  try{
   const row=db.prepare("SELECT x.mission_id FROM clarification_questions q JOIN mission_analyses x ON x.id=q.analysis_id WHERE q.id=? AND x.status='SUCCEEDED'").get(questionId);
   if(!row)throw new AnalysisError('QUESTION_NOT_FOUND','That clarification question could not be found.',404);
   missionId=String(row.mission_id);
   db.prepare('INSERT INTO clarification_answers(question_id,answer_text,updated_at) VALUES(?,?,?) ON CONFLICT(question_id) DO UPDATE SET answer_text=excluded.answer_text,updated_at=excluded.updated_at').run(questionId,text,new Date().toISOString());
  }catch(error){return storageError(error);}
  return view(missionId);
 };
 const analyze=async(missionId:string):Promise<AnalysisView>=>{
  ensureOpen();
  const mission=getMission(db,missionId,logger);
  const snapshot=context.list(missionId).latest;
  if(!snapshot)throw new AnalysisError('CONTEXT_REQUIRED','Capture project context before analyzing this mission.',409);
  if(active)throw new AnalysisError('ANALYSIS_BUSY','Another mission analysis is in progress. Try again shortly.',409);
  const project=db.prepare('SELECT p.repo_root FROM projects p JOIN missions m ON m.project_id=p.id WHERE m.id=?').get(missionId);
  if(!project||typeof project.repo_root!=='string')throw new AnalysisError('REPOSITORY_UNAVAILABLE','The registered Project is no longer available.',404);
  const owned={id:randomUUID(),controller:new AbortController()};
  active=owned;
  try{
   try{db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,prompt_version,created_at) VALUES(?,?,?,?,'PREPARING',?,?)").run(owned.id,missionId,snapshot.id,snapshot.payload.baseHead,ANALYSIS_PROMPT_VERSION,new Date().toISOString());}
   catch(error){if(db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND context_snapshot_id=? AND status IN('PREPARING','RUNNING')").get(missionId,snapshot.id))throw new AnalysisError('ANALYSIS_BUSY','This mission context is already being analyzed.',409);return storageError(error);}
   const built=await packetBuilder(mission,snapshot,project.repo_root,roots,logger);
   ensureOpen();if(owned.controller.signal.aborted)throw new AnalysisError('ANALYSIS_INTERRUPTED','Mission analysis was interrupted.',409);
   db.prepare("UPDATE mission_analyses SET packet_json=?,packet_hash=?,packet_millis=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(JSON.stringify(built.packet),built.hash,built.elapsedMs,owned.id);
   const output=await analyzer(built.packet as AnalysisPacket,owned.controller.signal,()=>{ensureOpen();const started=db.prepare("UPDATE mission_analyses SET status='RUNNING' WHERE id=? AND status='PREPARING'").run(owned.id);if(Number(started.changes)!==1)throw new AnalysisError('ANALYSIS_INTERRUPTED','Analysis no longer owns its operation.',409);});
   ensureOpen();if(owned.controller.signal.aborted)throw new AnalysisError('ANALYSIS_INTERRUPTED','Mission analysis was interrupted.',409);
   db.prepare("UPDATE mission_analyses SET tool_version=?,analysis_millis=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(output.toolVersion,output.elapsedMs,owned.id);
   const result=validateAnalysisResult(output.output,built.packet);
   const completedAt=new Date().toISOString();
   db.exec('BEGIN IMMEDIATE');
   try{
    const changed=db.prepare("UPDATE mission_analyses SET status='SUCCEEDED',tool_version=?,result_json=?,analysis_millis=?,completed_at=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(output.toolVersion,JSON.stringify(result),output.elapsedMs,completedAt,owned.id);
    if(Number(changed.changes)!==1)throw new AnalysisError('ANALYSIS_INTERRUPTED','Mission analysis was interrupted.',409);
    const insert=db.prepare('INSERT INTO clarification_questions(id,analysis_id,question,why_it_matters,decision_area,options_json,evidence_ids_json,required,display_order,created_at) VALUES(?,?,?,?,?,?,?,1,?,?)');
    result.questions.forEach((q,order)=>insert.run(randomUUID(),owned.id,q.question,q.whyItMatters,q.decisionArea,JSON.stringify(q.options),JSON.stringify(q.evidenceIds),order,completedAt));
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   return view(missionId);
  }catch(error){
   if(!closed){
    const failure=error instanceof AnalysisError?error:new AnalysisError('ANALYSIS_FAILED','Mission analysis failed. Try again.',502);
    try{db.prepare("UPDATE mission_analyses SET status=?,completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(owned.controller.signal.aborted?'INTERRUPTED':'FAILED',new Date().toISOString(),failure.message,owned.id);}catch(problem){return storageError(problem);}
    logger({level:'error',event:'analysis.failed',code:failure.code});throw failure;
   }
   throw new AnalysisError('ANALYSIS_INTERRUPTED','Mission analysis was interrupted when the coordinator stopped.',409);
  }finally{if(active===owned)active=null;}
 };
 const interrupt=(missionId:string)=>{if(active&&db.prepare('SELECT mission_id FROM mission_analyses WHERE id=?').get(active.id)?.mission_id===missionId)active.controller.abort();};
 const close=()=>{
  if(closed)return;
  if(active){active.controller.abort();db.prepare("UPDATE mission_analyses SET status='INTERRUPTED',completed_at=?,error=? WHERE id=? AND status IN('PREPARING','RUNNING')").run(new Date().toISOString(),'Analysis was interrupted when the coordinator stopped.',active.id);}
  closed=true;
 };
 return {view,attention,analyze,answer,close,interrupt};
}
