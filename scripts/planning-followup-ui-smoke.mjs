// Development-only persisted and stale/replacement state checks; domain APIs are never replaced.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
const url=new URL(process.argv[2]),mode=process.argv[3];if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||!['ready','stale','replacement'].includes(mode))throw Error('Disposable loopback registry and known mode only.');
const artifact=resolve('artifacts/breakout-6'),cli=resolve(homedir(),'Projects/ai-lab/bin/playwright-cli'),session='cc6-followup-'+randomUUID().slice(0,8),steps=[];
function run(...args){const output=execFileSync(cli,['-s='+session,...args],{cwd:artifact,encoding:'utf8',timeout:90000});steps.push({args,output});return output;}
function code(body){return run('run-code','async(page)=>{'+body+'}');}
function shot(name){code(`await page.locator('#mission-planning').screenshot({path:${JSON.stringify(resolve(artifact,name))}});`);}
try{
 run('open',url.href,'--browser=chrome');run('resize','1440','1000');code(`await page.getByRole('button',{name:'Projects',exact:true}).click();await page.getByRole('button',{name:'Open project',exact:true}).click();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('#mission-planning .planning-status').waitFor();`);
 if(mode==='ready'){code(`await page.locator('[data-station=Build] .station-status').filter({hasText:'PLAN READY'}).waitFor();await page.getByRole('button',{name:'Revise Accepted Plan',exact:true}).waitFor();await page.locator('#needs-you').getByText('Nothing needs your attention.',{exact:true}).waitFor();await page.getByRole('combobox',{name:'Accepted history'}).selectOption({index:1});await page.getByText('Read-only accepted revision 1.',{exact:false}).waitFor();if(await page.getByRole('button',{name:'Accept Plan + Evaluation Contract',exact:true}).count())throw Error('Historical pair editable');await page.getByRole('combobox',{name:'Accepted history'}).selectOption('');`);}
 if(mode==='stale'){code(`await page.locator('.planning-stale').first().waitFor();if(!await page.getByRole('button',{name:'Accept Plan + Evaluation Contract',exact:true}).isDisabled())throw Error('Stale acceptance enabled');if(await page.locator('[data-station=Build] .station-status').textContent()==='PLAN READY')throw Error('Historical plan ready');`);}
 if(mode==='replacement'){code(`await page.locator('[data-station=Build] .station-status').filter({hasText:'PLAN REVIEW'}).waitFor();await page.locator('#mission-planning .planning-status').filter({hasText:'PLAN REVIEW'}).waitFor();if(!await page.getByRole('button',{name:'Accept Plan + Evaluation Contract',exact:true}).isEnabled())throw Error('Fresh candidate blocked by old pair');await page.getByText('The current candidate can be reviewed and accepted separately.',{exact:false}).waitFor();`);}
 for(const name of ['Verify','Proof'])code(`if(await page.locator('[data-station=${name}]').getAttribute('data-state')!=='locked')throw Error('Execution station active');`);
 shot('plan-'+mode+'-desktop.png');run('resize','390','844');code(`if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');`);shot('plan-'+mode+'-mobile.png');console.log(JSON.stringify({mode,result:'PASS',actualBackend:true,mobile:390}));
}finally{try{run('close');}finally{writeFileSync(resolve(artifact,'browser-'+mode+'.json'),JSON.stringify(steps,null,2));}}
