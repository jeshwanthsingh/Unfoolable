// Development-only browser verifier; requires a disposable registry with one Mission.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const url=new URL(process.argv[2]??'http://127.0.0.1:3210'),mode=process.argv[3]??'capture';
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||!['capture','recapture','persisted'].includes(mode))throw new Error('Use loopback HTTP and capture/recapture/persisted');
const artifact=resolve('artifacts/breakout-3');mkdirSync(artifact,{recursive:true});
const cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli'),session='breakout-3-'+randomUUID().slice(0,8),steps=[];
function run(...args){const output=execFileSync(cli,['-s='+session,...args],{cwd:artifact,env:{...process.env,NO_UPDATE_NOTIFIER:'1'},encoding:'utf8',timeout:60000});steps.push({args,output});return output;}
try{
 run('open',url.href,'--browser=chrome','--idle-timeout=600000');run('resize','1440','1000');run('snapshot');
 run('run-code',`async(page)=>{await page.getByText('Online',{exact:true}).waitFor();await page.getByText('Ready',{exact:true}).waitFor();await page.getByRole('button',{name:'Open project',exact:true}).click();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.getByRole('heading',{name:'Project Context',exact:true}).waitFor();}`);
 if(mode==='capture'){
  run('run-code',`async(page)=>{await page.getByRole('heading',{name:'Not captured yet.',exact:true}).waitFor();await page.getByRole('button',{name:'Understand Project',exact:true}).waitFor();}`);run('screenshot','--filename=context-empty-desktop.png','--full-page');
 }
 if(mode!=='persisted')run('run-code',`async(page)=>{const started=await page.evaluate(()=>performance.now());const received=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/context-snapshots'));await page.getByRole('button',{name:${JSON.stringify(mode==='capture'?'Understand Project':'Capture again')},exact:true}).click();const response=await received;await response.finished();const elapsed=(await page.evaluate(()=>performance.now()))-started;await page.locator('.context-snapshot').waitFor();await page.getByRole('button',{name:'Capture again',exact:true}).waitFor({state:'visible'});return {captureElapsedMs:elapsed};}`);
 run('snapshot');
 run('run-code',`async(page)=>{const projects=await (await page.request.get(new URL('/api/projects',page.url()).href)).json();if(projects.projects.length!==1)throw new Error('Use one disposable Project');const missions=await (await page.request.get(new URL('/api/projects/'+projects.projects[0].id+'/missions',page.url()).href)).json();if(missions.missions.length!==1)throw new Error('Use one disposable Mission');const mission=missions.missions[0];const r=await page.request.get(new URL('/api/missions/'+mission.id+'/context-snapshots',page.url()).href);const context=await r.json();if(!context.latest||context.count!==${mode==='capture'?1:2})throw new Error('Wrong capture count');const s=context.latest;const card=page.locator('[data-context-id="'+s.id+'"]');await card.waitFor();if(await card.getAttribute('data-context-hash')!==s.snapshotHash)throw new Error('Hash not bound to UI');const text=await card.innerText();for(const fact of [s.payload.baseHead.slice(0,12),s.payload.branch??'Detached HEAD',String(s.payload.trackedFiles.count)])if(!text.includes(fact))throw new Error('Actual fact missing');if(s.payload.workingTree.clean||!text.includes('src/main.ts')||!text.includes('notes.txt'))throw new Error('Actual dirty paths missing');if(!(await page.locator('.mission-detail > .mission-card').innerText()).includes('DRAFT'))throw new Error('Mission phase changed');return {snapshotId:s.id,snapshotHash:s.snapshotHash,count:context.count,workingTree:s.payload.workingTree,tracked:s.payload.trackedFiles};}`);
 if(mode==='capture')run('screenshot','--filename=context-dirty-desktop.png','--full-page');
 if(mode==='recapture')run('screenshot','--filename=context-recapture-desktop.png','--full-page');
 run('resize','390','844');run('snapshot');
 run('run-code',`async(page)=>{if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');const card=page.locator('.context-snapshot');await card.scrollIntoViewIfNeeded();if(!(await card.innerText()).includes('Test-like paths'))throw new Error('Mobile context missing');return {mobile:'390x844',overflow:false};}`);
 if(mode==='capture')run('screenshot','--filename=context-mobile.png','--full-page');
 console.log(JSON.stringify({mode,actualFacts:true,dirty:true,draftPreserved:true,desktop:true,mobile:true}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'ui-smoke-'+mode+'.json'),JSON.stringify({url:url.origin,session,steps},null,2));}}
