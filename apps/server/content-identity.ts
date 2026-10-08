import type {DatabaseSync} from 'node:sqlite';
import type {PlanningPayload} from '../../packages/shared/planning.ts';
import {readOracle} from './oracle-author.ts';
// Storage locations and manifest generation IDs are audit bindings, not executable content.
export function planningContentIdentity(payload:PlanningPayload):PlanningPayload {
 return {...payload,evaluationContract:{claims:payload.evaluationContract.claims.map(claim=>{
  if(!claim.oracle)return claim;
  const {id,...manifest}=readOracle(claim.oracle);
  const {path,hash,...reference}=claim.oracle;
  return {...claim,oracle:{...reference,manifest}};
 })}} as unknown as PlanningPayload;
}
export function migrateContentIdentity(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS contract_acceptances(draft_id TEXT PRIMARY KEY REFERENCES contract_drafts(id),mission_id TEXT NOT NULL REFERENCES missions(id),revision_id TEXT NOT NULL REFERENCES mission_contract_revisions(id),accepted_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS planning_acceptances(draft_id TEXT PRIMARY KEY REFERENCES planning_drafts(id),mission_id TEXT NOT NULL REFERENCES missions(id),pair_id TEXT NOT NULL,accepted_at TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS contract_acceptances_immutable_update BEFORE UPDATE ON contract_acceptances BEGIN SELECT RAISE(ABORT,'immutable contract acceptance'); END;
 CREATE TRIGGER IF NOT EXISTS contract_acceptances_immutable_delete BEFORE DELETE ON contract_acceptances BEGIN SELECT RAISE(ABORT,'immutable contract acceptance'); END;
 CREATE TRIGGER IF NOT EXISTS contract_acceptances_immutable_replace BEFORE INSERT ON contract_acceptances WHEN EXISTS(SELECT 1 FROM contract_acceptances WHERE draft_id=NEW.draft_id) BEGIN SELECT RAISE(ABORT,'immutable contract acceptance'); END;
 CREATE TRIGGER IF NOT EXISTS planning_acceptances_immutable_update BEFORE UPDATE ON planning_acceptances BEGIN SELECT RAISE(ABORT,'immutable planning acceptance'); END;
 CREATE TRIGGER IF NOT EXISTS planning_acceptances_immutable_delete BEFORE DELETE ON planning_acceptances BEGIN SELECT RAISE(ABORT,'immutable planning acceptance'); END;
 CREATE TRIGGER IF NOT EXISTS planning_acceptances_immutable_replace BEFORE INSERT ON planning_acceptances WHEN EXISTS(SELECT 1 FROM planning_acceptances WHERE draft_id=NEW.draft_id) BEGIN SELECT RAISE(ABORT,'immutable planning acceptance'); END;`);
}
const hasTable=(db:DatabaseSync,name:string)=>!!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
export function acceptedContractRow(db:DatabaseSync,missionId:string){
 const ack=hasTable(db,'contract_acceptances')?db.prepare('SELECT revision_id FROM contract_acceptances WHERE mission_id=? ORDER BY rowid DESC LIMIT 1').get(missionId):null;
 return ack?db.prepare('SELECT r.*,d.input_json FROM mission_contract_revisions r JOIN contract_drafts d ON d.id=r.draft_id WHERE r.mission_id=? AND r.id=?').get(missionId,ack.revision_id!):db.prepare('SELECT r.*,d.input_json FROM mission_contract_revisions r JOIN contract_drafts d ON d.id=r.draft_id WHERE r.mission_id=? ORDER BY r.revision DESC LIMIT 1').get(missionId);
}
export function acceptedPlanningRow(db:DatabaseSync,missionId:string){
 const ack=hasTable(db,'planning_acceptances')?db.prepare('SELECT pair_id FROM planning_acceptances WHERE mission_id=? ORDER BY rowid DESC LIMIT 1').get(missionId):null;
 const complete='FROM plan_revisions p JOIN evaluation_contract_revisions e ON e.pair_id=p.pair_id AND e.mission_id=p.mission_id AND e.revision=p.revision AND e.draft_id=p.draft_id AND e.contract_revision_id=p.contract_revision_id AND e.input_hash=p.input_hash';
 return ack?db.prepare('SELECT p.* '+complete+' WHERE p.mission_id=? AND p.pair_id=?').get(missionId,ack.pair_id!):db.prepare('SELECT p.* '+complete+' WHERE p.mission_id=? ORDER BY p.revision DESC LIMIT 1').get(missionId);
}
export function draftAccepted(db:DatabaseSync,kind:'contract'|'planning',draftId:string){
 const table=kind==='contract'?'contract_acceptances':'planning_acceptances';
 return hasTable(db,table)&&!!db.prepare('SELECT draft_id FROM '+table+' WHERE draft_id=?').get(draftId);
}
