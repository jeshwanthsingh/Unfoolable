import {homedir} from 'node:os';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {executeProtectedExistingTests,classifyExistingTests,collectExistingTests,vitestTestIdentity} from '../apps/server/protected-existing-tests.ts';import {brokerExclusion} from '../apps/server/oracle-suite-policy.ts';import type {OracleManifest} from '../packages/shared/oracle.ts';
function fixture(body:string,directory='.'){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'cc-protected-existing-'))),workspace=join(dir,'workspace');mkdirSync(join(workspace,'tests'),{recursive:true});writeFileSync(join(workspace,'tests/test_base.py'),body);
 const manifest:OracleManifest={version:'process-oracle-v1',id:'fixture',sourceRoot:workspace,baseHead:'0'.repeat(40),evaluationSignature:'0'.repeat(64),runner:'unittest',runnerDirectory:directory,dependencyRoot:null,componentPath:null,tests:[],assurance:'IN-PROCESS'};
 return {dir,workspace,manifest};
}
const base='import unittest\nclass Base(unittest.TestCase):\n def test_one(self):self.assertEqual(1,1)\n';
async function run(f:ReturnType<typeof fixture>,ids=['test_base.Base.test_one'],paths=['tests/test_base.py']){return executeProtectedExistingTests(f.manifest,f.workspace,f.dir,ids,paths,new AbortController().signal);}
test('BASE-only suite excludes a malicious Candidate-only test and records authoritative native identity',async()=>{const f=fixture(base);writeFileSync(join(f.workspace,'tests/test_candidate.py'),"raise RuntimeError('Candidate-only test must never import')");const r=await run(f);assert.equal(r.status,'PASS',JSON.stringify(r));assert.deepEqual(r.tests,[{id:'test_base.Base.test_one',status:'passed'}]);assert.equal(r.execution.cleanup.verified,true);});
test('zero collected BASE tests never pass',async()=>{const r=await run(fixture('import unittest\n'),[],[]);assert.equal(r.status,'ERROR',JSON.stringify(r));assert.equal(r.tests[0]?.status,'zero-collected');});
test('a named native skip becomes a gap and never a passed record',async()=>{const f=fixture("import unittest\nclass Base(unittest.TestCase):\n @unittest.skip('needs unavailable service')\n def test_one(self):pass\n"),r=await run(f);assert.equal(r.status,'ERROR',JSON.stringify(r));assert.equal(r.tests[0]?.status,'skipped');assert.equal(r.gaps[0]?.id,'test_base.Base.test_one');});
test('native assertion failures remain FAIL, runtime test errors remain ERROR',async()=>{const f=fixture(base.replace('self.assertEqual(1,1)','self.assertEqual(1,2)'));assert.equal((await run(f)).status,'FAIL');writeFileSync(join(f.workspace,'tests/test_base.py'),base.replace('self.assertEqual(1,1)',"raise RuntimeError('environment')"));assert.equal((await run(f)).status,'ERROR');});
test('authorized credential exclusion is named without executing its body',async()=>{const f=fixture(base,'sdk/python');writeFileSync(join(f.workspace,'tests/test_broker_smoke.py'),"import unittest\nclass BrokerSmokeIntegrationTests(unittest.TestCase):\n def test_broker_examples(self):raise AssertionError('credential test must not execute')\n");const r=await run(f,['test_base.Base.test_one',brokerExclusion.testId],['tests/test_base.py','tests/test_broker_smoke.py']);assert.equal(r.status,'PASS',JSON.stringify(r));assert.deepEqual(r.tests.find(t=>t.status==='excluded'),{id:brokerExclusion.testId,status:'excluded',reason:brokerExclusion.reason});});
test('frontend native suite needs no browser or UI component and preserves exact test names',async()=>{const dir=realpathSync(mkdtempSync(join(tmpdir(),'cc-protected-vitest-'))),workspace=join(dir,'workspace');mkdirSync(join(workspace,'frontend/src'),{recursive:true});writeFileSync(join(workspace,'package.json'),JSON.stringify({type:'module'}));writeFileSync(join(workspace,'frontend/tsconfig.json'),'{}');writeFileSync(join(workspace,'frontend/src/base.test.ts'),"import {test,expect,describe} from 'vitest';describe('BASE group',()=>test('base identity',()=>expect(1).toBe(1)));");writeFileSync(join(workspace,'frontend/src/candidate.test.ts'),"throw Error('Candidate-only test imported');");const manifest:OracleManifest={version:'process-oracle-v1',id:'fixture',sourceRoot:workspace,baseHead:'0'.repeat(40),evaluationSignature:'0'.repeat(64),runner:'vitest',runnerDirectory:'frontend',dependencyRoot:realpathSync(join(homedir(),'Projects/Therapy2/frontend/node_modules')),componentPath:null,tests:[],assurance:'IN-PROCESS'};const r=await executeProtectedExistingTests(manifest,workspace,dir,[JSON.stringify(['src/base.test.ts','BASE group base identity'])],['src/base.test.ts'],new AbortController().signal);assert.equal(r.status,'PASS',JSON.stringify(r));assert.deepEqual(r.tests,[{id:JSON.stringify(['src/base.test.ts','BASE group base identity']),status:'passed'}]);});

