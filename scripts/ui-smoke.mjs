// Development verifier only. Uses the already-installed Playwright CLI.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {dirname} from 'node:path';
const url=new URL(process.argv[2]??'http://127.0.0.1:5173');
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('UI smoke only accepts a loopback HTTP target');
const cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli');
const repoPath=process.argv[3];const mode=process.argv[4]??'register';
const artifact=resolve('artifacts/breakout-1');mkdirSync(artifact,{recursive:true});
const session='breakout-1-'+randomUUID().slice(0,8);const log=[];
function run(...args){const out=execFileSync(cli,['-s='+session,...args],{cwd:artifact,env:{...process.env,NO_UPDATE_NOTIFIER:'1'},encoding:'utf8',timeout:40000});log.push({args,output:out});return out;}
try{
 run('open',url.href,'--browser=chrome','--idle-timeout=600000');
 run('resize','1440','1000');run('snapshot');
 run('run-code',`async (page) => { await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor(); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); const health=await page.request.get(new URL('/api/health',page.url()).href); const data=await health.json(); if(data.status!=='ok'||data.database.status!=='ready')throw new Error('Actual server health failed'); if(await page.title()!=='Command Center')throw new Error('Wrong title'); if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Desktop overflow'); return {viewport:'desktop',coordinator:data.coordinator,database:data.database.status}; }`);
 run('run-code',`async (page) => { await page.getByRole('button',{name:'Projects',exact:true}).click(); await page.getByRole('heading',{name:'Projects',exact:true}).waitFor(); }`);
 if(repoPath&&mode==='register'){
  run('run-code',`async(page)=>{await page.getByRole('heading',{name:'No projects yet.',exact:true}).waitFor();}`);
  run('screenshot','--filename=empty-desktop.png');
  run('run-code',`async(page)=>{await page.getByRole('button',{name:'Add Project',exact:true}).click();await page.getByRole('dialog').waitFor();}`);run('snapshot');
  run('run-code',`async(page)=>{await page.getByLabel('Project name',{exact:true}).fill('Local registration fixture');await page.getByLabel('Repository path',{exact:true}).fill(${JSON.stringify(resolve(dirname(repoPath),'missing-repository'))});await page.getByRole('button',{name:'Register Project',exact:true}).click();await page.getByRole('alert').waitFor();if(!(await page.getByRole('alert').innerText()).includes('does not exist'))throw new Error('Useful path error missing');}`);
  run('resize','390','844');run('screenshot','--filename=registration-error-mobile.png');run('resize','1440','1000');
  run('run-code',`async(page)=>{await page.getByLabel('Repository path',{exact:true}).fill(${JSON.stringify(repoPath)});await page.getByRole('button',{name:'Register Project',exact:true}).click();await page.getByRole('heading',{name:'Local registration fixture',exact:true}).waitFor();if(await page.getByRole('dialog').count())throw new Error('Registration did not close');}`);
 }
 if(repoPath){run('run-code',`async(page)=>{await page.getByRole('heading',{name:'Local registration fixture',exact:true}).waitFor();const r=await page.request.get(new URL('/api/projects',page.url()).href);const data=await r.json();if(data.projects.length!==1)throw new Error('Expected exactly one persisted project');const p=data.projects[0];const card=page.locator('[data-project-id="'+p.id+'"]');if(await card.count()!==1)throw new Error('Card identity mismatch');if(!(await card.innerText()).includes(p.registeredHead.slice(0,7)))throw new Error('Actual HEAD not rendered');if(!(await card.innerText()).includes(p.registeredBranch??'Detached HEAD'))throw new Error('Actual branch not rendered');return {id:p.id,registeredHead:p.registeredHead,registeredBranch:p.registeredBranch};}`);}
 run('screenshot','--filename='+(mode==='persisted'?'persisted-desktop.png':'projects-desktop.png'));
 run('resize','390','844');run('snapshot');
 run('run-code',`async (page) => { if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow'); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); return {viewport:'390x844',overflow:false}; }`);
 run('screenshot','--filename=projects-mobile.png','--full-page');
 if(repoPath&&mode==='persisted'){run('run-code',`async(page)=>{await page.getByRole('button',{name:'Add Project',exact:true}).click();await page.getByLabel('Project name',{exact:true}).fill('Duplicate fixture');await page.getByLabel('Repository path',{exact:true}).fill(${JSON.stringify(repoPath)}+'/');await page.getByRole('button',{name:'Register Project',exact:true}).click();await page.getByRole('alert').waitFor();if(!(await page.getByRole('alert').innerText()).includes('already registered'))throw new Error('Duplicate conflict missing');await page.getByRole('button',{name:'Cancel',exact:true}).click();}`);}
 run('run-code',`async (page) => { await page.route('**/api/health',route=>route.abort()); await page.getByRole('button',{name:'Check connection'}).click(); await page.getByText('Unavailable',{exact:true}).waitFor(); await page.getByText('Unknown',{exact:true}).waitFor(); return {offlineStatusTruthful:true}; }`);
 run('run-code',`async (page) => { await page.unroute('**/api/health'); await page.getByRole('button',{name:'Check connection'}).click(); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); return {recovered:true}; }`);
 console.log(JSON.stringify({title:true,actualHealth:true,desktop:true,mobile:true,offline:true,recovery:true,registration:!!repoPath&&mode==='register',persisted:!!repoPath&&mode==='persisted'}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'ui-smoke-'+mode+'.json'),JSON.stringify({url:url.origin,session,steps:log},null,2));}}
