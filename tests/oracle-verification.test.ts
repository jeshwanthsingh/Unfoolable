import {unlinkSync} from 'node:fs';
import {isAttentionResponse} from '../packages/shared/attention.ts';
import {copyFileSync} from 'node:fs';
import {createBuildStore} from '../apps/server/build-store.ts';
import {createVerificationStore} from '../apps/server/verification-store.ts';
import {buildPlanningInput} from '../apps/server/planning-input.ts';
import {evaluationSignature} from '../apps/server/oracle-author.ts';
import {isVerificationView} from '../packages/shared/verification.ts';
import {setTimeout as pause} from 'node:timers/promises';
import {executeOracleTest} from '../apps/server/oracle-execution.ts';
import {materializeOracleTree} from '../apps/server/oracle-tree.ts';
import {planningFixture} from './helpers/build-fixture.ts';
import {createPlanningStore} from '../apps/server/planning-store.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,realpathSync,chmodSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import type {BuildCandidate} from '../packages/shared/build.ts';
import type {OracleManifest,OracleReference} from '../packages/shared/oracle.ts';
import type {PlanningInput,PlanningPayload} from '../packages/shared/planning.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {materializeCandidate,materializeNativeVerification,verificationTreeHash} from '../apps/server/verification-workspace.ts';
import {createVerificationRecipe} from '../apps/server/verification-recipe.ts';
import {executeProtectedStep} from '../apps/server/verification-executor.ts';
const git=(cwd:string,...args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();
function fixture(extra:Record<string,string>={}){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'cc-native-integration-'))),source=join(root,'source'),data=join(root,'data'),artifact=join(data,'attempts','a1');mkdirSync(source);mkdirSync(artifact,{recursive:true});git(source,'init','-q');git(source,'config','user.name','Fixture');git(source,'config','user.email','fixture@example.invalid');
 const write=(path:string,text:string)=>{mkdirSync(join(source,path,'..'),{recursive:true});writeFileSync(join(source,path),text);};
 write('app.py','def behavior():\n    return False\n');write('research_router/cli.py','print("base")\n');write('tests/test_base.py','BASE test bytes\n');git(source,'add','.');git(source,'commit','-qm','base');const baseHead=git(source,'rev-parse','HEAD');
 write('app.py','def behavior():\n    return True\n');write('research_router/cli.py','print("fixed")\n');write('tests/test_base.py','Candidate weakened test\n');write('tests/test_candidate.py','Candidate-only test\n');for(const [path,text] of Object.entries(extra))write(path,text);git(source,'add','.');const treeHash=git(source,'write-tree'),diff=execFileSync('git',['-C',source,'diff','--no-ext-diff','--no-textconv','--binary','--no-renames',baseHead,treeHash,'--']);writeFileSync(join(artifact,'candidate.diff'),diff);writeFileSync(join(artifact,'candidate.pack'),execFileSync('git',['-C',source,'pack-objects','--stdout','--revs'],{input:treeHash+'\n'+baseHead+'\n'}));
 const candidate:BuildCandidate={id:'candidate',attemptId:'a1',baseHead,treeHash,diffHash:createHash('sha256').update(diff).digest('hex'),changedPaths:[],diff:diff.toString(),diffTruncated:false,inventoryTruncated:false,ignoredPaths:0,diffArtifactPath:join(artifact,'candidate.diff'),createdAt:new Date().toISOString()};
 const quality=JSON.parse(readFileSync(new URL('./fixtures/planning-quality.json',import.meta.url),'utf8'))[0] as {input:PlanningInput;payload:PlanningPayload};
 const manifest:OracleManifest={version:'process-oracle-v1',id:'oracle1',sourceRoot:source,baseHead,evaluationSignature:'b'.repeat(64),runner:'unittest',runnerDirectory:'.',dependencyRoot:null,componentPath:null,assurance:'INTERFACE',tests:[{claimId:'E1',testId:'oracle_judge.TestOracle.test_e1',classification:'CHANGE',summary:'Observe accepted behavior.',code:'import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertTrue(observations[0]["returnValue"])\n',requests:[{id:'r1',module:'app',function:'behavior'}],assurance:'INTERFACE'}]};
 const directory=join(data,'oracles',manifest.id);mkdirSync(directory,{recursive:true});const path=join(directory,'manifest.json');writeFileSync(path,canonicalContractJson(manifest));
 const ref:OracleReference={path,hash:createHash('sha256').update(canonicalContractJson(manifest)).digest('hex'),runner:'unittest',claimId:'E1',testId:manifest.tests[0]!.testId,classification:'CHANGE',summary:manifest.tests[0]!.summary,admission:'ADMITTED',reason:null,assurance:'INTERFACE'};quality.payload.evaluationContract.claims[0]!.oracle=ref;
 const recipe=()=>createVerificationRecipe({missionId:quality.input.missionId,contractRevisionId:quality.input.contractRevisionId,planRevisionId:'plan',evaluationRevisionId:'evaluation',evaluationHash:'c'.repeat(64),claims:quality.payload.evaluationContract.claims,input:quality.input,sliceClaimIds:['E1'],evaluatorHash:'d'.repeat(64)});
 const finish=()=>{const unlock=(path:string)=>{chmodSync(path,0o700);for(const entry of readdirSync(path,{withFileTypes:true}))if(entry.isDirectory())unlock(join(path,entry.name));};unlock(root);rmSync(root,{recursive:true,force:true});};
 return {root,data,candidate,manifest,ref,quality,recipe,finish};
}
test('native recipe freezes exact admitted external oracle without changing legacy claims',()=>{const f=fixture();try{const r=f.recipe();assert.equal(r.steps[0]!.kind,'NATIVE_ORACLE');assert.deepEqual(r.steps[0]!.oracle,{reference:f.ref,manifest:f.manifest});assert.match(r.canonical,/Observe accepted behavior/);f.quality.payload.evaluationContract.claims[0]!.oracle!.summary='Changed after recipe';assert.equal(r.steps[0]!.oracle!.reference.summary,'Observe accepted behavior.');}finally{f.finish();}});
test('git archive execution tree restores BASE tests and excludes Candidate-only tests, retaining immutable Candidate identity',async()=>{const f=fixture();try{const materialized=await materializeCandidate(f.data,'run1',f.candidate),native=await materializeNativeVerification(materialized.objectDir,f.candidate,join(f.data,'verification','run1'));assert.equal(readFileSync(join(native.workspace,'tests/test_base.py'),'utf8'),'BASE test bytes\n');assert.equal(existsSync(join(native.workspace,'tests/test_candidate.py')),false);assert.deepEqual(native.candidateOnlyTestsExcluded,['tests/test_candidate.py']);assert.equal(native.candidateTestsAuthoritative,false);assert.equal(await verificationTreeHash(materialized.workspace,materialized.objectDir),f.candidate.treeHash);assert.equal(await verificationTreeHash(native.workspace,materialized.objectDir),native.executionTree);assert.deepEqual(native.dependencyChanges,[]);assert.deepEqual(native.tripwireHits,[]);}finally{f.finish();}});
test('native dependency changes and review tripwires produce INCONCLUSIVE before any process launch',async()=>{for(const extra of [{'requirements.txt':'new-package\n'},{'app.py':'import ctypes\ndef behavior():\n return True\n'}]){const f=fixture(extra);try{const materialized=await materializeCandidate(f.data,'run1',f.candidate),native=await materializeNativeVerification(materialized.objectDir,f.candidate,join(f.data,'verification','run1'));const result=await executeProtectedStep({dataDir:f.data,runId:'run1',workspace:materialized.workspace,native,step:f.recipe().steps[0]!,signal:new AbortController().signal,onProcesses(){assert.fail('No native process may start');}});assert.equal(result.status,'INCONCLUSIVE');assert.match(result.output,/Dependency change or review tripwire/);assert.equal(result.environment.noProcessStarted,true);}finally{f.finish();}}});
test('modified external manifest cannot execute or pass its frozen recipe',async()=>{const f=fixture();try{const step=f.recipe().steps[0]!,materialized=await materializeCandidate(f.data,'run1',f.candidate),native=await materializeNativeVerification(materialized.objectDir,f.candidate,join(f.data,'verification','run1'));writeFileSync(f.ref.path,canonicalContractJson({...f.manifest,tests:[]}));const result=await executeProtectedStep({dataDir:f.data,runId:'run1',workspace:materialized.workspace,native,step,signal:new AbortController().signal,onProcesses(){assert.fail('Changed manifest must not launch');}});assert.equal(result.status,'INCONCLUSIVE');assert.match(result.output,/Oracle immutable identity invalid/);}finally{f.finish();}});

