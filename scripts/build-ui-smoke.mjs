// Development browser checks only: never a target-project evaluator.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
const artifact=resolve('artifacts/breakout-7'),session=JSON.parse(readFileSync(join(artifact,'smoke-session.json'),'utf8'));
const url=new URL(session.url);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('Owned loopback fixture only');
const baseline=JSON.parse(readFileSync(join(artifact,'live-candidate.json'),'utf8'));
const cli=join(homedir(),'Projects/ai-lab/bin/playwright-cli'),steps=[];
const run=(...args)=>{const output=execFileSync(cli,['-s=cc7-smoke',...args],{encoding:'utf8',timeout:60000,cwd:artifact});steps.push({args,output});return output;};
const code=body=>run('run-code','async(page)=>{'+body+'}');
const shot=(name,selector='#mission-build')=>code(`await page.locator(${JSON.stringify(selector)}).screenshot({path:${JSON.stringify(join(artifact,name))}});`);
try{
 code(`await page.unrouteAll();`);run('goto',url.href);run('snapshot');run('resize','1440','1000');
 code(`await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('#mission-build .build-status').filter({hasText:'CANDIDATE READY'}).waitFor();const v=await(await page.request.get(new URL('/api/missions/${session.missionId}/build',page.url()).href)).json();if(v.candidate.id!==${JSON.stringify(baseline.candidate.id)}||v.candidate.treeHash!==${JSON.stringify(baseline.candidate.treeHash)}||v.attempt.id!==${JSON.stringify(baseline.attempt.id)}||v.workerPresent)throw Error('Restart identity mismatch or fake worker');if(await page.getByText('Codex worker present',{exact:true}).count())throw Error('Worker after cleanup');if(await page.getByRole('button',{name:'Start Build',exact:true}).count())throw Error('Automatic second slice available');for(const station of ['Verify','Proof'])if(await page.locator('[data-station='+station+']').getAttribute('data-state')!=='locked')throw Error('Verification implied');`);
 shot('candidate-restarted-desktop.png');shot('mission-journey-desktop.png','.mission-detail');
 code(`const s=page.locator('#mission-build summary').filter({hasText:'View Candidate'});await s.focus();await page.keyboard.press('Enter');if(!await s.locator('..').evaluate(el=>el.open))throw Error('Keyboard disclosure failed');await page.locator('#mission-build').getByText('approval.py',{exact:true}).waitFor();`);shot('candidate-diff-refined-desktop.png');
 code(`await page.locator('#mission-build summary').filter({hasText:'Builder checks'}).click();await page.getByText('Local development checks reported by the Builder. They do not establish Evaluation Claim results.',{exact:true}).waitFor();`);shot('builder-checks-desktop.png');
 code(`await page.locator('#mission-build summary').filter({hasText:'Builder checks'}).click();`);
 run('resize','768','1000');code(`if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Tablet overflow');`);shot('candidate-tablet.png');
 run('resize','390','844');code(`if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');`);shot('candidate-mobile.png');
 code(`await page.emulateMedia({reducedMotion:'reduce'});if(await page.evaluate(()=>getComputedStyle(document.querySelector('.view-entry')).animationName)!=='none')throw Error('Reduced motion ignored');`);
 // A failed read must never leave previously confirmed worker presence on screen.
 code(`const v=${JSON.stringify(baseline)};v.candidate=null;v.phase='BUILDING';v.workerPresent=true;v.attempt.status='RUNNING';await page.route('**/api/missions/*/build*',r=>r.fulfill({json:v}));await page.reload();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.getByText('Codex worker present',{exact:true}).waitFor();await page.unrouteAll();await page.route('**/api/missions/*/build*',r=>r.abort());await page.getByText('Build records unavailable. Refresh to confirm the current attempt.',{exact:true}).waitFor();if(await page.getByText('Codex worker present',{exact:true}).count())throw Error('Stale worker presence');`);shot('status-unavailable-adapter-fixture.png');code(`await page.unrouteAll();`);
 // Explicit adapter-response fixtures verify error presentation; real server state is unchanged.
 for(const [name,status,failureCode,message] of [['permission-blocked-adapter-fixture.png','FAILED','UNSUPPORTED_PERMISSION_REQUEST','Builder requested an unsupported permission. No capability was granted.'],['timeout-adapter-fixture.png','INTERRUPTED','BUILD_TIMEOUT','Builder exceeded its bounded lifetime; owned execution stopped.']]){
  code(`await page.route('**/api/missions/*/build*',async route=>{if(route.request().method()!=='GET')return route.continue();const v=${JSON.stringify(baseline)};v.candidate=null;v.phase='PLAN_READY';v.eligible=true;v.workerPresent=false;v.attempt.status=${JSON.stringify(status)};v.attempt.failureCode=${JSON.stringify(failureCode)};v.attempt.failureMessage=${JSON.stringify(message)};await route.fulfill({json:v});});await page.reload();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('#mission-build [role=alert]').filter({hasText:${JSON.stringify(message)}}).waitFor();`);shot(name);
  code(`await page.unrouteAll();`);
 }
 code(`await page.reload();await page.getByRole('button',{name:'Open Mission',exact:true}).click();await page.locator('#mission-build .build-status').filter({hasText:'CANDIDATE READY'}).waitFor();`);
 writeFileSync(join(artifact,'browser-results.json'),JSON.stringify({result:'PASS',realFlows:['PLAN_READY selected Slice','explicit Start Build','real worker and structured events (earlier captures)','Candidate changed files and bounded diff','non-authoritative checks','Verify awaiting','same Candidate after restart','no worker or second build after Candidate'],widths:[1440,768,390],keyboard:'native disclosure Enter passed',reducedMotion:'animationName none',errorFlows:'permission-blocked and timeout use clearly labeled browser adapter response fixtures; product database unchanged',steps},null,2));
}catch(error){writeFileSync(join(artifact,'browser-failure.json'),JSON.stringify({message:String(error),steps},null,2));throw error;}
