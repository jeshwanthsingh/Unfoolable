import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApplication} from '../apps/server/application.ts';
test('debug APIs enforce Host/Origin and exact bounded JSON; unknown input creates no execution or debugging artifacts',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-debug-http-')),app=createApplication({dataDir:root,port:0,projectRoots:[],development:false,webRoot:join(root,'web')},()=>{});
 try{await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const origin='http://127.0.0.1:'+address.port,start='/api/missions/missing/debug-sessions',stop='/api/debug-sessions/missing/stop';
 const post=(path:string,body:unknown,extra:Record<string,string>={})=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra},body:JSON.stringify(body)});
 const invalidHost=await new Promise<number>((resolve,reject)=>{const req=request(origin+'/api/missions/missing/debug',{headers:{Host:'attacker.invalid'}},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.end();});assert.equal(invalidHost,421);
 assert.equal((await fetch(origin+start,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"verificationRunId":"missing"}'})).status,403);assert.equal((await post(start,{verificationRunId:'missing'},{Origin:'http://attacker.invalid'})).status,403);assert.equal((await post(stop,{}, {Origin:'http://attacker.invalid'})).status,403);
 for(const body of [{},{verificationRunId:7},{verificationRunId:'../run'},{verificationRunId:'x'.repeat(101)},{verificationRunId:'missing',recipeId:'replacement'},{verificationRunId:'missing',argv:['sh']}])assert.equal((await post(start,body)).status,400);
 assert.equal((await post(stop,{force:true})).status,400);assert.equal((await fetch(origin+start,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{'})).status,400);assert.equal((await post(start,{verificationRunId:'missing',text:'x'.repeat(17000)})).status,413);assert.equal((await fetch(origin+start,{method:'POST',headers:{Origin:origin,'Content-Type':'text/plain'},body:'{}'})).status,415);
 const missing=await post(start,{verificationRunId:'missing'});assert.equal(missing.status,409);assert.equal((await missing.json()).error.code,'DEBUG_INELIGIBLE');const stopped=await post(stop,{});assert.equal(stopped.status,409);assert.equal((await stopped.json()).error.code,'DEBUG_NOT_FOUND');const view=await fetch(origin+'/api/missions/missing/debug');assert.equal(view.status,200);assert.equal((await view.json()).eligible,false);
 for(const table of ['debug_sessions','debug_cycles','debug_packets','debug_diagnoses','debug_events','build_attempts','build_candidates','verification_runs'])assert.equal(app.database.connection.prepare('SELECT count(*) AS n FROM '+table).get()!.n,0,table+' must remain empty');
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