test('native frozen Candidate executes one selected protected CLI unittest and retains external manifest identity',async()=>{const f=fixture();try{
 const oracle=f.manifest.tests[0]!;oracle.requests=[{id:'r1',module:'research_router.cli',args:[],kind:'CLI'} as unknown as typeof oracle.requests[number]];oracle.code='import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertEqual(observations[0]["exitCode"],0)\n  self.assertEqual(observations[0]["stdout"].strip(),"fixed")\n';
 const canonical=canonicalContractJson(f.manifest);writeFileSync(f.ref.path,canonical);f.ref.hash=createHash('sha256').update(canonical).digest('hex');
 const materialized=await materializeCandidate(f.data,'run1',f.candidate),native=await materializeNativeVerification(materialized.objectDir,f.candidate,join(f.data,'verification','run1'));
 const result=await executeProtectedStep({dataDir:f.data,runId:'run1',workspace:materialized.workspace,native,step:f.recipe().steps[0]!,signal:new AbortController().signal,onProcesses(){}});
 assert.equal(result.status,'PASS',result.output);assert.equal(result.cleanup.verified,true);const output=JSON.parse(result.output);assert.equal(output.judge.testsRun,1);assert.equal(output.judge.tests[0].id,oracle.testId);assert.equal(readFileSync(f.ref.path,'utf8'),canonical);
 }finally{f.finish();}});

