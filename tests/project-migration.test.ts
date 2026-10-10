import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';

test('upgrades database produced by exact Breakout 0 code while preserving its migration row',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-v1-upgrade-'));const source=join(root,'source');mkdirSync(source);const data=join(root,'data');
 try{
  for(const file of ['database.ts','log.ts','errors.ts'])writeFileSync(join(source,file),execFileSync('git',['show','19581aaa1c85574b09863a01fbf80122190cc6d4:apps/server/'+file],{cwd:process.cwd(),encoding:'utf8'}));
  const baseline=await import(pathToFileURL(join(source,'database.ts')).href) as {openDatabase:typeof openDatabase};
  const old=baseline.openDatabase(data,()=>{});const oldRow=old.connection.prepare('SELECT * FROM schema_migrations WHERE version=1').get();assert.equal(old.version(),1);old.close();
  const current=openDatabase(data,()=>{});try{assert.equal(current.version(),16);assert.deepEqual(current.connection.prepare('SELECT * FROM schema_migrations WHERE version=1').get(),oldRow);assert.equal(current.connection.prepare('SELECT count(*) AS n FROM projects').get()?.n,0);assert.deepEqual(current.connection.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(x=>x.version),[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);}finally{current.close();}
 }finally{rmSync(root,{recursive:true});}
});
