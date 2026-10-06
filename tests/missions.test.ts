import {test} from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../apps/server/application.ts';
import {loadConfig} from '../apps/server/config.ts';
import {MAX_MISSION_INTENT_LENGTH,isMission,isMissionsResponse} from '../packages/shared/missions.ts';
import type {Mission} from '../packages/shared/missions.ts';
const quiet=()=>{};
async function fixture(){
 const root=mkdtempSync(join(tmpdir(),'cc-missions-'));
 const config={...loadConfig({COMMAND_CENTER_DATA_DIR:join(root,'data'),COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([root])},root),port:0};
 const app=createApplication(config,quiet);await app.start();
 for(const id of ['project-a','project-b'])app.database.connection.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(id,id,join(root,'missing-repository-'+id),'a'.repeat(40),'main','2026-01-01T00:00:00.000Z');
 const a=app.server.address();assert.ok(a&&typeof a!=='string');
 return {root,config,app,url:`http://127.0.0.1:${a.port}`};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function finish(f:Fixture){await f.app.close();rmSync(f.root,{recursive:true});}
async function post(f:Fixture,intent:unknown,project='project-a'){
 const r=await fetch(f.url+`/api/projects/${project}/missions`,{method:'POST',headers:{Origin:f.url,'Content-Type':'application/json'},body:JSON.stringify({originalIntent:intent})});
 return {status:r.status,body:await r.json() as Mission&{error:{code:string;message:string}}};
}
async function list(f:Fixture,project='project-a'){
 const r=await fetch(f.url+`/api/projects/${project}/missions`);assert.equal(r.status,200);
 const data:unknown=await r.json();assert.ok(isMissionsResponse(data));return data.missions;
}
async function restart(f:Fixture){await f.app.close();f.app=createApplication(f.config,quiet);await f.app.start();const a=f.app.server.address();assert.ok(a&&typeof a!=='string');f.url=`http://127.0.0.1:${a.port}`;}

test('creates a DRAFT with stable UUID, relation, original intent and timestamp',async()=>{
 const f=await fixture();try{const r=await post(f,'Fix login.');assert.equal(r.status,201);assert.ok(isMission(r.body));assert.match(r.body.id,/^[a-f0-9-]{36}$/);assert.equal(r.body.projectId,'project-a');assert.equal(r.body.originalIntent,'Fix login.');assert.equal(r.body.phase,'DRAFT');assert.ok(Number.isFinite(Date.parse(r.body.createdAt)));assert.deepEqual(await list(f),[r.body]);}finally{await finish(f);}
});
test('exact multiline formatting and leading/trailing whitespace survive detail and restart',async()=>{
 const f=await fixture();try{const text='  Fix retry race.\n\nObserved:\n  duplicate event under burst load.\n\nDo not change public API yet.\t\n';const r=await post(f,text);assert.equal(r.status,201);assert.equal(r.body.originalIntent,text);await restart(f);const detail=await fetch(f.url+'/api/missions/'+r.body.id);assert.equal(detail.status,200);assert.deepEqual(await detail.json(),r.body);assert.deepEqual(await list(f),[r.body]);}finally{await finish(f);}
});
test('rejects empty, whitespace, wrong types and over-limit intent without rows',async()=>{
 const f=await fixture();try{for(const intent of ['', '   ','\n\t',null,42,'x'.repeat(MAX_MISSION_INTENT_LENGTH+1)]){const r=await post(f,intent);assert.equal(r.status,400);assert.equal(r.body.error.code,'INVALID_MISSION_INTENT');}assert.deepEqual(await list(f),[]);assert.equal((await post(f,'x'.repeat(MAX_MISSION_INTENT_LENGTH))).status,201);}finally{await finish(f);}
});
test('unknown project and mission produce explicit errors without partial writes',async()=>{
 const f=await fixture();try{const created=await post(f,'Fix login.','unknown');assert.equal(created.status,404);assert.equal(created.body.error.code,'PROJECT_NOT_FOUND');for(const path of ['/api/projects/unknown/missions','/api/missions/unknown']){const r=await fetch(f.url+path);assert.equal(r.status,404);assert.equal((await r.json() as {error:{code:string}}).error.code,path.includes('/projects/')?'PROJECT_NOT_FOUND':'MISSION_NOT_FOUND');}assert.equal(f.app.database.connection.prepare('SELECT count(*) AS n FROM missions').get()?.n,0);}finally{await finish(f);}
});
test('identical concurrent intents are separate missions; project isolation and ordering are deterministic',async()=>{
 const f=await fixture();try{const created=await Promise.all([post(f,'Fix login.'),post(f,'Fix login.')]);assert.deepEqual(created.map(r=>r.status),[201,201]);assert.notEqual(created[0]?.body.id,created[1]?.body.id);await post(f,'Make this faster.','project-b');f.app.database.connection.prepare("UPDATE missions SET created_at='2026-01-02T00:00:00.000Z' WHERE project_id='project-a'").run();const missions=await list(f);assert.equal(missions.length,2);assert.deepEqual(missions.map(m=>m.id),missions.map(m=>m.id).sort());assert.equal((await list(f,'project-b')).length,1);assert.ok(missions.every(m=>m.projectId==='project-a'));f.app.database.connection.prepare("UPDATE missions SET created_at='2026-01-03T00:00:00.000Z' WHERE id=?").run(missions[1]!.id);assert.equal((await list(f))[0]?.id,missions[1]?.id);}finally{await finish(f);}
});
test('mission operations require no Git or existing repository and leave project metadata unchanged',async()=>{
 const f=await fixture();const old=process.env.PATH;
 try{const before=f.app.database.connection.prepare('SELECT * FROM projects').all();process.env.PATH='/nonexistent-command-center-test-bin';const r=await post(f,'I think the cache is wrong under burst traffic.');assert.equal(r.status,201);assert.deepEqual(await list(f),[r.body]);assert.equal((await fetch(f.url+'/api/missions/'+r.body.id)).status,200);assert.deepEqual(f.app.database.connection.prepare('SELECT * FROM projects').all(),before);}finally{if(old===undefined)delete process.env.PATH;else process.env.PATH=old;await finish(f);}
});
test('foreign keys restrict deletion; database enforces DRAFT and nonempty intent',async()=>{
 const f=await fixture();try{const insert=f.app.database.connection.prepare('INSERT INTO missions VALUES(?,?,?,?,?)');assert.throws(()=>insert.run('bad','missing','Fix login.','DRAFT','now'),/FOREIGN KEY/);assert.throws(()=>insert.run('bad','project-a','','DRAFT','now'),/CHECK/);assert.throws(()=>insert.run('bad','project-a','Fix login.','BUILDING','now'),/CHECK/);await post(f,'Fix login.');assert.throws(()=>f.app.database.connection.prepare('DELETE FROM projects WHERE id=?').run('project-a'),/FOREIGN KEY/);}finally{await finish(f);}
});
test('mission API preserves Origin and Host guards and bounded JSON errors',async()=>{
 const f=await fixture();try{for(const origin of [undefined,'https://attacker.example']){const headers:Record<string,string>={'Content-Type':'application/json'};if(origin)headers.Origin=origin;const r=await fetch(f.url+'/api/projects/project-a/missions',{method:'POST',headers,body:'{"originalIntent":"Fix login."}'});assert.equal(r.status,403);}const host=await new Promise<number|undefined>((resolve,reject)=>{const req=request(f.url+'/api/projects/project-a/missions',{headers:{Host:'attacker.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(host,421);for(const [body,type,status] of [['{','application/json',400],['[]','application/json',400],['x'.repeat(20000),'application/json',413],['{}','text/plain',415]] as const){const r=await fetch(f.url+'/api/projects/project-a/missions',{method:'POST',headers:{Origin:f.url,'Content-Type':type},body});assert.equal(r.status,status);}assert.deepEqual(await list(f),[]);}finally{await finish(f);}
});
test('failed storage is safe and does not claim a persisted mission',async()=>{
 const f=await fixture();try{f.app.database.connection.exec("CREATE TRIGGER reject_mission BEFORE INSERT ON missions BEGIN SELECT RAISE(ABORT,'private technical detail'); END");const r=await post(f,'Fix login.');assert.equal(r.status,500);assert.equal(r.body.error.code,'MISSION_STORAGE_FAILED');assert.ok(!JSON.stringify(r.body).includes('private technical detail'));assert.deepEqual(await list(f),[]);}finally{await finish(f);}
});
test('accepted Unicode and NUL round-trip exactly; malformed Unicode is rejected instead of rewritten',async()=>{
 const f=await fixture();try{const text='Fix café retry. 🛠️\nLiteral: <script>not executed</script>\u0000End';const r=await post(f,text);assert.equal(r.status,201);assert.equal((await list(f))[0]?.originalIntent,text);for(const bad of ['\ud800','\udfff']){const rejected=await post(f,bad);assert.equal(rejected.status,400);assert.equal(rejected.body.error.code,'INVALID_MISSION_INTENT');}assert.equal((await list(f)).length,1);}finally{await finish(f);}
});
test('shared boundaries reject invalid phase, intent and malformed list',()=>{
 const valid={id:'id',projectId:'project',originalIntent:'Fix login.',phase:'DRAFT',createdAt:new Date().toISOString()};assert.ok(isMission(valid));assert.ok(!isMission({...valid,phase:'BUILDING'}));assert.ok(!isMission({...valid,originalIntent:' '}));assert.ok(!isMissionsResponse({missions:[{}]}));
});
