import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {planningFixture} from './helpers/build-fixture.ts';
import {openDatabase} from '../apps/server/database.ts';
test('migration 9 preserves the Breakout 7 schema, source ownership, Candidate identity and prior records',async()=>{
 const f=await planningFixture(),pair=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!,id=randomUUID();
 const baseCode=join(f.root,'base','apps','server');mkdirSync(baseCode,{recursive:true});
 // Execute the actual frozen Breakout 7 migrator, rather than downgrading a v9 database.
 const repo=process.env.CC_BASE_REPO_ROOT??join(import.meta.dirname,'..');
 for(const file of ['database.ts','database-lock.ts','errors.ts','log.ts'])writeFileSync(join(baseCode,file),execFileSync('git',['-C',repo,'show','5c7517:apps/server/'+file]));
 const baseModule=await import(pathToFileURL(join(baseCode,'database.ts')).href) as {openDatabase:typeof openDatabase},baseData=join(f.root,'base-data'),base=baseModule.openDatabase(baseData,()=>{});
 assert.equal(base.version(),8);const db=base.connection;let upgraded:ReturnType<typeof openDatabase>|null=null;
 try{
  // Use known-valid fixture records, preserving the exact base schema and its triggers.
  for(const table of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='schema_migrations' ORDER BY rowid").all()){
   const name=String(table.name),rows=f.db.prepare('SELECT * FROM '+name).all();
   if(rows.length){const columns=Object.keys(rows[0]!);const insert=db.prepare('INSERT INTO '+name+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')');for(const row of rows)insert.run(...columns.map(key=>row[key]!));}
  }
  db.prepare("INSERT INTO build_attempts(id,mission_id,plan_revision_id,evaluation_revision_id,slice_id,generation,status,workspace_path,base_head,source_root,source_index_hash,git_common_dir,input_json,provider_version,transport_id,transport_valid,started_at,timings_json) VALUES(?,?,?,?,?,1,'CANDIDATE',?,?,?,?,?,?,?,?,0,?,'{}')").run(id,'mission',pair.plan.id,pair.evaluation.id,'S1','/preserved/workspace','a'.repeat(40),'/preserved/source','b'.repeat(64),'/preserved/common','{}','codex-cli 0.160.0','original-transport','2026-01-09');
  db.prepare('INSERT INTO build_candidates VALUES(?,?,?,?)').run('preserved-candidate',id,JSON.stringify({id:'preserved-candidate',attemptId:id,treeHash:'c'.repeat(40)}),'2026-01-09');
  db.prepare('INSERT INTO build_events(attempt_id,generation,transport_id,kind,data_json,created_at) VALUES(?,1,?,?,?,?)').run(id,'original-transport','candidate.captured','{}','2026-01-09');
  const schema=db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='schema_migrations' ORDER BY name").all();
  const records=tables.map(table=>({name:String(table.name),rows:db.prepare('SELECT * FROM '+String(table.name)).all()}));
  base.close();upgraded=openDatabase(baseData,()=>{});
  assert.equal(upgraded.version(),10);const next=upgraded.connection;
  for(const old of schema){assert.deepEqual(next.prepare('SELECT type,name,sql FROM sqlite_master WHERE name=?').get(old.name!),old);}
  for(const table of records)assert.deepEqual(next.prepare('SELECT * FROM '+table.name).all(),table.rows);
  assert.equal(next.prepare('SELECT count(*) AS n FROM runtime_permission_requests').get()!.n,0);
  assert.equal(next.prepare('SELECT source_root FROM build_attempts').get()!.source_root,'/preserved/source');
  assert.equal(next.prepare('SELECT id FROM build_candidates').get()!.id,'preserved-candidate');
  assert.deepEqual({...next.prepare('SELECT * FROM build_runtime_state WHERE attempt_id=?').get(id)},{attempt_id:id,cancel_requested_at:null,effect_state:'NONE_OBSERVED',effect_json:null,reconcile_ms:null});
 }finally{upgraded?.close();base.close();f.finish();}
});
