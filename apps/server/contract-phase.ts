import {acceptedContractRow,draftAccepted} from './content-identity.ts';
import type {DatabaseSync} from 'node:sqlite';
import type {ContractPhase} from '../../packages/shared/contracts.ts';
import {buildContractInput} from './contract-input.ts';

export function currentContractInputHash(db:DatabaseSync,missionId:string):string|null {
 try{return buildContractInput(db,missionId).hash;}catch{return null;}
}
export function contractPhase(db:DatabaseSync,missionId:string,basePhase:'DRAFT'|'NEEDS_CLARIFICATION'|'CLARIFIED'):ContractPhase {
 const hash=currentContractInputHash(db,missionId);if(!hash)return basePhase;
 const draft=db.prepare("SELECT id,input_hash FROM contract_drafts WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
 const accepted=acceptedContractRow(db,missionId);
 if(draft&&draft.input_hash===hash&&draft.id!==accepted?.draft_id&&!draftAccepted(db,'contract',String(draft.id)))return 'CONTRACT_REVIEW';
 return accepted?.input_hash===hash?'CONTRACT_READY':basePhase;
}
