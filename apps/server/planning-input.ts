import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {PLANNING_PROMPT_VERSION,PLANNING_DEFAULTS_VERSION,PLANNING_DEFAULTS,PLANNING_LIMITS,type PlanningInput} from '../../packages/shared/planning.ts';
import type {ContractInput,ContractPayload,ContractSource} from '../../packages/shared/contracts.ts';
import {buildContractInput} from './contract-input.ts';
import {contractPhase} from './contract-phase.ts';
import {canonicalContractJson} from './contract-store.ts';
import {PlanningError} from './planning-errors.ts';
import {ContractError} from './contract-errors.ts';
import {checkPlanningMetrics} from './planning-validation.ts';
const fail=(code:string,message:string,status=409):never=>{throw new PlanningError(code,message,status);};
// Deliberately consume the accepted revision and its stored input, never the project filesystem.
export function buildPlanningInput(db:DatabaseSync,missionId:string):{input:PlanningInput;hash:string}{
 try{
  const current=buildContractInput(db,missionId);
  if(db.prepare("SELECT id FROM contract_drafts WHERE mission_id=? AND status IN('PREPARING','RUNNING') LIMIT 1").get(missionId))return fail('CONTRACT_BUSY','Wait for the active Mission Contract compilation before planning.');
  const analysis=db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
  const pending=analysis?Number(db.prepare('SELECT COUNT(*) AS n FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? AND a.question_id IS NULL').get(analysis.id!)?.n):0;
  const base=analysis?(pending?'NEEDS_CLARIFICATION':'CLARIFIED'):'DRAFT';
  if(contractPhase(db,missionId,base)!=='CONTRACT_READY')return fail('CONTRACT_NOT_READY','Accept a current Mission Contract before planning.');
  const r=db.prepare('SELECT r.*,d.input_json FROM mission_contract_revisions r JOIN contract_drafts d ON d.id=r.draft_id WHERE r.mission_id=? ORDER BY r.revision DESC LIMIT 1').get(missionId);
  if(!r||r.input_hash!==current.hash)return fail('CONTRACT_NOT_READY','Accept a current Mission Contract before planning.');
  const sourceInput=JSON.parse(String(r.input_json)) as ContractInput;
  const payload=JSON.parse(String(r.payload_json)) as ContractPayload;
  const userEdits=JSON.parse(String(r.user_edits_json)) as ContractSource[];
  const canonical=canonicalContractJson({payload,inputHash:r.input_hash,userEdits});
  const contractHash=createHash('sha256').update(canonical).digest('hex');
  if(canonical!==r.canonical||contractHash!==r.contract_hash||canonicalContractJson(sourceInput)!==canonicalContractJson(current.input))return fail('INVALID_PLANNING_INPUT','The accepted Mission Contract does not match its canonical identity or bound input.',500);
  const input:PlanningInput={version:'planning-input-v1',missionId,contractRevisionId:String(r.id),contractHash,contractInputHash:current.hash,contract:payload,sourceBindings:sourceInput.bindings,sources:[...sourceInput.sources,...userEdits],promptVersion:PLANNING_PROMPT_VERSION,defaultsVersion:PLANNING_DEFAULTS_VERSION,defaults:PLANNING_DEFAULTS,limits:PLANNING_LIMITS};
  if(new Set(input.sources.map(s=>s.id)).size!==input.sources.length)return fail('INVALID_PLANNING_INPUT','Accepted sources contain duplicate identities.',500);
  checkPlanningMetrics(input);
  const encoded=canonicalContractJson(input);
  if(Buffer.byteLength(encoded)>PLANNING_LIMITS.inputBytes)return fail('PLANNING_INPUT_LIMIT','Accepted Mission artifacts exceed the bounded planning input limit.',422);
  return {input,hash:createHash('sha256').update(encoded).digest('hex')};
 }catch(error){if(error instanceof PlanningError)throw error;if(error instanceof ContractError)throw new PlanningError(error.code,error.message,error.status);return fail('INVALID_PLANNING_INPUT','Stored accepted Mission artifacts could not be safely consumed.',500);}
}
