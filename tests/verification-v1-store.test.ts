import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,realpathSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {openDatabase} from '../apps/server/database.ts';
import {createVerifyOnly} from '../apps/server/verify-only.ts';
import {verifyHash} from '../apps/server/verify-only-identity.ts';
import {isVerifyView} from '../packages/shared/verify-only.ts';
import type {OracleManifest,OracleTest} from '../packages/shared/oracle.ts';

const git=(repo:string,...args:string[])=>execFileSync('git',['-c','core.hooksPath=/dev/null','-C',repo,...args],{encoding:'utf8'}).trim();
function fixture({fails=false,candidateEditsTests=false}={}){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'cc-v1-store-'))),repo=join(dir,'repo'),data=join(dir,'data');
 mkdirSync(join(repo,'tests'),{recursive:true});git(repo,'init','-q');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@localhost');
 writeFileSync(join(repo,'app.py'),'def behavior():\n return 1\n');
 writeFileSync(join(repo,'tests/test_behavior.py'),'import unittest\nfrom app import behavior\nclass TestBehavior(unittest.TestCase):\n def test_positive(self):\n  self.assertGreater(behavior(), 0)\n');
 git(repo,'add','.');git(repo,'commit','-qm','BASE native positive guard');const base=git(repo,'rev-parse','HEAD');
 writeFileSync(join(repo,'app.py'),'def behavior():\n return '+(fails?'-1':'2')+'\n');
 if(candidateEditsTests)writeFileSync(join(repo,'tests/test_behavior.py'),'import unittest\nclass TestBehavior(unittest.TestCase):\n def test_positive(self):\n  self.assertTrue(True)\n');
 git(repo,'add','.');git(repo,'commit','-qm','Candidate');const candidate=git(repo,'rev-parse','HEAD');git(repo,'reset','--hard',base);
 const db=openDatabase(data,()=>{});let authored=0,references=0;
 const makeStore=()=>createVerifyOnly(db.connection,{dataDir:data,projectRoots:[dir]},()=>{},async()=>{authored++;throw Error('AI authoring was not requested');},undefined,async()=>{references++;throw Error('AI references were not requested');});
 return {dir,repo,data,base,candidate,db,makeStore,counts:()=>({authored,references}),input:{repoPath:repo,baseRef:base,candidateRef:candidate,intent:'Keep behavior positive while changing its value.'}};
}
async function seedRecipe(store:ReturnType<typeof createVerifyOnly>,f:ReturnType<typeof fixture>){
 const check:OracleTest={claimId:'E1',classification:'CHANGE',testId:'oracle_judge.TestOracle.test_recipe',summary:'Behavior returns the approved value two',code:"import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_recipe(self):\n  self.assertEqual(observations[0]['returnValue'], 2)\n",requests:[{id:'behavior',kind:'CALL',module:'app',function:'behavior',args:[],resultFields:[]}],assurance:'IN-PROCESS'};
 const manifest:OracleManifest={version:'process-oracle-v1',id:'native-recipe-fixture',sourceRoot:f.repo,baseHead:f.base,evaluationSignature:'0'.repeat(64),runner:'unittest',runnerDirectory:'.',dependencyRoot:null,componentPath:null,tests:[check],assurance:'IN-PROCESS'};
 return store.recipes.admit({projectRoot:f.repo,displayName:'Behavior contract',runnerDirectory:'.',manifest,tests:[check],knownGood:{repo:f.repo,commit:f.candidate,tree:git(f.repo,'rev-parse',f.candidate+'^{tree}')},knownBad:{repo:f.repo,commit:f.base,tree:git(f.repo,'rev-parse',f.base+'^{tree}')}},'Fixture explicitly approves this behavior contract',new AbortController().signal);
}

