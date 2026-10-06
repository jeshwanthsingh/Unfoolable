import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../apps/server/application.ts';
import {loadConfig} from '../apps/server/config.ts';
test('contract API preserves security, compiles from DB without recrawl, and requires separate acceptance',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-contract-http-')),repo=join(root,'repo');mkdirSync(repo);const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}});
 git('init','-q','-b','main');writeFileSync(join(repo,'README.md'),'Preserve API compatibility.');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','fixture');
 let calls=0;const app=createApplication({...loadConfig({COMMAND_CENTER_DATA_DIR:join(root,'data'),COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([root])},root),port:0},()=>{},async()=>({toolVersion:'fake',elapsedMs:1,output:{understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}}),async input=>{calls++;assert.equal(input.bindings.originalIntent,'Fix retry behavior.');return {toolVersion:'fake',elapsedMs:1,output:{goal:{id:'G1',text:'Fix retry behavior.',sourceIds:['intent']},requirements:[{id:'R1',text:'Fix retry behavior.',sourceIds:['intent']}],scope:[{id:'S1',text:'Retry behavior.',sourceIds:['intent']}],nonGoals:[],constraints:[],assumptions:[],risks:[]}};});
 await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const url=`http://127.0.0.1:${address.port}`;
 async function send(path:string,body:unknown={},origin=url){const r=await fetch(url+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 try{
  const project=await send('/api/projects',{displayName:'Fixture',repoPath:repo});const mission=await send(`/api/projects/${project.data.id}/missions`,{originalIntent:'Fix retry behavior.'});const id=mission.data.id;
  await send(`/api/missions/${id}/context-snapshots`);await send(`/api/missions/${id}/analyses`);renameSync(repo,join(root,'moved-fixture'));
  assert.equal((await send(`/api/missions/${id}/contract-drafts`,{},'https://attacker.example')).status,403);
  assert.equal((await send(`/api/missions/${id}/contract-drafts`,{repoPath:'/outside'})).status,400);assert.equal(calls,0);
  const drafted=await send(`/api/missions/${id}/contract-drafts`);assert.equal(drafted.status,201);assert.equal(calls,1);assert.equal(drafted.data.phase,'CONTRACT_REVIEW');assert.equal(drafted.data.accepted,null);
  const attention=await(await fetch(url+'/api/attention')).json();assert.equal(attention.count,1);assert.equal(attention.items[0].kind,'contract_review');
  assert.equal((await send(`/api/contract-drafts/${drafted.data.draft.id}/accept`,{},'https://attacker.example')).status,403);
  const accepted=await send(`/api/contract-drafts/${drafted.data.draft.id}/accept`);assert.equal(accepted.status,200);assert.equal(accepted.data.phase,'CONTRACT_READY');assert.equal((await(await fetch(url+`/api/missions/${id}`)).json()).phase,'CONTRACT_READY');assert.equal((await(await fetch(url+'/api/attention')).json()).count,0);assert.equal(calls,1);
 }finally{await app.close();rmSync(root,{recursive:true});}
});
