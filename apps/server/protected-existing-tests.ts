import {readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
export const vitestTestIdentity=(root:string,file:string,name:string)=>JSON.stringify([relative(root,file).split('\\').join('/'),name]);
import {executeOracleTest,type OracleExecution} from './oracle-execution.ts';
import {suiteExclusions} from './oracle-suite-policy.ts';
import type {OracleManifest,OracleTest} from '../../packages/shared/oracle.ts';
export type ExistingTestRecord={id:string;status:'passed'|'failed'|'error'|'skipped'|'excluded'|'zero-collected';reason?:string};
export type ExistingTestsOutcome={status:'PASS'|'FAIL'|'ERROR';tests:ExistingTestRecord[];gaps:{id:string;reason:string}[];execution:OracleExecution};
export function classifyExistingTests(manifest:OracleManifest,expectedTests:string[],execution:OracleExecution):ExistingTestsOutcome{
 const inventoryIds:string[]=[];
 const tests:ExistingTestRecord[]=[],gaps:{id:string;reason:string}[]=[];
 const gap=(id:string,reason:string)=>gaps.push({id,reason});
 try{
  if(execution.status!=='PASS'||execution.truncated||!execution.cleanup.verified||execution.cleanup.ambiguous||execution.cleanup.remaining.length||!execution.environment.observationPath)throw Error('Native suite observations or cleanup unavailable');
  const packet=JSON.parse(readFileSync(String(execution.environment.observationPath),'utf8'));
  const row=packet.observations.find((r:{id:string})=>r.id==='protected-existing-suite');
  if(!row||row.exception||!row.returnValue)throw Error(row?.exception?.message??'Native suite result unavailable');
  const native=row.returnValue;
  if(manifest.runner==='unittest'){
   if(!Array.isArray(native.tests)||!Array.isArray(native.excludedTests))throw Error('Native unittest records malformed');
   for(const r of native.tests){
    if(typeof r.id!=='string'||!['passed','failed','error','skipped','expected-failure','unexpected-success'].includes(r.outcome))throw Error('Native unittest identity or outcome malformed');
    const status=r.outcome==='expected-failure'?'skipped':r.outcome==='unexpected-success'?'failed':r.outcome;
    inventoryIds.push(r.id);tests.push({id:r.id,status,...(r.reason?{reason:r.reason}:r.outcome==='expected-failure'?{reason:'Native expected failure'}:{})});
   }
   const allowed=suiteExclusions(manifest.runnerDirectory,expectedTests);
   for(const r of native.excludedTests){if(r.status!=='EXCLUDED'||!allowed.some(e=>e.testId===r.testId&&e.reason===r.reason))throw Error('Unapproved native exclusion');inventoryIds.push(r.testId);tests.push({id:r.testId,status:'excluded',reason:r.reason});}
   if(native.testsRun!==native.tests.length)throw Error('Native unittest count differs from result records');
  }else{
   if(!native.report||!Array.isArray(native.report.testResults)||![0,1].includes(native.exitCode))throw Error('Native Vitest report unavailable');
   for(const file of native.report.testResults){
    if(!Array.isArray(file.assertionResults))throw Error('Native Vitest assertion records malformed');
    for(const r of file.assertionResults){if(typeof r.title!=='string'||typeof r.fullName!=='string'||!['passed','failed','pending','todo','skipped'].includes(r.status))throw Error('Native Vitest identity or outcome malformed');inventoryIds.push(vitestTestIdentity(String(native.root),file.name,r.fullName));tests.push({id:vitestTestIdentity(String(native.root),file.name,r.fullName),status:r.status==='passed'?'passed':r.status==='failed'?'failed':'skipped',...(r.status==='passed'?{}:{reason:r.failureMessages?.join('\n')||'Native '+r.status})});}
    if(!file.assertionResults.length&&file.status==='failed')gap(file.name,'Native Vitest file failed before collecting tests');
   }
   if(native.report.numUnhandledErrors>0||native.report.snapshot?.failure||native.report.snapshot?.unchecked>0)gap('native-suite','Native Vitest report contains unhandled errors or incomplete snapshots');
   if(native.report.numTotalTests!==tests.length)throw Error('Native Vitest total differs from assertion records');
   if(native.exitCode!==0&&!tests.some(t=>t.status==='failed'))gap('native-suite','Native runner failed without a recorded assertion failure');
  }
  const ids=inventoryIds,expected=[...expectedTests].sort();
  if(new Set(tests.map(t=>t.id)).size!==tests.length||new Set(ids).size!==ids.length||new Set(expected).size!==expected.length)gap('native-suite','Duplicate BASE or native test identities');
  for(const id of expected)if(!ids.includes(id))gap(id,'Frozen BASE test was not collected');
  for(const id of ids)if(!expected.includes(id))gap(id,'Native test is outside frozen BASE inventory');
  if(!tests.some(t=>t.status!=='excluded')){tests.push({id:'native-suite',status:'zero-collected',reason:'No included BASE tests collected'});gap('native-suite','Zero collected included tests cannot prove a pass');}
  for(const t of tests)if(t.status==='skipped'||t.status==='error')gap(t.id,t.reason??'Native '+t.status);
 }catch(error){gap('native-suite',error instanceof Error?error.message:'Native suite observation error');}
 return {status:tests.some(t=>t.status==='failed')?'FAIL':gaps.length?'ERROR':'PASS',tests,gaps,execution};
}
export async function executeProtectedExistingTests(manifest:OracleManifest,workspace:string,runDirectory:string,expectedTests:string[],baseTestPaths:string[],signal:AbortSignal,ownership:Parameters<typeof executeOracleTest>[5]={},collectOnly=false):Promise<ExistingTestsOutcome>{
 const runnerRoot=manifest.runner==='unittest'?workspace:join(workspace,manifest.runnerDirectory);
 const testId=manifest.runner==='unittest'?'oracle_judge.TestOracle.test_existing':'Protected existing tests';
 const code=manifest.runner==='unittest'?`import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_existing(self):\n  self.assertEqual(len(observations),1)\n`:`import {test,expect} from 'vitest';import {observations} from './observations.mjs';test('Protected existing tests',()=>{expect(observations.length).toBe(1);});`;
 const test:OracleTest={claimId:'E1',classification:'GUARD',testId,summary:'Frozen BASE native tests',code,requests:[{id:'protected-existing-suite',kind:'SUITE',expectedTests,excludedTests:suiteExclusions(manifest.runnerDirectory,expectedTests),fixtureInput:{root:runnerRoot,testPaths:baseTestPaths,collectOnly}}]};
 // Paths come from the frozen BASE archive, never Candidate discovery. Reject globs and escapes.
 if(baseTestPaths.some(p=>!p||p.startsWith('/')||p.includes('\\')||p.split('/').some(s=>!s||s==='.'||s==='..')||/[?*{}[\]]/.test(p)))throw Error('Invalid frozen BASE test path');
 const execution=await executeOracleTest(manifest,test,workspace,runDirectory,signal,ownership);
 return classifyExistingTests(manifest,expectedTests,execution);
}

/** Runner-reported inventory from a disposable BASE export, never Candidate source. */
export async function collectExistingTests(manifest:OracleManifest,baseWorkspace:string,runDirectory:string,paths:string[],signal:AbortSignal){
 const outcome=await executeProtectedExistingTests(manifest,baseWorkspace,runDirectory,[],paths,signal,{},true),execution=outcome.execution;
 if(execution.status!=='PASS'||execution.truncated||!execution.cleanup.verified||execution.cleanup.ambiguous||execution.cleanup.remaining.length||typeof execution.environment.observationPath!=='string')throw Error('BASE native collection unavailable');
 const packet=JSON.parse(readFileSync(execution.environment.observationPath,'utf8')),row=packet.observations.find((r:{id:string})=>r.id==='protected-existing-suite');
 if(!row||row.exception||!row.returnValue)throw Error(row?.exception?.message??'BASE collection failed');
 const native=row.returnValue;let ids:string[];
 if(manifest.runner==='unittest'){
  if(!Array.isArray(native.collection)||native.collection.some((id:unknown)=>typeof id!=='string'||id.includes('_FailedTest')))throw Error('BASE unittest collection failed');ids=native.collection;
 }else{
  if(![0,1].includes(native.exitCode)||!Array.isArray(native.report?.testResults)||native.report.numUnhandledErrors>0)throw Error('BASE Vitest collection failed');
  ids=[];for(const file of native.report.testResults){if(!Array.isArray(file.assertionResults)||file.status==='failed'&&!file.assertionResults.length)throw Error('BASE Vitest setup failed');for(const t of file.assertionResults){if(typeof t.fullName!=='string'||typeof file.name!=='string')throw Error('BASE Vitest identity missing');ids.push(vitestTestIdentity(native.root,file.name,t.fullName));}}
  if(native.report.numTotalTests!==ids.length)throw Error('BASE Vitest collection count differs');
 }
 if(new Set(ids).size!==ids.length)throw Error('Duplicate BASE native test identities');
 return {ids:ids.sort(),execution};
}