test('vacuous CHANGE native BASE PASS is rejected by expected-FAIL admission and cannot be accepted',async()=>{
 const f=fixture(),planning=await planningFixture();let controlled:ReturnType<typeof createPlanningStore>|null=null;
 try{
  const oracle=f.manifest.tests[0]!;oracle.requests=[{id:'r1',module:'research_router.cli',args:['--help'],kind:'CLI'} as unknown as typeof oracle.requests[number]];
  oracle.code='import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertEqual(observations[0]["exitCode"],0)\n';
  const baseDirectory=join(f.root,'native-base');await materializeOracleTree(join(f.root,'source'),f.candidate.baseHead,baseDirectory);
  const actual=await executeOracleTest(f.manifest,oracle,baseDirectory,f.root,new AbortController().signal);
  assert.equal(actual.status,'PASS',actual.output);assert.equal(JSON.parse(actual.output).judge.testsRun,1);
  // This injected coordinator preparation uses real BASE observations and the same expected-FAIL policy.
  const admitted=actual.status===('FAIL' as string)&&!actual.truncated&&actual.cleanup.verified&&!actual.cleanup.ambiguous;
  assert.equal(admitted,false);
  const rejected:OracleReference={...f.ref,admission:admitted?'ADMITTED':'REJECTED',reason:'BASE admission expected FAIL, observed '+actual.status};
  writeFileSync(join(f.root,'vacuous-base-admission.json'),canonicalContractJson({baseStatus:actual.status,reference:rejected,testsRun:JSON.parse(actual.output).judge.testsRun}));
  const payload=(await planning.planning.compile('mission')).draft!.payload!;planning.planning.close();
  controlled=createPlanningStore(planning.db,()=>{},async()=>({output:payload,toolVersion:'test',elapsedMs:0}),{dataDir:join(planning.root,'data'),prepareOracle:async(_db,_directory,_mission,_input,p)=>({...p,evaluationContract:{claims:p.evaluationContract.claims.map(c=>({...c,oracle:rejected}))}})});
  const draft=(await controlled.compile('mission')).draft!;assert.equal(draft.payload!.evaluationContract.claims[0]!.oracle!.admission,'REJECTED');
  assert.throws(()=>controlled!.accept(draft.id),{code:'ORACLE_REJECTED'});
 }finally{controlled?.close();planning.finish();f.finish();}
});

