import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';
test('exact Breakout 2 DB upgrades with unchanged Projects, Missions, original intent and migration rows',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-b2-upgrade-'));const source=join(root,'source');mkdirSync(source);const data=join(root,'data');
 try{
  for(const file of ['database.ts','log.ts','errors.ts'])writeFileSync(join(source,file),execFileSync('git',['show','bc1319f29351ed505078d53cd4302a20e74ac222:apps/server/'+file],{encoding:'utf8'}));
  const baseline=await import(pathToFileURL(join(source,'database.ts')).href) as {openDatabase:typeof openDatabase};const old=baseline.openDatabase(data,()=>{});assert.equal(old.version(),3);
  old.connection.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Registered','/not-read','a'.repeat(40),null,'2026-01-01');old.connection.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','  Raw\n intent.\t\n','DRAFT','2026-01-02');
  const projects=old.connection.prepare('SELECT * FROM projects').all(),missions=old.connection.prepare('SELECT * FROM missions').all(),rows=old.connection.prepare('SELECT * FROM schema_migrations ORDER BY version').all();old.close();
  const current=openDatabase(data,()=>{});try{assert.equal(current.version(),16);assert.deepEqual(current.connection.prepare('SELECT * FROM projects').all(),projects);assert.deepEqual(current.connection.prepare('SELECT * FROM missions').all(),missions);assert.deepEqual(current.connection.prepare('SELECT * FROM schema_migrations WHERE version<4 ORDER BY version').all(),rows);assert.equal(current.connection.prepare('SELECT count(*) AS n FROM project_context_snapshots').get()?.n,0);}finally{current.close();}
 }finally{rmSync(root,{recursive:true});}
});
