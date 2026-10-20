import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';
test('exact Breakout 1 database upgrades with project and migration metadata unchanged',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-b1-upgrade-'));const source=join(root,'source');mkdirSync(source);const data=join(root,'data');
 try{
  for(const file of ['database.ts','log.ts','errors.ts'])writeFileSync(join(source,file),execFileSync('git',['show','8338e22ba7b8a0cd45510214e0b978ef99d3cb2a:apps/server/'+file],{encoding:'utf8'}));
  const baseline=await import(pathToFileURL(join(source,'database.ts')).href) as {openDatabase:typeof openDatabase};const old=baseline.openDatabase(data,()=>{});assert.equal(old.version(),2);
  old.connection.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('preserved','Registered project','/not-inspected/repository','a'.repeat(40),null,'2026-01-01T00:00:00.000Z');const projects=old.connection.prepare('SELECT * FROM projects').all();const rows=old.connection.prepare('SELECT * FROM schema_migrations ORDER BY version').all();old.close();
  const current=openDatabase(data,()=>{});try{assert.equal(current.version(),20);assert.deepEqual(current.connection.prepare('SELECT * FROM projects').all(),projects);assert.deepEqual(current.connection.prepare('SELECT * FROM schema_migrations WHERE version<3 ORDER BY version').all(),rows);assert.equal(current.connection.prepare('SELECT count(*) AS n FROM missions').get()?.n,0);assert.equal(current.connection.prepare('PRAGMA foreign_keys').get()?.foreign_keys,1);}finally{current.close();}
 }finally{rmSync(root,{recursive:true});}
});
