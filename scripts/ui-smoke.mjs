// Development verifier only. Uses the already-installed Playwright CLI.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const url=new URL(process.argv[2]??'http://127.0.0.1:5173');
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('UI smoke only accepts a loopback HTTP target');
const cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli');
const artifact=resolve('artifacts/breakout-0');mkdirSync(artifact,{recursive:true});
const session='breakout-0-'+randomUUID().slice(0,8);const log=[];
function run(...args){const out=execFileSync(cli,['-s='+session,...args],{cwd:artifact,env:{...process.env,NO_UPDATE_NOTIFIER:'1'},encoding:'utf8',timeout:40000});log.push({args,output:out});return out;}
try{
 run('open',url.href,'--browser=chrome','--idle-timeout=600000');
 run('resize','1440','1000');run('snapshot');
 run('run-code',`async (page) => { await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor(); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); const health=await page.request.get(new URL('/api/health',page.url()).href); const data=await health.json(); if(data.status!=='ok'||data.database.status!=='ready')throw new Error('Actual server health failed'); if(await page.title()!=='Command Center')throw new Error('Wrong title'); if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Desktop overflow'); return {viewport:'desktop',coordinator:data.coordinator,database:data.database.status}; }`);
 run('screenshot','--filename=desktop.png');
 run('resize','390','844');run('snapshot');
 run('run-code',`async (page) => { if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow'); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); return {viewport:'390x844',overflow:false}; }`);
 run('screenshot','--filename=mobile.png');
 run('run-code',`async (page) => { await page.route('**/api/health',route=>route.abort()); await page.getByRole('button',{name:'Check connection'}).click(); await page.getByText('Unavailable',{exact:true}).waitFor(); await page.getByText('Unknown',{exact:true}).waitFor(); return {offlineStatusTruthful:true}; }`);
 run('screenshot','--filename=mobile-offline.png');
 run('run-code',`async (page) => { await page.unroute('**/api/health'); await page.getByRole('button',{name:'Check connection'}).click(); await page.getByText('Online',{exact:true}).waitFor(); await page.getByText('Ready',{exact:true}).waitFor(); return {recovered:true}; }`);
 console.log(JSON.stringify({title:true,actualHealth:true,desktop:true,mobile:true,offline:true,recovery:true}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'ui-smoke.json'),JSON.stringify({url:url.origin,session,steps:log},null,2));}}
