import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {openDatabase} from '../apps/server/database.ts';
import {createVerifyOnly,scoreVerifyOnly} from '../apps/server/verify-only.ts';
import type {OracleManifest,OracleTest} from '../packages/shared/oracle.ts';
import type {VerifyClaim} from '../packages/shared/verify-only.ts';
const git=(p:string,...args:string[])=>execFileSync('git',['-c','core.hooksPath=/dev/null','-C',p,...args],{encoding:'utf8'}).trim();
const root=()=>realpathSync(mkdtempSync(join(tmpdir(),'cc-verify-only-test-')));
function fixture(){const dir=root(),repo=join(dir,'repo');mkdirSync(repo);git(repo,'init','-q');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@localhost');writeFileSync(join(repo,'app.py'),`def behavior():
 return False
`);git(repo,'add','.');git(repo,'commit','-qm','base');const base=git(repo,'rev-parse','HEAD');writeFileSync(join(repo,'app.py'),`def behavior():
 return True
`);git(repo,'commit','-am','candidate');return {dir,repo,base,candidate:git(repo,'rev-parse','HEAD')};}
const references:NonNullable<Parameters<typeof createVerifyOnly>[5]>=async(_input,source)=>{const path=Object.keys(source.source)[0]!;return {correct:[{path,before:'False',after:'True'}],wrong:[{label:'leaves behavior wrong',edits:[{path,before:'False',after:'False # wrong'}]}]};};
const makeStore=(...args:Parameters<typeof createVerifyOnly>)=>createVerifyOnly(args[0],args[1],args[2],args[3],args[4],references);
const author=async(input:Parameters<NonNullable<Parameters<typeof createVerifyOnly>[3]>>[0],id:string)=>{
 const t:OracleTest={claimId:'E1',classification:'CHANGE',testId:'oracle_judge.TestOracle.test_e1',summary:'The real exported behavior returns true.',code:`import unittest
from oracle_observations import observations
class TestOracle(unittest.TestCase):
 def test_e1(self):
  self.assertTrue(observations[0]["returnValue"])
`,requests:[{id:'r1',kind:'CALL',module:'app',function:'behavior',args:[],resultFields:[]}],assurance:'IN-PROCESS'};
 const c:VerifyClaim={requirement:'REQUIRED',intentQuote:input.intent,targetPaths:['app.py'],id:'E1',classification:'CHANGE',testName:t.testId,summary:t.summary,mode:'AUTOMATED',reason:null,test:t,admission:'REJECTED',baseResult:'PENDING'};
 const human:VerifyClaim={requirement:'REQUIRED',intentQuote:input.intent,targetPaths:['app.py'],id:'E2',classification:'GUARD',testName:'Scope review',summary:'Review conventions and scope.',mode:'HUMAN',reason:'Requires human judgement.',test:null,admission:'NOT CHECKED',baseResult:'NOT CHECKED'};
 const manifest:OracleManifest={version:'process-oracle-v1',id,sourceRoot:input.repoRoot,baseHead:input.baseCommit,evaluationSignature:'0'.repeat(64),runner:'unittest',runnerDirectory:'.',dependencyRoot:null,componentPath:null,tests:[t],assurance:'IN-PROCESS'};
 return {claims:[c,human],manifest,runnerDirectory:'.',source:{runner:'unittest' as const,directory:'.',dependencyRoot:null,source:{'app.py':git(input.repoRoot,'show',input.baseCommit+':app.py')} as Record<string,string>,expectedTests:[],paths:['app.py']}};
};
test('score never treats HUMAN, zero tests, or rejection as full PASS',()=>{
 assert.equal(scoreVerifyOnly([]).status,'NOT CHECKED');assert.equal(scoreVerifyOnly([{id:'E1',requirement:'REQUIRED',status:'NOT CHECKED',reason:'unavailable'}]).status,'NOT CHECKED');
 assert.equal(scoreVerifyOnly([{id:'E1',requirement:'REQUIRED',status:'PASS',reason:null},{id:'E2',requirement:'REQUIRED',status:'NOT CHECKED',reason:'scope'}]).status,'NOT CHECKED');
 assert.equal(scoreVerifyOnly([{id:'E1',requirement:'REQUIRED',status:'FAIL',reason:null},{id:'E2',requirement:'REQUIRED',status:'NOT CHECKED',reason:'scope'}]).status,'FAIL');
 assert.equal(scoreVerifyOnly([{id:'E1',requirement:'REQUIRED',status:'ERROR',reason:'timeout'}]).status,'ERROR');
});
test('real red BASE, explicit approval, immutable Candidate and partial result without other stages',async()=>{
 const f=fixture(),database=openDatabase(join(f.dir,'data'),()=>{}),store=makeStore(database.connection,{dataDir:join(f.dir,'data'),projectRoots:[f.dir]},()=>{},author);
 try{
  writeFileSync(join(f.repo,'local-user-file.txt'),'preserve me');const before=git(f.repo,'status','--porcelain');
  const created=await store.create({repoPath:f.repo,baseRef:f.base,candidateRef:f.candidate,intent:'Make behavior true.'});assert.equal(created.state,'AUTHORING');
  const review=await store.wait(created.id);assert.equal(review.state,'REVIEW',review.error??'');assert.equal(review.review!.claims[0]!.baseResult,'FAIL');assert.equal(review.review!.claims[0]!.admission,'ADMITTED');
  assert.equal(review.result,null);assert.throws(()=>store.approve(created.id,'stale'),/exact/);assert.equal(store.view(created.id).approvedAt,null);
  store.approve(created.id,review.review!.hash);const result=await store.wait(created.id);assert.equal(result.state,'RESULT',result.error??'');assert.equal(result.result!.automatedStatus,'PASS');assert.equal(result.result!.status,'NOT CHECKED');
  const again=store.approve(created.id,review.review!.hash);assert.equal(again.state,'RESULT');assert.deepEqual(again.result,result.result);assert.equal(git(f.repo,'status','--porcelain'),before);assert.equal(readFileSync(join(f.repo,'local-user-file.txt'),'utf8'),'preserve me');
  for(const table of ['missions','mission_analyses','planning_drafts','build_attempts'])assert.equal(database.connection.prepare('SELECT count(*) n FROM '+table).get()!.n,0);
 }finally{await store.close();database.close();}
});
test('review survives restart; approved interrupted work never replays',async()=>{
 const f=fixture(),database=openDatabase(join(f.dir,'data'),()=>{}),store=makeStore(database.connection,{dataDir:join(f.dir,'data'),projectRoots:[f.dir]},()=>{},author);
 const created=await store.create({repoPath:f.repo,baseRef:f.base,candidateRef:f.candidate,intent:'Preserve raw intent.'});const review=await store.wait(created.id);await store.close();
 const restarted=makeStore(database.connection,{dataDir:join(f.dir,'data'),projectRoots:[f.dir]},()=>{},async()=>{throw Error('Must not author again');});assert.equal(restarted.view(created.id).review!.hash,review.review!.hash);
 database.connection.prepare("UPDATE verify_only_runs SET state='VERIFYING',approved_at=? WHERE id=?").run(new Date().toISOString(),created.id);await restarted.close();const recovered=makeStore(database.connection,{dataDir:join(f.dir,'data'),projectRoots:[f.dir]},()=>{});
 assert.equal(recovered.view(created.id).state,'ERROR');assert.equal(recovered.view(created.id).result,null);await recovered.close();database.close();
});
test('same-as-BASE Candidate fails; invalid refs and outside roots create no requests',async()=>{
 const f=fixture(),database=openDatabase(join(f.dir,'data'),()=>{}),store=makeStore(database.connection,{dataDir:join(f.dir,'data'),projectRoots:[f.dir]},()=>{},author);
 try{await assert.rejects(store.create({repoPath:f.repo,baseRef:'--all',candidateRef:f.candidate,intent:'test'}),/local commit/);await assert.rejects(store.create({repoPath:'/etc',baseRef:f.base,candidateRef:f.candidate,intent:'test'}),/outside/);assert.equal(store.list().length,0);
 const item=await store.create({repoPath:f.repo,baseRef:f.base,candidateRef:f.base,intent:'Make true'});const review=await store.wait(item.id);store.approve(item.id,review.review!.hash);assert.equal((await store.wait(item.id)).result!.status,'FAIL');
 }finally{await store.close();database.close();}
});

test('SDK subtree and object-valued CALL observations remain process isolated',async()=>{
 const f=fixture(),sdk=join(f.repo,'sdk/python'),pkg=join(sdk,'pkg');mkdirSync(pkg,{recursive:true});
 writeFileSync(join(pkg,'events.py'),`class Event:
 def __init__(self):
  self.ok=False
  self.reason=None
def parse():
 return Event()
`);
 git(f.repo,'add','.');git(f.repo,'commit','-qm','sdk base');const base=git(f.repo,'rev-parse','HEAD');writeFileSync(join(pkg,'events.py'),readFileSync(join(pkg,'events.py'),'utf8').replace('self.ok=False','self.ok=True'));git(f.repo,'commit','-am','sdk candidate');
 const data=join(f.dir,'data'),database=openDatabase(data,()=>{}),store=makeStore(database.connection,{dataDir:data,projectRoots:[f.dir]},()=>{},async(input,id)=>{
  const result=await author(input,id);result.runnerDirectory='sdk/python';result.claims[0]!.targetPaths=['sdk/python/pkg/events.py'];result.source.directory='sdk/python';result.source.source={'sdk/python/pkg/events.py':git(input.repoRoot,'show',input.baseCommit+':sdk/python/pkg/events.py')};result.source.paths=['sdk/python/pkg/events.py'];result.manifest.runnerDirectory='sdk/python';const t=result.manifest.tests[0]!;t.requests=[{id:'sdk',kind:'CALL',module:'pkg.events',function:'parse',args:[],resultFields:['ok','reason']}];t.code=t.code.replace('observations[0]["returnValue"]','observations[0]["returnValue"]["ok"]');return result;
 });
 try{const created=await store.create({repoPath:f.repo,baseRef:base,candidateRef:'HEAD',intent:'Fix SDK event success.'});const review=await store.wait(created.id);assert.equal(review.state,'REVIEW',review.error??'');assert.equal(review.review!.claims[0]!.baseResult,'FAIL');store.approve(created.id,review.review!.hash);const result=await store.wait(created.id);assert.equal(result.result!.automatedStatus,'PASS',result.error??'');assert.equal(result.result!.status,'NOT CHECKED');}finally{await store.close();database.close();}
});
