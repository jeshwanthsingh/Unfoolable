import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {request} from 'node:http';
import {createApplication} from '../apps/server/application.ts';
import {isSpecView} from '../packages/shared/spec.ts';
test('only the merged Spec decision surface is exposed, with unchanged Host/Origin/body fences',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-spec-http-')),app=createApplication({dataDir:root,port:0,projectRoots:[],development:false,webRoot:join(root,'web')},()=>{},undefined,undefined,undefined,undefined,undefined,{autoPrepare:false});
 try{
  const db=app.database.connection;db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('p','Fixture',root,'a'.repeat(40),null,'2026-01-01');db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('m','p','Fix one defect.','DRAFT','2026-01-01');await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const origin='http://127.0.0.1:'+address.port;
  const post=(path:string,body:unknown,headers:Record<string,string>={})=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const host=await new Promise<number>((resolve,reject)=>{const req=request(origin+'/api/missions/m/spec',{headers:{Host:'attacker.invalid'}},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.end();});assert.equal(host,421);
  assert.equal((await fetch(origin+'/api/missions/m/spec/accept',{method:'POST',body:'{}'})).status,403);
  assert.equal((await post('/api/missions/m/spec/accept',{}, {Origin:'https://attacker.invalid'})).status,403);
  for(const body of [{},{specId:1},{specId:'s',argv:['sh']},{specId:'s',force:true}])assert.equal((await post('/api/missions/m/spec/accept',body)).status,400);
  const malformed=await fetch(origin+'/api/missions/m/spec/accept',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  assert.equal((await post('/api/missions/m/spec/accept',{specId:'x'.repeat(20000)})).status,413);
  assert.equal((await post('/api/missions/m/spec/accept',{specId:'stale'})).status,409);
  assert.equal((await post('/api/missions/m/spec/land',{runId:'stale'})).status,409);
  assert.equal((await post('/api/missions/m/spec/abandon',{force:true})).status,400);
  const state=await (await fetch(origin+'/api/missions/m/spec')).json();assert.ok(isSpecView(state));assert.equal(state.phase,'NEEDS_YOU');assert.equal(state.accepted,false);assert.deepEqual(state.decisionEvents,[]);
  for(const path of ['/api/missions/m/contract','/api/missions/m/planning','/api/missions/m/contract-drafts','/api/missions/m/plan-drafts','/api/contract-drafts/d/accept','/api/plan-drafts/d/accept','/api/missions/m/build-attempts','/api/missions/m/verification-runs','/api/missions/m/debug-sessions','/api/missions/m/analyses'])assert.equal((await post(path,{})).status,404,path);
  for(const table of ['mission_decisions','build_attempts','verification_runs','debug_sessions','mission_outcomes'])assert.equal(db.prepare('SELECT COUNT(*) n FROM '+table).get()!.n,0);
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
