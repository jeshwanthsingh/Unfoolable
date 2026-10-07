import type {DatabaseSync} from 'node:sqlite';
/** Uncertain diagnosis ownership blocks every local execution entry point. */
export function diagnosisOwnershipUncertain(db:DatabaseSync):boolean{
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debug_diagnoses'").get())return false;
 return !!db.prepare("SELECT id FROM debug_diagnoses WHERE launch_pending=1 OR json_extract(diagnosis_json,'$.cleanup.verified')=0 OR json_extract(diagnosis_json,'$.cleanup.ambiguous')=1 OR json_array_length(diagnosis_json,'$.cleanup.remaining')>0 LIMIT 1").get();
}
