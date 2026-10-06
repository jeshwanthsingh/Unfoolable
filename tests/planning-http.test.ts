import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../apps/server/application.ts';
import {loadConfig} from '../apps/server/config.ts';
test('planning APIs preserve Origin and stored-only input and never execute after atomic acceptance',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-plan-http-')),repo=join(root,'repo');mkdirSync(repo);const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}});
 git('init','-q','-b','main');writeFileSync(join(repo,'README.md'),'Repeated retry delivery must preserve one logical record.');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','fixture');
 let calls=0;const app=createApplication({...loadConfig({COMMAND_CENTER_DATA_DIR:join(root,'data'),COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([root])},root),port:0},()=>{},async()=>({toolVersion:'fake',elapsedMs:1,output:{understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}}),async()=>({toolVersion:'fake',elapsedMs:1,output:{goal:{id:'G1',text:'Prevent duplicate retry records.',sourceIds:['intent']},requirements:[{id:'R1',text:'Repeated retry delivery persists one logical record.',sourceIds:['intent']}],scope:[{id:'S1',text:'Retry-record insertion only.',sourceIds:['intent']}],nonGoals:[],constraints:[],assumptions:[],risks:[]}}),async input=>{calls++;assert.equal(input.contract.requirements[0]?.id,'R1');return {toolVersion:'fake',elapsedMs:1,output:{plan:{verticalSlices:[{id:'S1',title:'Duplicate retry delivery',outcome:'Repeated retry delivery persists one logical record.',requirementIds:['R1'],preconditions:['One retry request is pending.'],userVisibleFlow:['Submit the same retry twice.','Inspect exactly one recorded logical result.'],evaluationClaimIds:['E1'],order:1}],crossCuttingRequirements:[],riskHandling:[]},evaluationContract:{claims:[{id:'E1',claim:'Repeated retry delivery persists one logical record.',requirementIds:['R1'],constraintIds:[],riskIds:[],verificationType:'integration',requiredEvidence:['Before/after record counts and logical retry identity show exactly one persisted record.'],preconditions:['One retry request is pending.'],manualRationale:null,notes:''}]}}};});
 await app.start();const a=app.server.address();assert.ok(a&&typeof a!=='string');const url=`http://127.0.0.1:${a.port}`;
 async function post(path:string,body:unknown={},origin=url){const response=await fetch(url+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
 try{
  const p=await post('/api/projects',{displayName:'Fixture',repoPath:repo});const m=await post(`/api/projects/${p.data.id}/missions`,{originalIntent:'Prevent duplicate retry records.'});const id=m.data.id;
  await post(`/api/missions/${id}/context-snapshots`);await post(`/api/missions/${id}/analyses`);const contract=await post(`/api/missions/${id}/contract-drafts`);await post(`/api/contract-drafts/${contract.data.draft.id}/accept`);renameSync(repo,join(root,'unavailable'));
  assert.equal((await post(`/api/missions/${id}/plan-drafts`,{},'https://attacker.example')).status,403);assert.equal((await post(`/api/missions/${id}/plan-drafts`,{repoPath:'/outside'})).status,400);assert.equal(calls,0);
  const drafted=await post(`/api/missions/${id}/plan-drafts`);assert.equal(drafted.status,201);assert.equal(drafted.data.phase,'PLAN_REVIEW');assert.equal(drafted.data.accepted,null);assert.equal(calls,1);
  const attention=await(await fetch(url+'/api/attention')).json();assert.equal(attention.count,1);assert.equal(attention.items[0].kind,'plan_review');
  assert.equal((await post(`/api/plan-drafts/${drafted.data.draft.id}/accept`,{},'https://attacker.example')).status,403);
  const accepted=await post(`/api/plan-drafts/${drafted.data.draft.id}/accept`);assert.equal(accepted.status,200);assert.equal(accepted.data.phase,'PLAN_READY');assert.equal(accepted.data.accepted.plan.pairId,accepted.data.accepted.evaluation.pairId);assert.equal(calls,1);assert.equal((await(await fetch(url+`/api/missions/${id}`)).json()).phase,'PLAN_READY');assert.equal((await(await fetch(url+'/api/attention')).json()).count,0);
 }finally{await app.close();rmSync(root,{recursive:true});}
});
