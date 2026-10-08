import test from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApplication} from '../apps/server/application.ts';
test('verification APIs retain Host/Origin and bounded typed errors without exposing files or executing code',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-verification-http-'));
 const app=createApplication({dataDir:root,port:0,projectRoots:[],development:false,webRoot:join(root,'web')},()=>{});
 try{
  await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const origin='http://127.0.0.1:'+address.port;
  const post=(path:string,body:unknown,extra:Record<string,string>={})=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra},body:JSON.stringify(body)});
  const hostStatus=await new Promise<number>((resolve,reject)=>{const req=request(origin+'/api/missions/missing/verification',{headers:{Host:'attacker.invalid'}},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.end();});assert.equal(hostStatus,421);
  assert.equal((await fetch(origin+'/api/missions/missing/verification-runs',{method:'POST',body:'{}'})).status,403);
  assert.equal((await post('/api/missions/missing/verification-runs',{}, {Origin:'http://attacker.invalid'})).status,403);
  const missing=await post('/api/missions/missing/verification-runs',{});assert.equal(missing.status,404);assert.equal((await missing.json()).error.code,'NOT_FOUND');
  assert.equal((await post('/api/missions/missing/verification-runs',{argv:['sh']})).status,404);
  assert.equal((await post('/api/verification-runs/missing/claims/E1/decision',{status:'PASS',note:'   '})).status,400);
  assert.equal((await post('/api/verification-runs/missing/stop',{})).status,404);
  assert.equal((await fetch(origin+'/api/verification-runs/missing/evidence/unknown')).status,404);
  assert.equal((await fetch(origin+'/api/verification-runs/missing/evidence/%2Fetc%2Fpasswd')).status,404);
  const malformed=await fetch(origin+'/api/missions/missing/verification-runs',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,404);
  const oversized=await post('/api/missions/missing/verification-runs',{text:'x'.repeat(70000)});assert.equal(oversized.status,404);
  assert.equal(app.database.connection.prepare('SELECT count(*) AS n FROM verification_runs').get()!.n,0);
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