test('native store preserves diagnostics authority and routes only current latest flagged claims to inspection',async()=>{
 for(const flags of ['pass','tripwire','dependency'] as const){
 const f=fixture(flags==='tripwire'?{'app.py':'import ctypes\ndef behavior():\n return True\n'}:flags==='dependency'?{'requirements.txt':'new-package\n'}:{}),planning=await planningFixture();let controlled:ReturnType<typeof createPlanningStore>|null=null,builder:ReturnType<typeof createBuildStore>|null=null,verifier:ReturnType<typeof createVerificationStore>|null=null;
 const builderData=join(realpathSync(planning.root),'data');
 const clean={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
 try{
  const payload=(await planning.planning.compile('mission')).draft!.payload!;planning.planning.close();
  const oracle=f.manifest.tests[0]!;oracle.requests=[{id:'r1',module:'research_router.cli',args:[],kind:'CLI'}];oracle.code='import unittest\nfrom oracle_observations import observations\nclass TestOracle(unittest.TestCase):\n def test_e1(self):\n  self.assertEqual(observations[0]["stdout"].strip(),"fixed")\n';
  f.manifest.evaluationSignature=evaluationSignature(payload);const canonical=canonicalContractJson(f.manifest);writeFileSync(f.ref.path,canonical);f.ref.hash=createHash('sha256').update(canonical).digest('hex');
  controlled=createPlanningStore(planning.db,()=>{},async()=>({output:payload,toolVersion:'test',elapsedMs:0}),{dataDir:f.data,prepareOracle:async(_db,_directory,_mission,_input,p)=>({...p,evaluationContract:{claims:p.evaluationContract.claims.map(c=>({...c,oracle:f.ref}))}})});
  controlled.accept((await controlled.compile('mission')).draft!.id);
  builder=createBuildStore(planning.db,{dataDir:builderData,projectRoots:[]},()=>{},{version:async()=> 'fake',reconcile:async()=>clean,run:async(context,_input,_signal,callbacks)=>{callbacks.binding({attemptId:context.attemptId,generation:context.generation,transportId:context.transportId,threadId:'thread',turnId:'turn'});return {threadId:'thread',turnId:'turn',summary:'done',checks:[],cleanup:clean,startupMs:0,builderMs:0};}},{admit:async()=>{const pair=controlled!.view('mission').accepted!,built=buildPlanningInput(planning.db,'mission');return {input:{version:'builder-input-v1',missionId:'mission',originalIntent:'Preserve retry behavior.',planRevisionId:pair.plan.id,evaluationRevisionId:pair.evaluation.id,pairId:pair.plan.pairId,planningInputHash:built.hash,contractRevisionId:built.input.contractRevisionId,contractHash:built.input.contractHash,planHash:pair.plan.planHash,evaluationHash:pair.evaluation.evaluationHash,slice:pair.plan.payload.verticalSlices[0]!,contract:built.input.contract,evaluationClaims:pair.evaluation.payload.claims,project:{baseHead:f.candidate.baseHead,branch:null},promptVersion:'mission-builder-v1'},sourceRoot:f.manifest.sourceRoot,baseHead:f.candidate.baseHead,gitCommonDir:join(f.manifest.sourceRoot,'.git'),sourceIndexHash:'b'.repeat(64),admissionMs:0};},workspace:async(_a,id,dir)=>({workspacePath:join(dir,'workspaces',id),artifactDir:join(dir,'attempts',id),gitCommonDir:join(f.manifest.sourceRoot,'.git'),worktreeMs:0}),sourceFence:async()=>true,capture:async(attempt)=>{const artifact=join(builderData,'attempts',attempt.id);mkdirSync(artifact,{recursive:true});for(const file of ['candidate.diff','candidate.pack'])copyFileSync(join(f.data,'attempts','a1',file),join(artifact,file));return {candidate:{...f.candidate,id:'candidate:'+attempt.id,attemptId:attempt.id,diffArtifactPath:join(artifact,'candidate.diff')},captureMs:0};}});
  await builder.recover();await builder.start('mission','S1');for(let i=0;i<200&&builder.view('mission').attempt?.status!=='CANDIDATE';i++)await pause(10);assert.equal(builder.view('mission').attempt?.status,'CANDIDATE');
  verifier=createVerificationStore(planning.db,{dataDir:builderData},()=>{});await verifier.recover();await verifier.start('mission');
  for(let i=0;i<1500&&['CREATED','PREPARING','RUNNING'].includes(verifier.view('mission').runs[0]!.status);i++)await pause(10);
  const view=verifier.view('mission'),run=view.runs[0]!;assert.equal(view.current,true);assert.equal(isVerificationView(view),true);assert.equal(readFileSync(f.ref.path,'utf8'),canonical);
  if(flags==='pass'){
   assert.equal(run.status,'PASSED',run.error??'');assert.equal(run.results[0]!.status,'PASS');assert.deepEqual(verifier.attention(),[]);
   const diagnostic=run.environment.candidateTests as {status:string;authoritative:boolean;protectedClaimAuthority:boolean};assert.equal(diagnostic.status,'FAIL');assert.equal(diagnostic.authoritative,false);assert.equal(diagnostic.protectedClaimAuthority,false);assert.ok(run.evidence.some(e=>e.claimId===null&&e.kind==='CANDIDATE_TESTS_NON_AUTHORITATIVE'));
   const history=run.environment.processHistory as unknown[];assert.ok(history.length<=3,'Samples must compress to observer, judge and diagnostics launcher records');
  }else{
   assert.equal(run.status,'INCONCLUSIVE',run.error??'');assert.equal(run.results[0]!.status,'INCONCLUSIVE');const attention=verifier.attention();assert.equal(attention.length,1);assert.equal(attention[0]!.kind,'verification_inspection');assert.equal(attention[0]!.runId,run.id);assert.equal(attention[0]!.claimId,'E1');assert.equal(Object.keys(attention[0]!).length,7);assert.equal(isAttentionResponse({items:attention,count:1}),true);
   planning.db.prepare("UPDATE clarification_answers SET answer_text='Changed bound answer.' WHERE question_id='question'").run();assert.equal(verifier.view('mission').current,false);assert.deepEqual(verifier.attention(),[]);
   planning.db.prepare("UPDATE clarification_answers SET answer_text='Stop retrying after denial.' WHERE question_id='question'").run();assert.equal(verifier.attention().length,1);
   // A fresh fixed Candidate produces a new PASS; the prior flagged run stays historical.
   if(flags==='dependency')unlinkSync(join(f.manifest.sourceRoot,'requirements.txt'));else writeFileSync(join(f.manifest.sourceRoot,'app.py'),'def behavior():\n return True\n');git(f.manifest.sourceRoot,'add','-A');
   f.candidate.treeHash=git(f.manifest.sourceRoot,'write-tree');const diff=execFileSync('git',['-C',f.manifest.sourceRoot,'diff','--no-ext-diff','--no-textconv','--binary','--no-renames',f.candidate.baseHead,f.candidate.treeHash,'--']);f.candidate.diffHash=createHash('sha256').update(diff).digest('hex');f.candidate.diff=diff.toString();writeFileSync(f.candidate.diffArtifactPath,diff);writeFileSync(join(f.data,'attempts','a1','candidate.pack'),execFileSync('git',['-C',f.manifest.sourceRoot,'pack-objects','--stdout','--revs'],{input:f.candidate.treeHash+'\n'+f.candidate.baseHead+'\n'}));
   const revised=controlled.revise('mission',controlled.view('mission').accepted!.plan.pairId);controlled.accept(revised.draft!.id);assert.deepEqual(verifier.attention(),[]);
   await builder.start('mission','S1');for(let i=0;i<200&&builder.view('mission').attempt?.status!=='CANDIDATE';i++)await pause(10);assert.equal(builder.view('mission').attempt?.status,'CANDIDATE');assert.deepEqual(verifier.attention(),[]);
   await verifier.start('mission');for(let i=0;i<1500&&['CREATED','PREPARING','RUNNING'].includes(verifier.view('mission').runs[0]!.status);i++)await pause(10);const replacement=verifier.view('mission');assert.equal(replacement.runs[0]!.status,'PASSED',replacement.runs[0]!.error??'');assert.equal(replacement.runs[1]!.id,run.id);assert.equal(replacement.runs[1]!.status,'INCONCLUSIVE');assert.deepEqual(verifier.attention(),[]);
  }
 }finally{await verifier?.close();await builder?.close();controlled?.close();const unseal=(path:string)=>{chmodSync(path,0o700);for(const e of readdirSync(path,{withFileTypes:true}))if(e.isDirectory())unseal(join(path,e.name));};unseal(planning.root);planning.finish();f.finish();}
 }
});
