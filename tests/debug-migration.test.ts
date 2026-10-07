import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {migrateDebug} from '../apps/server/debug-migration.ts';
function baseline(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync(new URL('./fixtures/breakout9-schema.sql',import.meta.url),'utf8'));return db;}
test('exact Breakout 9 commit 708effd version 10 migrates additively preserving every existing schema and row byte',()=>{const db=baseline();try{
 assert.equal(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get()!.v,10);
 db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','B9 fixture','/disposable','a'.repeat(40),'main','2026-01-01');db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','Immutable B9 intent','DRAFT','2026-01-02');db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('context','mission','{"preserved":"exact bytes"}','b'.repeat(64),'2026-01-03');
 const schema=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all(),tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>String(r.name)),rows=new Map(tables.map(n=>[n,db.prepare('SELECT * FROM '+n+' ORDER BY rowid').all()]));
 db.exec('BEGIN IMMEDIATE');migrateDebug(db);db.prepare('INSERT INTO schema_migrations VALUES(11,?)').run('2026-10-06');db.exec('COMMIT');
 for(const item of schema)assert.deepEqual(db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name=?').get(item.name!),item);
 for(const [name,previous] of rows)assert.deepEqual(db.prepare('SELECT * FROM '+name+(name==='schema_migrations'?' WHERE version<11':'')+' ORDER BY rowid').all(),previous);
 assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name LIKE 'debug_%'").get()!.n,5);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}});
test('debug migration failure rolls back all additive schema and retains exact version 10',()=>{const db=baseline();try{db.exec('CREATE TABLE debug_packets(conflict TEXT) STRICT');const before=db.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY name').all();db.exec('BEGIN IMMEDIATE');assert.throws(()=>migrateDebug(db),/already exists/);db.exec('ROLLBACK');assert.deepEqual(db.prepare('SELECT type,name,sql FROM sqlite_master ORDER BY name').all(),before);assert.equal(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get()!.v,10);}finally{db.close();}});
