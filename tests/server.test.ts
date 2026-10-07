import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../apps/server/application.ts';
import {loadConfig} from '../apps/server/config.ts';

async function fixture(){const dir=mkdtempSync(join(tmpdir(),'cc-http-'));const events:unknown[]=[];const app=createApplication({...loadConfig({COMMAND_CENTER_DATA_DIR:dir},'/tmp/example'),port:0},event=>events.push(event));await app.start();const a=app.server.address();assert.ok(a&&typeof a!=='string');return {app,dir,events,url:`http://127.0.0.1:${a.port}`,port:a.port};}
async function cleanup(f:Awaited<ReturnType<typeof fixture>>){await f.app.close();rmSync(f.dir,{recursive:true});}
test('health reflects a ready database and listener binds to IPv4 loopback',async()=>{
 const f=await fixture();try{const response=await fetch(f.url+'/api/health');assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'ok',version:'0.0.1',coordinator:'online',database:{status:'ready',schemaVersion:11}});assert.equal((f.app.server.address() as {address:string}).address,'127.0.0.1');}finally{await cleanup(f);}
});
test('unknown route returns a structured error',async()=>{
 const f=await fixture();try{const r=await fetch(f.url+'/api/nope');assert.equal(r.status,404);assert.deepEqual(await r.json(),{error:{code:'NOT_FOUND',message:'Route not found'}});}finally{await cleanup(f);}
});
test('unexpected Host is rejected before routing',async()=>{
 const f=await fixture();try{const code=await new Promise<number>(resolve=>{const r=request(f.url+'/api/health',{headers:{Host:'attacker.example'}},s=>{s.resume();resolve(s.statusCode!);});r.end();});assert.equal(code,421);}finally{await cleanup(f);}
});
test('mutating requests require an exact local Origin even though no mutation route exists',async()=>{
 const f=await fixture();try{
  assert.equal((await fetch(f.url+'/api/health',{method:'POST'})).status,403);
  assert.equal((await fetch(f.url+'/api/health',{method:'POST',headers:{Origin:'https://attacker.example'}})).status,403);
  assert.equal((await fetch(f.url+'/api/health',{method:'POST',headers:{Origin:f.url}})).status,404);
 }finally{await cleanup(f);}
});
test('shutdown is idempotent, closes the listener and releases database ownership',async()=>{
 const f=await fixture();await f.app.close();await f.app.close();assert.equal(f.app.server.listening,false);assert.equal(f.app.server.address(),null);
 assert.ok(f.events.some(x=>(x as {event:string}).event==='shutdown.completed'));
 await assert.rejects(fetch(f.url+'/api/health'));rmSync(f.dir,{recursive:true});
});
test('health never stays green after database failure',async()=>{
 const f=await fixture();try{f.app.database.connection.close();const r=await fetch(f.url+'/api/health');assert.equal(r.status,503);const d=await r.json() as {database:{status:string}};assert.equal(d.database.status,'unavailable');}finally{await cleanup(f);}
});
test('failed port binding closes SQLite and releases the new instance lock',async()=>{
 const f=await fixture();const dir=mkdtempSync(join(tmpdir(),'cc-bind-'));const other=createApplication({...loadConfig({COMMAND_CENTER_DATA_DIR:dir},'/tmp/example'),port:f.port},()=>{});
 try{await assert.rejects(other.start(),{code:'EADDRINUSE'});assert.equal(other.database.connection.isOpen,false);}finally{await other.close();await cleanup(f);rmSync(dir,{recursive:true});}
});
