import type {DatabaseSync} from 'node:sqlite';
/** Include legacy agents and unresolved ownership; waiting for review is idle. */
export function maintenanceIdle(db:DatabaseSync,external:{drafting:boolean;reviewers:boolean}){
 if(external.drafting||external.reviewers)return false;
 for(const table of ['tickets','mission_analyses','contract_drafts','planning_drafts','build_attempts','verification_runs','debug_sessions','debug_diagnoses']){
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE name=?").get(table))continue;
  if(db.prepare('SELECT 1 FROM '+table+" WHERE status IN ('queued','building','checking','fixing','CREATED','STARTING','PREPARING','RUNNING','FINALIZING','DIAGNOSING','CORRECTING','VERIFYING','RECONCILE_REQUIRED') LIMIT 1").get())return false;
 }
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='verify_only_runs'").get()&&db.prepare("SELECT 1 FROM verify_only_runs WHERE state IN ('AUTHORING','VERIFYING') OR json_extract(ledger_json,'$.cleanupUncertain')=1 LIMIT 1").get())return false;
 return true;
}
