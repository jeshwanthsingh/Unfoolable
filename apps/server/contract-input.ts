import type {DatabaseSync} from 'node:sqlite';
import type {AnalysisPacket,AnalysisResult} from '../../packages/shared/analysis.ts';
import {CONTRACT_PROMPT_VERSION,ENGINEERING_DEFAULTS_VERSION,ENGINEERING_DEFAULTS,CONTRACT_LIMITS,type ContractInput,type ContractSource} from '../../packages/shared/contracts.ts';
import {canonicalJson,payloadHash} from './context-observation.ts';
import {ContractError} from './contract-errors.ts';
const fail=(code:string,message:string,status=409):never=>{throw new ContractError(code,message,status);};
type AnalysisRow={id:string;context_snapshot_id:string;packet_json:string|null;packet_hash:string|null;result_json:string|null};
type AnswerRow={id:string;question:string;required:number;answer_text:string|null;updated_at:string|null};
// Consume persisted analysis evidence only. This module never opens the project or invokes Git.
export function buildContractInput(db:DatabaseSync,missionId:string):{input:ContractInput;hash:string}{
 const mission=db.prepare('SELECT original_intent FROM missions WHERE id=?').get(missionId);
 if(!mission)return fail('MISSION_NOT_FOUND','That mission could not be found.',404);
 if(db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status IN('PREPARING','RUNNING') LIMIT 1").get(missionId))return fail('ANALYSIS_BUSY','Wait for the active analysis before drafting a contract.');
 const analysis=db.prepare("SELECT * FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId) as AnalysisRow|undefined;
 if(!analysis)return fail('ANALYSIS_REQUIRED','Complete a successful Mission analysis before drafting a contract.');
 const snapshot=db.prepare('SELECT id FROM project_context_snapshots WHERE mission_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(missionId);
 if(!snapshot||snapshot.id!==analysis.context_snapshot_id)return fail('STALE_ANALYSIS','Analyze the latest project context before drafting a contract.');
 const rows=db.prepare('SELECT q.id,q.question,q.required,a.answer_text,a.updated_at FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? ORDER BY q.id').all(analysis.id) as AnswerRow[];
 if(rows.some(q=>q.required===1&&(!q.answer_text?.trim()||!q.updated_at)))return fail('CLARIFICATION_REQUIRED','Answer every required clarification before drafting a contract.');
 try{
  if(!analysis.packet_json||!analysis.result_json||!analysis.packet_hash)return fail('INVALID_CONTRACT_INPUT','Stored analysis is incomplete.',500);
  const packet=JSON.parse(analysis.packet_json) as AnalysisPacket;
  const result=JSON.parse(analysis.result_json) as AnalysisResult;
  if(packet.missionId!==missionId||packet.snapshotId!==snapshot.id||packet.originalIntent!==mission.original_intent||payloadHash(packet)!==analysis.packet_hash||!Array.isArray(packet.evidence)||!result.understanding)return fail('INVALID_CONTRACT_INPUT','Stored analysis does not match its bound Mission state.',500);
  const answered=rows.filter((q):q is AnswerRow&{answer_text:string;updated_at:string}=>q.answer_text!==null&&q.updated_at!==null);
  const sources:ContractSource[]=[{id:'intent',type:'ORIGINAL_INTENT',text:String(mission.original_intent)},...packet.evidence.map(e=>({id:'evidence:'+e.id,type:'PROJECT_EVIDENCE' as const,text:e.content,path:e.path,startLine:e.startLine,endLine:e.endLine})),...answered.map(q=>({id:'answer:'+q.id,type:'CLARIFICATION_ANSWER' as const,text:q.answer_text,questionId:q.id,question:q.question,updatedAt:q.updated_at})),...ENGINEERING_DEFAULTS.map(d=>({...d}))];
  if(new Set(sources.map(s=>s.id)).size!==sources.length)return fail('INVALID_CONTRACT_INPUT','Stored analysis has duplicate source identities.',500);
  const input:ContractInput={version:'contract-input-v1',bindings:{missionId,originalIntent:String(mission.original_intent),snapshotId:String(snapshot.id),analysisId:analysis.id,packetHash:analysis.packet_hash,answers:answered.map(q=>({questionId:q.id,text:q.answer_text,updatedAt:q.updated_at}))},understanding:result.understanding,sources,defaultsVersion:ENGINEERING_DEFAULTS_VERSION,promptVersion:CONTRACT_PROMPT_VERSION,limits:CONTRACT_LIMITS,evidenceTruncated:packet.evidenceTruncated};
  if(Buffer.byteLength(canonicalJson(input))>CONTRACT_LIMITS.inputBytes)return fail('CONTRACT_INPUT_LIMIT','Existing evidence exceeds the bounded contract input limit.',422);
  return {input,hash:payloadHash(input)};
 }catch(error){if(error instanceof ContractError)throw error;return fail('INVALID_CONTRACT_INPUT','Stored analysis could not be safely consumed.',500);}
}
