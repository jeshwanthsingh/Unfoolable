import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createProjectRecipeStore,type RecipeSeed} from '../apps/server/project-recipes.ts';
import {safeBuildGit} from '../apps/server/build-workspace.ts';
import type {OracleTest,OracleManifest} from '../packages/shared/oracle.ts';
const git=async(repo:string,args:string[])=>(await safeBuildGit(repo,args,10000)).toString().trim();
async function fixture(){
 const root=mkdtempSync(join(tmpdir(),'project-recipes-test-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);mkdirSync(data);
 await git(repo,['init','-q']);
 const revision=async(value:string)=>{writeFileSync(join(repo,'candidate.py'),`def probe():\n    return ${value}\n`);await git(repo,['add','candidate.py']);await git(repo,['-c','user.name=Recipe Test','-c','user.email=recipe@example.invalid','commit','-qm','fixture']);const commit=await git(repo,['rev-parse','HEAD']);return {repo,commit,tree:await git(repo,['rev-parse',commit+'^{tree}'])};};
 const bad=await revision('False'),good=await revision('True');
 // The working tree deliberately differs from both known versions; admission must use exports.
 writeFileSync(join(repo,'candidate.py'),'def probe():\n    return "LIVE SOURCE MUST NOT EXECUTE"\n');
 const check:OracleTest={claimId:'E1',classification:'CHANGE',testId:'oracle_judge.TestOracle.test_e1',summary:'Probe returns True',assurance:'IN-PROCESS',requests:[{id:'value',kind:'CALL',module:'candidate',function:'probe',args:[]}],code:'import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertFalse(observations[0].get("exception"))\n  self.assertIs(observations[0]["returnValue"], True)\n'};
 const manifest:OracleManifest={version:'process-oracle-v1',id:'synthetic-project-recipe',sourceRoot:repo,baseHead:bad.commit,evaluationSignature:'0'.repeat(64),runner:'unittest',runnerDirectory:'.',dependencyRoot:null,componentPath:null,tests:[check],assurance:'IN-PROCESS'};
 const seed:RecipeSeed={projectRoot:repo,displayName:'Synthetic probe',runnerDirectory:'.',manifest,tests:[check],knownGood:good,knownBad:bad};
 const snapshot=async()=>({status:await git(repo,['status','--porcelain=v1']),head:await git(repo,['rev-parse','HEAD']),source:readFileSync(join(repo,'candidate.py'),'utf8')});
 const before=await snapshot(),store=createProjectRecipeStore(data);
 return {root,repo,seed,store,before,snapshot};
}
const signal=()=>new AbortController().signal;
const digest=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function files(root:string):string[]{return readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(root,e.name)):[join(root,e.name)]).sort();}
test('meaningful known-bad FAIL and known-good PASS admit a recipe without changing live source',async()=>{
 const f=await fixture();try{const recipe=await f.store.admit(f.seed,'User approved synthetic recipe',signal());assert.deepEqual(recipe.admission.bad,['FAIL']);assert.deepEqual(recipe.admission.good,['PASS']);assert.equal(recipe.approval.actor,'human');assert.deepEqual(f.store.list(f.repo),[recipe]);assert.deepEqual(await f.snapshot(),f.before);
  const evidence=recipe.admission.evidence.filter(e=>e.path.endsWith('bad-E1.json')||e.path.endsWith('good-E1.json'));assert.equal(evidence.length,2);
  for(const e of evidence){const result=JSON.parse(readFileSync(e.path,'utf8')).result;assert.equal(JSON.parse(result.output).judge.testsRun,1);assert.equal(result.cleanup.verified,true);assert.equal(result.cleanup.ambiguous,false);assert.deepEqual(result.cleanup.remaining,[]);}
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('identical re-admission reuses the same id and performs no execution or writes',async()=>{
 const f=await fixture();try{const first=await f.store.admit(f.seed,'Approved once',signal()),before=files(f.store.root).map(path=>[path,digest(path)]);const aborted=new AbortController();aborted.abort();const repeated=await f.store.admit(structuredClone(f.seed),'Approved again',aborted.signal);assert.equal(repeated.id,first.id);assert.deepEqual(repeated,first);assert.deepEqual(files(f.store.root).map(path=>[path,digest(path)]),before);assert.deepEqual(await f.snapshot(),f.before);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('tampered approved recipe fails closed on list and re-admission',async()=>{
 const f=await fixture();try{const recipe=await f.store.admit(f.seed,'Approved',signal()),path=files(f.store.root).find(p=>p.endsWith(recipe.id+'.json'))!;const raw=JSON.parse(readFileSync(path,'utf8'));raw.approval.reason='Tampered approval';chmodSync(path,0o600);writeFileSync(path,JSON.stringify(raw));assert.throws(()=>f.store.list(f.repo),/changed/);await assert.rejects(f.store.admit(f.seed,'Try again',signal()),/changed/);assert.deepEqual(await f.snapshot(),f.before);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('tampered native admission evidence fails closed',async()=>{
 const f=await fixture();try{const recipe=await f.store.admit(f.seed,'Approved',signal()),path=recipe.admission.evidence.find(e=>e.path.endsWith('bad-E1.json'))!.path;chmodSync(path,0o600);writeFileSync(path,'{"result":{"status":"PASS"}}');assert.throws(()=>f.store.list(f.repo),/changed/);await assert.rejects(f.store.admit(f.seed,'Try again',signal()),/changed/);assert.deepEqual(await f.snapshot(),f.before);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('a vacuous assertion is rejected when known-bad also passes; no approved recipe is saved',async()=>{
 const f=await fixture();try{f.seed.tests[0]!.code='import unittest\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertTrue(True)\n';await assert.rejects(f.store.admit(f.seed,'Approve vacuous check',signal()),/known-good PASS and known-bad meaningful FAIL/);assert.deepEqual(f.store.list(f.repo),[]);assert.equal(files(f.store.root).filter(p=>/\/[a-f0-9]{64}\.json$/.test(p)).length,0);assert.deepEqual(await f.snapshot(),f.before);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('a wrong known-good implementation is rejected and leaves no approved recipe',async()=>{
 const f=await fixture();try{f.seed.knownGood={...f.seed.knownBad};await assert.rejects(f.store.admit(f.seed,'Approve wrong good reference',signal()),/known-good PASS and known-bad meaningful FAIL/);assert.deepEqual(f.store.list(f.repo),[]);assert.equal(files(f.store.root).filter(p=>/\/[a-f0-9]{64}\.json$/.test(p)).length,0);assert.deepEqual(await f.snapshot(),f.before);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
