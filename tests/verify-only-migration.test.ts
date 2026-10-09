import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {migrateWorkflow} from '../apps/server/workflow-migration.ts';
import {migrateVerifyOnly} from '../apps/server/verify-only-migration.ts';
test('exact schema-12 decision table upgrades without changing prior decisions; unreviewed Abandon is nullable and unique',()=>{
 const db=new DatabaseSync(':memory:');db.exec("PRAGMA foreign_keys=ON;CREATE TABLE missions(id TEXT PRIMARY KEY);INSERT INTO missions VALUES('reviewed'),('unreviewed');");migrateWorkflow(db);
 db.exec("INSERT INTO mission_decisions(mission_id,kind,spec_id,created_at) VALUES('reviewed','APPROVE_SPEC','spec','fixed-time');");const before=db.prepare('SELECT * FROM mission_decisions').all();
 db.exec('BEGIN');migrateVerifyOnly(db);db.exec('COMMIT');assert.deepEqual(db.prepare('SELECT * FROM mission_decisions').all(),before);
 db.exec("INSERT INTO mission_decisions(mission_id,kind,spec_id,created_at) VALUES('unreviewed','ABANDON',NULL,'fixed-time')");
 assert.throws(()=>db.exec("INSERT INTO mission_decisions(mission_id,kind,spec_id,created_at) VALUES('unreviewed','ABANDON',NULL,'another')"),/unique|immutable|replace/i);
 assert.throws(()=>db.exec("INSERT INTO mission_decisions(mission_id,kind,spec_id,created_at) VALUES('reviewed','LAND',NULL,'invalid')"),/constraint/i);
 assert.throws(()=>db.exec("UPDATE mission_decisions SET created_at='changed'"),/immutable/);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
});