test('unittest failing subtests preserve BASE identity and never escape failure classification',async()=>{const f=fixture("import unittest\nclass Base(unittest.TestCase):\n def test_one(self):\n  for i in range(2):\n   with self.subTest(i=i):self.assertEqual(i,3)\n"),r=await run(f);assert.equal(r.status,'FAIL',JSON.stringify(r));assert.deepEqual(r.tests.map(t=>[t.id,t.status]),[['test_base.Base.test_one','failed']]);});

test('Vitest native file and full-name identities distinguish repeated titles',()=>{
 const f=fixture(base);f.manifest.runner='vitest';
 const path=join(f.dir,'native-records.json');
 const records=(items:{title:string;fullName:string;status:string}[])=>{
  writeFileSync(path,JSON.stringify({version:'observations-v1',observations:[{id:'protected-existing-suite',exception:null,returnValue:{root:f.workspace,exitCode:0,report:{numTotalTests:items.length,testResults:[{name:join(f.workspace,'base.test.ts'),assertionResults:items,status:'passed'}]}}}]}));
  return {status:'PASS' as const,output:'{}',truncated:false,durationMs:1,cleanup:{verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null},environment:{observationPath:path}};
 };
 const one={title:'a title',fullName:'Parent Child a title',status:'passed'};
 const good=classifyExistingTests(f.manifest,[vitestTestIdentity(f.workspace,join(f.workspace,'base.test.ts'),one.fullName)],records([one]));assert.equal(good.status,'PASS');assert.equal(good.tests[0]?.id,vitestTestIdentity(f.workspace,join(f.workspace,'base.test.ts'),one.fullName));
 const duplicate=classifyExistingTests(f.manifest,[vitestTestIdentity(f.workspace,join(f.workspace,'base.test.ts'),one.fullName)],records([one,one]));assert.equal(duplicate.status,'ERROR');assert.match(duplicate.gaps[0]?.reason??'',/Duplicate/);
 const extra=classifyExistingTests(f.manifest,[vitestTestIdentity(f.workspace,join(f.workspace,'base.test.ts'),one.fullName)],records([one,{title:'extra',fullName:'Child extra',status:'passed'}]));assert.equal(extra.status,'ERROR');assert.ok(extra.gaps.some(g=>g.id===vitestTestIdentity(f.workspace,join(f.workspace,'base.test.ts'),'Child extra')));
});

test('native unittest loader collects dynamic Unicode IDs without executing bodies',async()=>{
 const f=fixture("import unittest\nclass Base(unittest.TestCase):pass\ndef forbidden(self):raise AssertionError('collection must not execute')\nsetattr(Base,'test_हिन्दी_😀',forbidden)\n");
 const inventory=await collectExistingTests(f.manifest,f.workspace,join(f.dir,'collection'),['tests/test_base.py'],new AbortController().signal);
 assert.deepEqual(inventory.ids,['test_base.Base.test_हिन्दी_😀']);
});

test('native collection uses loader error records rather than interpreting test names',async()=>{
 const good=fixture("import unittest\nclass Base(unittest.TestCase):\n def test_handles_FailedTest(self):pass\n");
 const collected=await collectExistingTests(good.manifest,good.workspace,join(good.dir,'collection'),['tests/test_base.py'],new AbortController().signal);assert.deepEqual(collected.ids,['test_base.Base.test_handles_FailedTest']);
 const bad=fixture("import unittest\ndef load_tests(loader,suite,pattern):raise RuntimeError('setup failure')\n");
 await assert.rejects(collectExistingTests(bad.manifest,bad.workspace,join(bad.dir,'collection'),['tests/test_base.py'],new AbortController().signal),/BASE unittest collection failed/);
});


test('large display preview does not invalidate complete native evidence; actual pipe truncation still fails closed',async()=>{
 const {oracleOutputPreview}=await import('../apps/server/oracle-execution.ts');
 const f=fixture(base),path=join(f.dir,'complete-native.json');
 writeFileSync(path,JSON.stringify({observations:[{id:'protected-existing-suite',returnValue:{testsRun:1,tests:[{id:'test_base.Base.test_one',outcome:'passed'}],excludedTests:[]}}]}));
 const execution={status:'PASS' as const,...oracleOutputPreview({large:'x'.repeat(40000)}),durationMs:1,cleanup:{verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null},environment:{observationPath:path}};
 assert.equal(execution.previewTruncated,true);assert.equal(execution.truncated,false);
 assert.equal(classifyExistingTests(f.manifest,['test_base.Base.test_one'],execution).status,'PASS');
 assert.equal(classifyExistingTests(f.manifest,['test_base.Base.test_one'],{...execution,...oracleOutputPreview({},true)}).status,'ERROR');
});
