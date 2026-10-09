import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
import {DatabaseSync} from 'node:sqlite';
const quiet=()=>{};

test('fresh initialization creates only the implemented tables with safe SQLite settings',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-db-'));const db=openDatabase(dir,quiet);
 try{
  assert.ok(existsSync(join(dir,'command-center.sqlite')));assert.equal(db.version(),14);
  assert.equal(db.connection.prepare('PRAGMA foreign_keys').get()?.foreign_keys,1);
  assert.equal(db.connection.prepare('PRAGMA journal_mode').get()?.journal_mode,'wal');
  assert.equal(db.connection.prepare('PRAGMA busy_timeout').get()?.timeout,5000);
  assert.deepEqual(db.connection.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name),['schema_migrations','projects','missions','project_context_snapshots','mission_analyses','clarification_questions','clarification_answers','contract_drafts','mission_contract_revisions','planning_drafts','plan_revisions','evaluation_contract_revisions','build_attempts','build_events','sqlite_sequence','build_candidates','build_runtime_state','runtime_permission_requests','verification_recipes','verification_runs','verification_claims','verification_evidence','verification_events','debug_sessions','debug_cycles','debug_packets','debug_diagnoses','debug_events','contract_acceptances','planning_acceptances','mission_workflows','mission_outcomes','mission_land_intents','verify_only_runs','mission_decisions']);
 }finally{db.close();rmSync(dir,{recursive:true});}
});
test('reopening preserves migration timestamp and does not rerun it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-reopen-'));let db=openDatabase(dir,quiet);
 const first=db.connection.prepare('SELECT * FROM schema_migrations').get();db.close();db=openDatabase(dir,quiet);
 try{assert.deepEqual(db.connection.prepare('SELECT * FROM schema_migrations').get(),first);assert.equal(db.version(),14);}finally{db.close();rmSync(dir,{recursive:true});}
});
test('a second coordinator cannot own the same data directory; graceful close releases it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-owner-'));const first=openDatabase(dir,quiet);
 assert.throws(()=>openDatabase(dir,quiet),/owned/);first.close();const next=openDatabase(dir,quiet);next.close();rmSync(dir,{recursive:true});
});
test('migration-applied log is emitted only after metadata is committed and readable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-commit-'));
 try{const db=openDatabase(dir,event=>{if(event.event==='migration.applied'){const reader=new DatabaseSync(join(dir,'command-center.sqlite'),{readOnly:true});try{assert.equal(reader.prepare('SELECT version FROM schema_migrations WHERE version=?').get(event.schemaVersion!)?.version,event.schemaVersion);}finally{reader.close();}}});db.close();}finally{rmSync(dir,{recursive:true});}
});
test('newer schema is rejected without downgrading metadata or stranding ownership',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-newer-'));const db=openDatabase(dir,quiet);db.connection.prepare('INSERT INTO schema_migrations VALUES(15,?)').run('future');db.close();
 try{assert.throws(()=>openDatabase(dir,quiet),/newer/);assert.equal(existsSync(join(dir,'.coordinator.lock')),false);const reader=new DatabaseSync(join(dir,'command-center.sqlite'),{readOnly:true});try{assert.equal(reader.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version,15);}finally{reader.close();}}finally{rmSync(dir,{recursive:true});}
});
