import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
import {DatabaseSync} from 'node:sqlite';
const quiet=()=>{};

test('fresh initialization creates only migration metadata with safe SQLite settings',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-db-'));const db=openDatabase(dir,quiet);
 try{
  assert.ok(existsSync(join(dir,'command-center.sqlite')));assert.equal(db.version(),1);
  assert.equal(db.connection.prepare('PRAGMA foreign_keys').get()?.foreign_keys,1);
  assert.equal(db.connection.prepare('PRAGMA journal_mode').get()?.journal_mode,'wal');
  assert.equal(db.connection.prepare('PRAGMA busy_timeout').get()?.timeout,5000);
  assert.deepEqual(db.connection.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name),['schema_migrations']);
 }finally{db.close();rmSync(dir,{recursive:true});}
});
test('reopening preserves migration timestamp and does not rerun it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-reopen-'));let db=openDatabase(dir,quiet);
 const first=db.connection.prepare('SELECT * FROM schema_migrations').get();db.close();db=openDatabase(dir,quiet);
 try{assert.deepEqual(db.connection.prepare('SELECT * FROM schema_migrations').get(),first);assert.equal(db.version(),1);}finally{db.close();rmSync(dir,{recursive:true});}
});
test('a second coordinator cannot own the same data directory; graceful close releases it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-owner-'));const first=openDatabase(dir,quiet);
 assert.throws(()=>openDatabase(dir,quiet),/already owned/);first.close();const next=openDatabase(dir,quiet);next.close();rmSync(dir,{recursive:true});
});
test('migration-applied log is emitted only after metadata is committed and readable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-commit-'));
 try{const db=openDatabase(dir,event=>{if(event.event==='migration.applied'){const reader=new DatabaseSync(join(dir,'command-center.sqlite'),{readOnly:true});try{assert.equal(reader.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version,1);}finally{reader.close();}}});db.close();}finally{rmSync(dir,{recursive:true});}
});
test('newer schema is rejected without downgrading metadata or stranding ownership',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-newer-'));const db=openDatabase(dir,quiet);db.connection.prepare('INSERT INTO schema_migrations VALUES(2,?)').run('future');db.close();
 try{assert.throws(()=>openDatabase(dir,quiet),/newer/);assert.equal(existsSync(join(dir,'.coordinator.lock')),false);const reader=new DatabaseSync(join(dir,'command-center.sqlite'),{readOnly:true});try{assert.equal(reader.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version,2);}finally{reader.close();}}finally{rmSync(dir,{recursive:true});}
});
