import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {careerSafePlaybook,CAREER_CHECK_IDS} from '../apps/server/career-safe-playbook.ts';
import {validatePlaybookDefinition} from '../apps/server/project-playbooks.ts';
import {createPlaybookChecks,parsePlaybookTests} from '../apps/server/playbook-checks.ts';
import {materializeOracleTree} from '../apps/server/oracle-tree.ts';
const report={format:'cc-checks-v1' as const,expectedTestIds:['one']};
for(const [label,payload] of [
 ['missing',''],['zero','CC_CHECKS_JSON: {"testsRun":0,"tests":[]}'],
 ['count mismatch','CC_CHECKS_JSON: {"testsRun":2,"tests":[{"id":"one","status":"PASS"}]}'],
 ['wrong identity','CC_CHECKS_JSON: {"testsRun":1,"tests":[{"id":"other","status":"PASS"}]}'],
 ['skipped','CC_CHECKS_JSON: {"testsRun":1,"tests":[{"id":"one","status":"SKIPPED"}]}'],
] as const)test('explicit check contract rejects '+label,()=>assert.throws(()=>parsePlaybookTests('node-script',payload,report)));
test('explicit report names a failure rather than counting it as PASS',()=>assert.deepEqual(parsePlaybookTests('node-script','CC_CHECKS_JSON: {"testsRun":1,"tests":[{"id":"one","status":"FAIL"}]}',report),[{id:'one',status:'FAIL'}]));
test('playbook file whitelist and report schema reject path escapes and empty identities',()=>{const d=careerSafePlaybook();assert.throws(()=>validatePlaybookDefinition({...d,exportFiles:['../personal']}));assert.throws(()=>validatePlaybookDefinition({...d,exportFiles:[]}));assert.throws(()=>validatePlaybookDefinition({...d,exportFiles:['*.mjs']}));assert.throws(()=>validatePlaybookDefinition({...d,tests:[{...d.tests[0]!,report:{format:'cc-checks-v1',expectedTestIds:[]}}]}));});
test('safe career checks export no tracked personal data and BASE runs exactly five synthetic checks without source writes',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-safe-career-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);mkdirSync(data);
 const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');
 const code=`export function classifyLiveness({finalUrl='',bodyText='',applyControls=[]}={}){if(finalUrl.includes('error=true')||bodyText.includes('no longer open'))return {result:'expired'};if(applyControls.length)return {result:'active'};return {result:'expired'};}`;
 writeFileSync(join(repo,'liveness-core.mjs'),code);writeFileSync(join(repo,'applications.md'),'SYNTHETIC PERSONAL TRACKER DO NOT EXPORT');writeFileSync(join(repo,'test-all.mjs'),'throw Error("OPERATIONAL SCRIPT MUST NOT RUN")');git('add','.');git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm','BASE');const base=git('rev-parse','HEAD'),before=git('status','--porcelain');
 const exported=join(root,'export');await materializeOracleTree(repo,base,exported,['liveness-core.mjs']);assert.deepEqual(readdirSync(exported),['liveness-core.mjs']);
 const checks=createPlaybookChecks(data),p=checks.store.edit(repo,careerSafePlaybook());assert.equal(p.approval,null);const approved=checks.store.approve(repo,p.hash); // Synthetic fixture only, never the real proposal.
 const admitted=await checks.admit(approved,repo,base,new AbortController().signal);assert.deepEqual(admitted.results[0]!.tests.map(t=>t.id),CAREER_CHECK_IDS);assert.ok(admitted.results[0]!.tests.every(t=>t.status==='PASS'));assert.equal(git('status','--porcelain'),before);assert.equal(readFileSync(join(repo,'applications.md'),'utf8'),'SYNTHETIC PERSONAL TRACKER DO NOT EXPORT');
 writeFileSync(join(repo,'liveness-core.mjs'),"export function classifyLiveness(){return {result:'active'};}");git('add','liveness-core.mjs');git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm','known wrong classifier');const result=await checks.check(approved,repo,base,git('rev-parse','HEAD'),new AbortController().signal);assert.equal(result.verdict,'FAILED');assert.match(result.failures.join(),/liveness.expired-apply/);assert.equal(readFileSync(join(repo,'applications.md'),'utf8'),'SYNTHETIC PERSONAL TRACKER DO NOT EXPORT');
});
for(const attack of ['symlink','submodule','oversized'] as const)test('selected export retains whole-tree '+attack+' rejection',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-selected-safety-')),repo=join(root,'repo');mkdirSync(repo);const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');writeFileSync(join(repo,'liveness-core.mjs'),'export const value=1;');git('add','.');git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm','BASE');
 if(attack==='symlink'){symlinkSync('/outside-the-tree',join(repo,'excluded-link'));git('add','excluded-link');}else if(attack==='submodule'){git('update-index','--add','--cacheinfo','160000,'+git('rev-parse','HEAD')+',excluded-submodule');}else{writeFileSync(join(repo,'excluded-large.bin'),Buffer.alloc(8*1024*1024+1));git('add','excluded-large.bin');}
 git('-c','user.name=test','-c','user.email=test@localhost','commit','-qm',attack);await assert.rejects(materializeOracleTree(repo,git('rev-parse','HEAD'),join(root,'export'),['liveness-core.mjs']),/unsafe|symlink|submodule|byte cap/);
});
