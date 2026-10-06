import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {planningFixture} from './helpers/build-fixture.ts';
import {openDatabase} from '../apps/server/database.ts';
import {createPlanningStore} from '../apps/server/planning-store.ts';
test('migration 8 adds exactly three Builder tables and preserves Breakout 6 schemas, rows, accepted hashes and attention',async()=>{
 const f=await planningFixture();try{
  const review=await f.planning.compile('mission');f.planning.accept(review.draft!.id);
  await f.planning.compile('mission');const attention=f.planning.attention();
  const oldTables=['projects','missions','project_context_snapshots','mission_analyses','clarification_questions','clarification_answers','contract_drafts','mission_contract_revisions','planning_drafts','plan_revisions','evaluation_contract_revisions'];
  const schema=Object.fromEntries(oldTables.map(name=>[name,f.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)!.sql]));
  const rows=Object.fromEntries(oldTables.map(name=>[name,f.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]));
  f.planning.close();f.store.close();f.db.exec('DROP TABLE build_candidates; DROP TABLE build_events; DROP TABLE build_attempts; DROP INDEX plan_build_binding; DROP INDEX evaluation_build_binding; DELETE FROM schema_migrations WHERE version=8; PRAGMA user_version=7');f.database.close();
  const migrated=openDatabase(join(f.root,'data'),()=>{});try{
   assert.equal(migrated.version(),8);assert.equal(migrated.connection.prepare('PRAGMA user_version').get()!.user_version,8);
   const tables=migrated.connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);assert.equal(tables.length,15);
   for(const name of oldTables){assert.equal(migrated.connection.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)!.sql,schema[name]);assert.deepEqual(migrated.connection.prepare('SELECT * FROM '+name+' ORDER BY rowid').all(),rows[name]);}
   const planning=createPlanningStore(migrated.connection,()=>{},async()=>{throw Error('no replay');});assert.deepEqual(planning.attention(),attention);assert.equal(planning.view('mission').phase,'PLAN_REVIEW');planning.close();
  }finally{migrated.close();}
 }finally{f.finish();}
});
