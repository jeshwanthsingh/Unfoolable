import type {DatabaseSync} from 'node:sqlite';
import type {ContractPhase} from '../../packages/shared/contracts.ts';
import type {PlanningPhase} from '../../packages/shared/planning.ts';
import {buildPlanningInput} from './planning-input.ts';
export function currentPlanningInputHash(db:DatabaseSync,missionId:string):string|null {
 try{return buildPlanningInput(db,missionId).hash;}catch{return null;}
}
// A complete pair is joined on every authoritative binding, never on just a mission ID.
export const COMPLETE_PLANNING_PAIR=`FROM plan_revisions p JOIN evaluation_contract_revisions e ON e.pair_id=p.pair_id AND e.mission_id=p.mission_id AND e.revision=p.revision AND e.draft_id=p.draft_id AND e.contract_revision_id=p.contract_revision_id AND e.input_hash=p.input_hash`;
export function planningPhase(db:DatabaseSync,missionId:string,baseContractPhase:ContractPhase):PlanningPhase {
 if(baseContractPhase!=='CONTRACT_READY')return baseContractPhase;
 const hash=currentPlanningInputHash(db,missionId);if(!hash)return baseContractPhase;
 const draft=db.prepare("SELECT id,input_hash FROM planning_drafts WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
 const accepted=db.prepare('SELECT p.draft_id,p.input_hash '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? ORDER BY p.revision DESC LIMIT 1').get(missionId);
 if(draft&&draft.input_hash===hash&&draft.id!==accepted?.draft_id)return 'PLAN_REVIEW';
 return accepted?.input_hash===hash?'PLAN_READY':baseContractPhase;
}
