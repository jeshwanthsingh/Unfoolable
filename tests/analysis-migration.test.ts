import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';
test('exact Breakout 3 schema upgrades without rebuilding Missions or disturbing context snapshot FKs',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-b3-analysis-upgrade-'));const source=join(root,'source');mkdirSync(source);const data=join(root,'data');
 try{
  for(const file of ['database.ts','log.ts','errors.ts'])writeFileSync(join(source,file),execFileSync('git',['show','21345ee:apps/server/'+file],{encoding:'utf8'}));
  const baseline=await import(pathToFileURL(join(source,'database.ts')).href) as {openDatabase:typeof openDatabase};const old=baseline.openDatabase(data,()=>{});assert.equal(old.version(),4);
  old.connection.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Registered','/not-read','a'.repeat(40),null,'2026-01-01');old.connection.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','  Raw\n intent.\t\n','DRAFT','2026-01-02');old.connection.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission','{}','b'.repeat(64),'2026-01-03');
  const projects=old.connection.prepare('SELECT * FROM projects').all(),missions=old.connection.prepare('SELECT * FROM missions').all(),snapshots=old.connection.prepare('SELECT * FROM project_context_snapshots').all(),migrations=old.connection.prepare('SELECT * FROM schema_migrations ORDER BY version').all(),schema=old.connection.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='missions'").get();old.close();
  const current=openDatabase(data,()=>{});try{
   assert.equal(current.version(),8);assert.deepEqual(current.connection.prepare('SELECT * FROM projects').all(),projects);assert.deepEqual(current.connection.prepare('SELECT * FROM missions').all(),missions);assert.deepEqual(current.connection.prepare('SELECT * FROM project_context_snapshots').all(),snapshots);assert.deepEqual(current.connection.prepare('SELECT * FROM schema_migrations WHERE version<5 ORDER BY version').all(),migrations);assert.deepEqual(current.connection.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='missions'").get(),schema);assert.deepEqual(current.connection.prepare('PRAGMA foreign_key_check').all(),[]);
   assert.equal(current.connection.prepare('SELECT count(*) AS n FROM mission_analyses').get()?.n,0);assert.equal(current.connection.prepare('SELECT count(*) AS n FROM clarification_questions').get()?.n,0);assert.equal(current.connection.prepare('SELECT count(*) AS n FROM clarification_answers').get()?.n,0);
  }finally{current.close();}
 }finally{rmSync(root,{recursive:true});}
});