test('v1 automatically verifies native BASE tests and gaps can land without AI, checkout or index changes',async()=>{
 const f=fixture(),store=f.makeStore();try{
  const recipe=await seedRecipe(store,f);
  const before={head:git(f.repo,'rev-parse','HEAD'),branch:git(f.repo,'branch','--show-current'),status:git(f.repo,'status','--porcelain=v1'),index:readFileSync(join(f.repo,'.git/index'))};
  const created=await store.create(f.input);assert.equal(created.state,'VERIFYING');assert.equal(created.approvedAt,null);
  const done=await store.wait(created.id);assert.equal(done.state,'RESULT',done.error??'');assert.equal(isVerifyView(done),true);assert.equal(done.result?.status,'PASS');assert.equal(done.result?.acceptance,'PASSED WITH GAPS');assert.equal(done.result?.v1?.canLand,true);
  assert.deepEqual(f.counts(),{authored:0,references:0});assert.equal(done.result!.v1!.layers[0]!.checks[0]!.id,'test_behavior.TestBehavior.test_positive');assert.equal(done.result!.v1!.layers[0]!.status,'PASS');assert.equal(done.result!.v1!.layers[1]!.status,'PASS');assert.equal(done.result!.v1!.layers[1]!.checks.length,1);assert.deepEqual(done.result!.v1!.recipeIds,[recipe.id]);assert.equal(done.result!.v1!.layers[2]!.status,'NOT CHECKED');assert.deepEqual(done.result!.v1!.gaps.map(g=>g.id),['ai-task-checks']);
  await assert.rejects(store.land(created.id,'wrong-evidence'),/current bound/);
  const sealedResult=readFileSync(join(f.data,'verify-only',created.id,'result.json'));
  const landed=await store.land(created.id,done.result!.evidence!.hash),proof=landed.result!.v1!.landed!;assert.ok(proof);assert.equal(isVerifyView(landed),true);
  assert.equal(git(f.repo,'rev-parse','refs/heads/'+proof.branch),proof.commit);assert.equal(git(f.repo,'rev-parse',proof.commit+'^{tree}'),git(f.repo,'rev-parse',f.candidate+'^{tree}'));assert.equal(git(f.repo,'rev-parse',proof.commit+'^'),f.base);
  assert.deepEqual((await store.land(created.id,done.result!.evidence!.hash)).result!.v1!.landed,proof);
  assert.deepEqual(readFileSync(join(f.data,'verify-only',created.id,'result.json')),sealedResult);
  assert.equal(git(f.repo,'rev-parse','HEAD'),before.head);assert.equal(git(f.repo,'branch','--show-current'),before.branch);assert.equal(git(f.repo,'status','--porcelain=v1'),before.status);assert.deepEqual(readFileSync(join(f.repo,'.git/index')),before.index);
  for(const table of ['missions','mission_analyses','planning_drafts','build_attempts'])assert.equal(f.db.connection.prepare('SELECT count(*) n FROM '+table).get()!.n,0);
 }finally{await store.close();f.db.close();}
});

test('candidate-edited passing tests cannot hide a failing restored BASE test or allow landing',async()=>{
 const f=fixture({fails:true,candidateEditsTests:true}),store=f.makeStore();try{
  const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.status,'FAIL',done.error??'');assert.equal(done.result?.v1?.verdict,'FAILED');assert.equal(done.result?.v1?.canLand,false);assert.equal(done.result!.v1!.layers[0]!.checks[0]!.status,'FAIL');assert.equal(isVerifyView(done),true);
  assert.deepEqual(done.result!.v1!.candidateTests,{authoritative:false,status:'PASS',paths:['tests/test_behavior.py']});
  const e=done.result!.evidence!;assert.notEqual(e.candidateExport.path,e.overlay.path);assert.match(readFileSync(join(e.overlay.path,'tests/test_behavior.py'),'utf8'),/assertGreater/);assert.match(readFileSync(join(e.candidateExport.path,'tests/test_behavior.py'),'utf8'),/assertTrue/);
  await assert.rejects(store.land(created.id,e.hash),/current bound/);assert.deepEqual(f.counts(),{authored:0,references:0});
 }finally{await store.close();f.db.close();}
});

test('candidate, restored overlay, executed tree, approved recipe and recorded result tampering independently become STALE',async()=>{
 for(const target of ['candidate','overlay','execution','recipe','result'] as const){const f=fixture(),store=f.makeStore();try{
  const recipe=await seedRecipe(store,f);
  const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.status,'PASS',done.error??'');const e=done.result!.evidence!;
  const path=target==='candidate'?join(e.candidateExport.path,'app.py'):target==='overlay'?join(e.overlay.path,'unexpected.py'):target==='execution'?join(e.executionTree.path,'app.py'):target==='recipe'?join(store.recipes.root,verifyHash(f.repo),recipe.id+'.json'):join(f.data,'verify-only',created.id,'result.json');
  if(target==='result'||target==='recipe')chmodSync(path,0o600);
  if(target==='recipe'){recipe.definition.tests[0]!.summary='Changed after verification';writeFileSync(path,JSON.stringify(recipe));}else writeFileSync(path,'tampered evidence');
  const stale=store.view(created.id);assert.equal(stale.result?.status,'STALE',target);assert.equal(stale.result?.acceptance,'NOT VERIFIED');assert.equal(stale.result?.v1,undefined);assert.equal(isVerifyView(stale),true);await assert.rejects(store.land(created.id,e.hash),/current bound/);
 }finally{await store.close();f.db.close();}}
});

