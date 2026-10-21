import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';
const baselineCommit='2141f6e75be823388fa86891e18aa5aedfa26a1d';
test('exact Breakout 4 upgrades through contract and planning migrations preserve seven entities, FKs and raw mission phase',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-b4-contract-upgrade-')),source=join(root,'source'),data=join(root,'data');mkdirSync(source);
 try{
  for(const file of ['database.ts','log.ts','errors.ts'])writeFileSync(join(source,file),execFileSync('git',['show',baselineCommit+':apps/server/'+file],{cwd:'/Users/jeshwanthsingh/Projects/ai-lab/command-center',encoding:'utf8'}));
  const baseline=await import(pathToFileURL(join(source,'database.ts')).href) as {openDatabase:typeof openDatabase},old=baseline.openDatabase(data,()=>{});assert.equal(old.version(),5);const db=old.connection;
  db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Registered','/not-read','a'.repeat(40),null,'2026-01-01');
  db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','  Raw\n intent.\t\n','DRAFT','2026-01-02');
  db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission','{}','b'.repeat(64),'2026-01-03');
  db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,created_at,completed_at) VALUES('analysis','mission','snapshot',?,'SUCCEEDED','{}',?,'v1','fake','{}','2026-01-04','2026-01-05')").run('a'.repeat(40),'c'.repeat(64));
  db.exec("INSERT INTO clarification_questions VALUES('question','analysis','Question?','Why','behavior','[]','[]',1,0,'2026-01-05'); INSERT INTO clarification_answers VALUES('question','  exact decision.\n','2026-01-06')");
  const tables=['projects','missions','project_context_snapshots','mission_analyses','clarification_questions','clarification_answers'];
  const preserved=tables.map(table=>db.prepare('SELECT * FROM '+table).all()),migrations=db.prepare('SELECT * FROM schema_migrations ORDER BY version').all(),schema=db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();old.close();
  const current=openDatabase(data,()=>{});try{
   const upgraded=current.connection;assert.equal(current.version(),21);tables.forEach((table,i)=>assert.deepEqual(upgraded.prepare('SELECT * FROM '+table).all(),preserved[i]));assert.deepEqual(upgraded.prepare('SELECT * FROM schema_migrations WHERE version<6 ORDER BY version').all(),migrations);
   const after=upgraded.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();for(const item of schema)assert.deepEqual(after.find(x=>x.name===item.name),item);assert.deepEqual(upgraded.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(upgraded.prepare('SELECT phase FROM missions').get()!.phase,'DRAFT');
   assert.equal(upgraded.prepare('SELECT count(*) AS n FROM contract_drafts').get()!.n,0);assert.equal(upgraded.prepare('SELECT count(*) AS n FROM mission_contract_revisions').get()!.n,0);assert.equal(after.filter(x=>x.type==='table').length,schema.filter(x=>x.type==='table').length+49);
  }finally{current.close();}
 }finally{rmSync(root,{recursive:true,force:true});}
});
