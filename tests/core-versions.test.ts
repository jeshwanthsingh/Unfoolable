import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openDatabase} from '../apps/server/database.ts';
import {createTicket,appendTicketEvent} from '../apps/server/ticket-store.ts';
import {snapshotTicketCheck} from '../apps/server/verdict-snapshot.ts';
import {verifyTicketSeal} from '../apps/server/verdict-seal.ts';
import {createAttestation} from '../apps/server/attestation-format.ts';
import {signingKey} from '../apps/server/signing-key.ts';

function currentFixture(){
 const dir=mkdtempSync(join(tmpdir(),'cc-version-seal-')),database=openDatabase(dir,()=>{}),db=database.connection;
 const ticket=createTicket(db,{title:'Version fixture',requestText:'No human decision',repoPath:'/fixture',baseCommit:'a'.repeat(40)});
 const check=snapshotTicketCheck(dir,{verdict:'NOT CHECKED',gaps:['Fixture'],failures:[],coreFacts:{path:'unsupported',reason:'Fixture'}});
 appendTicketEvent(db,ticket.id,'check_result',check);
 return {dir,database,db,ticket};
}
async function legacyFixture(){
 const root=mkdtempSync(join(tmpdir(),'cc-v1-seal-')),source=join(root,'released');mkdirSync(source);
 const archive=execFileSync('git',['archive','4abc25a','apps/server','packages/shared'],{maxBuffer:32*1024*1024});
 execFileSync('/usr/bin/tar',['-x','-C',source],{input:archive});
 const oldDb=await import(pathToFileURL(join(source,'apps/server/database.ts')).href);
 const oldStore=await import(pathToFileURL(join(source,'apps/server/ticket-store.ts')).href);
 const oldSnapshot=await import(pathToFileURL(join(source,'apps/server/verdict-snapshot.ts')).href);
 const dir=join(root,'data'),database=oldDb.openDatabase(dir,()=>{}),db=database.connection;
 const ticket=oldStore.createTicket(db,{title:'Authentic v1 fixture',requestText:'Legacy trace preserved',repoPath:'/fixture',baseCommit:'a'.repeat(40)});
 // ERROR had a misleading passing trace step in v1; replay must preserve that exact history.
 const facts={path:'combined',native:{verdict:'ERROR',gaps:['Native runner error'],failures:[]},project:{verdict:'PASSED WITH GAPS',gaps:['Intent unchecked'],failures:[]}};
 const check=oldSnapshot.snapshotTicketCheck(dir,{verdict:'ERROR',gaps:[],failures:[],coreFacts:facts});
 oldStore.appendTicketEvent(db,ticket.id,'check_result',check);
 return {root,dir,database,db,ticket};
}
test('an authentic old v1 seal and its original trace verify under the new code',async()=>{
 const f=await legacyFixture();try{
  const seal=verifyTicketSeal(f.db,f.dir,f.ticket.id);assert.equal(seal.state,'SEALED',JSON.stringify(seal));assert.equal(seal.replays,true);
  const result=execFileSync(process.execPath,['scripts/cc.ts','verify',f.ticket.id],{env:{...process.env,COMMAND_CENTER_DATA_DIR:f.dir},encoding:'utf8'});
  assert.match(result,/Sealed\. Replays the same/);
 }finally{f.database.close();rmSync(f.root,{recursive:true,force:true});}
});
test('new snapshots and seals identify v2 and replay it exactly',()=>{
 const f=currentFixture();try{
  const envelope=JSON.parse(String(f.db.prepare('SELECT dsse_json FROM verdict_attestations').get()!.dsse_json));
  const p=JSON.parse(Buffer.from(envelope.payload,'base64').toString()).predicate;
  assert.equal(p.coreVersion,'verdict-core-v2');const registry=JSON.parse(readFileSync('docs/CORE_VERSIONS.json','utf8'));
  assert.equal(p.coreSourceHash,registry.versions.find((v:{version:string})=>v.version===p.coreVersion).sha256);
  assert.equal(verifyTicketSeal(f.db,f.dir,f.ticket.id).state,'SEALED');
 }finally{f.database.close();rmSync(f.dir,{recursive:true,force:true});}
});
for(const attack of ['unknown hash','unknown version'] as const)test('validly signed '+attack+' never falls back to the current core',()=>{
 const f=currentFixture();try{
  const row=f.db.prepare('SELECT * FROM verdict_attestations').get()!,envelope=JSON.parse(String(row.dsse_json));
  const p=JSON.parse(Buffer.from(envelope.payload,'base64').toString()).predicate;
  if(attack==='unknown hash')p.coreSourceHash='f'.repeat(64);else p.coreVersion='verdict-core-future';
  const replaced=createAttestation(p,signingKey(f.dir));f.db.exec('DROP TRIGGER seal_no_update');
  f.db.prepare('UPDATE verdict_attestations SET dsse_json=? WHERE event_sequence=?').run(JSON.stringify(replaced),row.event_sequence as number);
  const seal=verifyTicketSeal(f.db,f.dir,f.ticket.id);assert.equal(seal.state,'BROKEN');assert.equal(seal.label,'Seal broken: unknown core');
 }finally{f.database.close();rmSync(f.dir,{recursive:true,force:true});}
});
test('editing the archived v1 source breaks old seals even if the edit is only a comment',async()=>{
 const f=await legacyFixture();try{
  const app=join(f.root,'current-app');mkdirSync(app);
  for(const path of ['apps/server','packages/shared'])cpSync(resolve(path),join(app,path),{recursive:true});
  mkdirSync(join(app,'docs'));cpSync('docs/CORE_VERSIONS.json',join(app,'docs/CORE_VERSIONS.json'));
  const module=pathToFileURL(join(app,'apps/server/verdict-seal.ts')).href;
  const run=()=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`import {DatabaseSync} from 'node:sqlite';import {verifyTicketSeal} from ${JSON.stringify(module)};const db=new DatabaseSync(${JSON.stringify(join(f.dir,'command-center.sqlite'))},{readOnly:true});console.log(JSON.stringify(verifyTicketSeal(db,${JSON.stringify(f.dir)},${JSON.stringify(f.ticket.id)})));db.close();`],{encoding:'utf8'}));
  assert.equal(run().state,'SEALED');
  const source=join(app,'packages/shared/cores/verdict-core-v1.ts');writeFileSync(source,readFileSync(source,'utf8')+'\n// Edited released source\n');
  const seal=run();assert.equal(seal.state,'BROKEN');assert.equal(seal.label,'Seal broken: unknown core');
 }finally{f.database.close();rmSync(f.root,{recursive:true,force:true});}
});
