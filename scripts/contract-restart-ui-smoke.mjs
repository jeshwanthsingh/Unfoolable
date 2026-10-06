// Development-only verification of persisted ready or deliberately stale disposable registries.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
const url=new URL(process.argv[2]),mode=process.argv[3];if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||!['ready','stale'].includes(mode))throw Error('Use a disposable loopback ready/stale registry.');
const artifact=resolve('artifacts/breakout-5'),cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli'),session='cc5-restart-'+randomUUID().slice(0,8),steps=[];
function run(...args){const output=execFileSync(cli,['-s='+session,...args],{cwd:artifact,encoding:'utf8',timeout:90000});steps.push({args,output});return output;}
function code(body){return run('run-code','async(page)=>{'+body+'}');}
function shot(name){code(`await page.locator('#mission-contract').screenshot({path:${JSON.stringify(resolve(artifact,name))}});`);}
try{
 run('open',url.href,'--browser=chrome');run('resize','1440','1000');
 code(`await page.getByRole('button',{name:'Projects',exact:true}).click();await page.getByRole('button',{name:'Open project',exact:true}).click();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('#mission-contract .contract-status').waitFor();`);
 if(mode==='ready'){code(`await page.locator('[data-station="Define"] .station-status').filter({hasText:'CONTRACT READY'}).waitFor();await page.getByRole('button',{name:'Revise Contract',exact:true}).waitFor();await page.locator('#needs-you').getByText('Nothing needs your attention.',{exact:true}).waitFor();`);shot('contract-restarted-desktop.png');}
 else{
  code(`await page.locator('.contract-stale').waitFor();if(!await page.getByRole('button',{name:'Accept Contract',exact:true}).isDisabled())throw Error('Stale acceptance enabled');if(await page.locator('[data-station="Define"] .station-status').textContent()==='CONTRACT READY')throw Error('Stale contract ready');const editor=page.locator('.decision-editor').first();if(!await editor.evaluate(el=>el.open))await editor.locator('summary').click();await editor.getByRole('textbox').fill('Changed disposable decision remains single-use for the designated operator and requires fresh contract review.');await editor.getByRole('button',{name:'Update answer',exact:true}).click();await page.locator('.clarification-question').first().getByText('Answer saved.',{exact:true}).waitFor();await page.locator('.contract-stale').waitFor();if(!await page.getByRole('button',{name:'Accept Contract',exact:true}).isDisabled())throw Error('Answer edit bypassed currentness');`);shot('contract-stale-desktop.png');
 }
 run('resize','390','844');code(`if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');`);shot('contract-'+mode+'-mobile.png');console.log(JSON.stringify({mode,result:'PASS',actualBackend:true,mobile:390}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'browser-'+mode+'.json'),JSON.stringify(steps,null,2));}}
