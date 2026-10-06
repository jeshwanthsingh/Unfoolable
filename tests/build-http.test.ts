import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {createApplication} from '../apps/server/application.ts';
import type {BuilderDriver} from '../packages/shared/build.ts';
test('fixed builder REST routes preserve Host/Origin, input bounds and fail-closed admission',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-build-http-'));let calls=0;
 const driver:BuilderDriver={version:async()=> 'codex-cli 0.160.0',run:async()=>{calls++;throw Error('must not run');},reconcile:async()=>({verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null})};
 const app=createApplication({dataDir:join(root,'data'),projectRoots:[root],port:0,development:false,webRoot:root},()=>{},undefined,undefined,undefined,driver);
 try{
  const db=app.database.connection;db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('p','Project',root,'a'.repeat(40),null,'2026-01-01');db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('m','p','Intent','DRAFT','2026-01-01');await app.start();const addr=app.server.address();assert.ok(addr&&typeof addr!=='string');const base=`http://127.0.0.1:${addr.port}`,url=base+'/api/missions/m/build-attempts';
  assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://attacker.invalid'},body:'{}'})).status,403);
  const hostStatus=await new Promise<number>(resolve=>{const r=request(base+'/api/missions/m/build',{headers:{Host:'evil.invalid'}},s=>{s.resume();resolve(s.statusCode!);});r.end();});assert.equal(hostStatus,421);
  const post=(body:string)=>fetch(url,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body});
  for(const body of ['{','{}','{"sliceId":"S1","command":"echo unsafe"}','{"sliceId":"S1/../"}'])assert.equal((await post(body)).status,400);
  assert.equal((await post(JSON.stringify({sliceId:'S1',extra:'x'.repeat(17000)}))).status,413);
  const blocked=await post('{"sliceId":"S1"}');assert.equal(blocked.status,409);assert.equal((await blocked.json() as {error:{code:string}}).error.code,'PLAN_NOT_READY');
  assert.equal((await fetch(base+'/api/missions/m/build?after=-1')).status,400);
  assert.equal((await fetch(base+'/api/missions/unknown/build')).status,404);
  const view=await (await fetch(base+'/api/missions/m/build')).json() as {attempt:unknown;eligible:boolean;phase:string};assert.equal(view.attempt,null);assert.equal(view.eligible,false);assert.equal(view.phase,'DRAFT');assert.equal(calls,0);assert.equal(db.prepare('SELECT count(*) AS n FROM build_attempts').get()!.n,0);
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
