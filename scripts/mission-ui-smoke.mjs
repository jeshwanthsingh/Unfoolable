// Development-only verifier: uses the existing Playwright CLI, not a product adapter.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const url=new URL(process.argv[2]??'http://127.0.0.1:3210');
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Verifier requires loopback HTTP');
const mode=process.argv[3]??'create';if(!['create','persisted'].includes(mode))throw new Error('Expected create or persisted');
const artifact=resolve('artifacts/breakout-2');mkdirSync(artifact,{recursive:true});
const session='breakout-2-'+randomUUID().slice(0,8),steps=[];
const cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli');
const original='  Fix retry race.\n\nObserved:\n  duplicate event under burst load.\n\nDo not change public API yet.\t\n';
const second='Make this faster.';
function run(...args){const output=execFileSync(cli,['-s='+session,...args],{cwd:artifact,env:{...process.env,NO_UPDATE_NOTIFIER:'1'},encoding:'utf8',timeout:40000});steps.push({args,output});return output;}
try{
 run('open',url.href,'--browser=chrome','--idle-timeout=600000');run('resize','1440','1000');run('snapshot');
 run('run-code',`async(page)=>{await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor();await page.getByText('Online',{exact:true}).waitFor();await page.getByText('Ready',{exact:true}).waitFor();const r=await page.request.get(new URL('/api/projects',page.url()).href);const data=await r.json();if(data.projects.length!==1)throw new Error('Use a disposable database with exactly one registered Project');await page.getByRole('button',{name:'Open project',exact:true}).click();await page.getByRole('heading',{name:'Missions',exact:true}).waitFor();return {projectId:data.projects[0].id};}`);
 if(mode==='create'){
  run('run-code',`async(page)=>{await page.getByRole('heading',{name:'No missions yet.',exact:true}).waitFor();}`);
  run('screenshot','--filename=mission-empty-desktop.png');
  run('run-code',`async(page)=>{await page.getByRole('button',{name:'New Mission',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Create Mission',exact:true}).click();await page.getByRole('alert').waitFor();if(!(await page.getByRole('alert').innerText()).includes('Describe what you want'))throw new Error('Empty validation missing');}`);
  run('snapshot');
  run('run-code',`async(page)=>{await page.getByLabel('What are we building?',{exact:true}).fill(${JSON.stringify(original)});await page.getByRole('button',{name:'Create Mission',exact:true}).click();await page.locator('.mission-card').waitFor();if(await page.getByRole('dialog').count())throw new Error('Composer remained open');}`);
  run('run-code',`async(page)=>{await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('.original-request').waitFor();if(await page.locator('.original-request').textContent()!==${JSON.stringify(original)})throw new Error('Detail changed raw intent');await page.getByText('DRAFT',{exact:true}).waitFor();await page.getByRole('button',{name:'Back to Missions',exact:true}).click();await page.getByRole('button',{name:'New Mission',exact:true}).click();await page.getByLabel('What are we building?',{exact:true}).fill(${JSON.stringify(second)});await page.getByRole('button',{name:'Create Mission',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.mission-list .mission-card').length===2);}`);
 }
 run('run-code',`async(page)=>{const project=(await (await page.request.get(new URL('/api/projects',page.url()).href)).json()).projects[0];const r=await page.request.get(new URL('/api/projects/'+project.id+'/missions',page.url()).href);const data=await r.json();if(data.missions.length!==2)throw new Error('Expected two durable missions');if(!data.missions.some(m=>m.originalIntent===${JSON.stringify(original)})||!data.missions.some(m=>m.originalIntent===${JSON.stringify(second)}))throw new Error('Exact content missing');for(const m of data.missions){const card=page.locator('[data-mission-id="'+m.id+'"]');await card.waitFor();if(await card.locator('.mission-intent').textContent()!==m.originalIntent)throw new Error('List content differs');if(m.phase!=='DRAFT')throw new Error('Untruthful phase');}return {missions:data.missions};}`);
 run('screenshot','--filename=missions-'+mode+'-desktop.png');
 run('resize','390','844');run('snapshot');
 run('run-code',`async(page)=>{if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('390px overflow');await page.getByRole('button',{name:'Open Mission',exact:true}).last().click();await page.locator('.original-request').waitFor();if(await page.locator('.original-request').textContent()!==${JSON.stringify(original)})throw new Error('Mobile original changed');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile detail overflow');return {mobile:'390x844',exactOriginal:true};}`);
 if(mode==='create'){
  run('screenshot','--filename=mission-detail-mobile.png','--full-page');
  run('run-code',`async(page)=>{await page.getByRole('button',{name:'Back to Missions',exact:true}).click();await page.getByRole('button',{name:'New Mission',exact:true}).click();await page.getByLabel('What are we building?',{exact:true}).fill('   ');await page.getByRole('button',{name:'Create Mission',exact:true}).click();await page.getByRole('alert').waitFor();const box=await page.getByRole('button',{name:'Create Mission',exact:true}).boundingBox();if(!box||box.x<0||box.x+box.width>390)throw new Error('Mobile composer unusable');if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile composer overflow');}`);
  run('screenshot','--filename=mission-validation-mobile.png');
 }
 console.log(JSON.stringify({empty:mode==='create',creation:mode==='create',detail:true,multiple:true,persisted:mode==='persisted',emptyValidation:mode==='create',desktop:true,mobile:true}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'ui-smoke-'+mode+'.json'),JSON.stringify({url:url.origin,session,steps},null,2));}}