test('abandonment during automatic verification is idempotent and never permits landing',async()=>{
 const f=fixture(),store=f.makeStore();try{
  const created=await store.create(f.input),first=await store.abandon(created.id),second=await store.abandon(created.id);assert.ok(first.abandonedAt);assert.equal(second.abandonedAt,first.abandonedAt);assert.equal(second.result?.status,'CANCELLED',second.error??'');assert.notEqual(second.result?.acceptance,'VERIFIED');await assert.rejects(store.land(created.id,''),/current bound/);
  assert.throws(()=>f.db.connection.prepare("UPDATE verify_only_runs SET ledger_json=json_remove(ledger_json,'$.abandonedAt') WHERE id=?").run(created.id),/immutable/);
 }finally{await store.close();f.db.close();}
});

test('invalid registered project, refs and outside roots create no verification requests',async()=>{
 const f=fixture(),store=f.makeStore();try{
  await assert.rejects(store.create({...f.input,projectId:'missing'}),(e:unknown)=>typeof e==='object'&&e!==null&&'status'in e&&e.status===404);
  await assert.rejects(store.create({...f.input,baseRef:'--all'}),/local commit/);await assert.rejects(store.create({...f.input,repoPath:'/etc'}),/outside/);assert.equal(store.list().length,0);
 }finally{await store.close();f.db.close();}
});

test('historical verification stays archived and STALE without rewriting stored results or creating branches',async()=>{
 const f=fixture(),store=f.makeStore();try{
  await seedRecipe(store,f);
  const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.status,'PASS',done.error??'');const historical={...done.result!};delete historical.v1;
  f.db.connection.prepare("INSERT INTO verify_only_runs(id,input_json,state,result_json,created_at,protocol_version,ledger_json) VALUES('historical',?,'RESULT',?,?,1,'{}')").run(JSON.stringify(done.input),JSON.stringify(historical),'2000-01-01T00:00:00.000Z');
  const before=f.db.connection.prepare("SELECT * FROM verify_only_runs WHERE id='historical'").get(),branches=git(f.repo,'for-each-ref','refs/heads');
  assert.equal(store.view('historical').result?.status,'STALE');assert.equal(isVerifyView(store.view('historical')),true);await assert.rejects(store.land('historical',done.result!.evidence!.hash),/current bound/);
  assert.deepEqual(f.db.connection.prepare("SELECT * FROM verify_only_runs WHERE id='historical'").get(),before);assert.equal(git(f.repo,'for-each-ref','refs/heads'),branches);
 }finally{await store.close();f.db.close();}
});

test('completed v1 evidence survives restart and is not re-executed',async()=>{
 const f=fixture();let store=f.makeStore();try{
  await seedRecipe(store,f);
  const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.status,'PASS',done.error??'');await store.close();store=f.makeStore();assert.deepEqual(store.view(created.id).result,done.result);assert.deepEqual(f.counts(),{authored:0,references:0});assert.equal(isVerifyView(store.view(created.id)),true);
 }finally{await store.close();f.db.close();}
});

test('missing project recipes are an unchecked mandatory layer and block landing',async()=>{
 const f=fixture(),store=f.makeStore();try{
  const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.v1?.layers[0]?.status,'PASS',done.error??'');assert.equal(done.result?.v1?.layers[1]?.status,'ERROR');assert.equal(done.result?.v1?.verdict,'ERROR');assert.equal(done.result?.v1?.canLand,false);assert.ok(done.result!.v1!.gaps.some(g=>g.id==='project-recipes'));assert.equal(isVerifyView(done),true);await assert.rejects(store.land(created.id,done.result!.evidence!.hash),/current bound/);
 }finally{await store.close();f.db.close();}
});

test('tampered durable Land intent cannot change the verified branch, evidence, tree or BASE parent',async()=>{
 const f=fixture(),store=f.makeStore();try{
  await seedRecipe(store,f);const created=await store.create(f.input),done=await store.wait(created.id);assert.equal(done.result?.status,'PASS',done.error??'');
  const e=done.result!.evidence!,branches=git(f.repo,'for-each-ref','refs/heads'),tree=git(f.repo,'rev-parse',f.candidate+'^{tree}'),wrongParent=git(f.repo,'commit-tree',tree,'-p',f.candidate,'-m','Wrong parent fixture');
  const legitimate={branch:'cc/verify-'+created.id,commit:f.candidate,createdAt:new Date().toISOString(),evidenceHash:e.hash};
  for(const changed of [{branch:'unrelated-branch'},{evidenceHash:'0'.repeat(64)},{commit:f.base},{commit:wrongParent}]){
   writeFileSync(join(f.data,'verify-only',created.id,'land-intent.json'),JSON.stringify({...legitimate,...changed}));
   await assert.rejects(store.land(created.id,e.hash),(error:unknown)=>typeof error==='object'&&error!==null&&'code'in error&&error.code==='LAND_INTENT_CHANGED');assert.equal(git(f.repo,'for-each-ref','refs/heads'),branches);assert.equal(git(f.repo,'rev-parse','HEAD'),f.base);assert.equal(store.view(created.id).result?.v1?.landed,null);
  }
 }finally{await store.close();f.db.close();}
});
