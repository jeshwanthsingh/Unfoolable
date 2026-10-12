import {executeOracleTest,executeCandidateTests,oracleScripts} from './oracle-execution.ts';
import {readOracle} from './oracle-author.ts';
import {canonicalContractJson} from './contract-store.ts';
import type {materializeNativeVerification} from './verification-workspace.ts';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {mkdir,writeFile,readFile,lstat,realpath} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {release} from 'node:os';
import {join,resolve} from 'node:path';
import type {CleanupResult,ProcessRecord} from '../../packages/shared/build.ts';
import type {VerificationStep} from '../../packages/shared/verification.ts';
import {ownedProcessSnapshot,reconcileOwnedProcesses} from './build-processes.ts';
import {verificationTreeHash,verificationWorkspaceAuthority} from './verification-workspace.ts';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const sourceTemplate=fileURLToPath(new URL('../../scripts/protected-verification/denial-driver.py',import.meta.url));
const template=existsSync(sourceTemplate)?sourceTemplate:resolve('scripts/protected-verification/denial-driver.py');
const runtimeExtension=import.meta.url.endsWith('.ts')?'.ts':'.js';
const hostModule=(name:string)=>readFileSync(fileURLToPath(new URL('./'+name+runtimeExtension,import.meta.url)),'utf8');
const sourceProcessHelper=fileURLToPath(new URL('../../scripts/build-process-info.py',import.meta.url));
// These protected snapshots cover the host verdict, materialization, recipe and
// aggregate decision authority, not merely the candidate-interpreter launcher.
// Reading module text avoids importing the store back into its dependency graph.
const protectedSnapshots:Record<string,string>={
 'denial-driver.py':readFileSync(template,'utf8'),
 'native-boundary-probe.py':readFileSync(join(template,'..','native-boundary-probe.py'),'utf8'),
 'host-oracle.txt':readFileSync(fileURLToPath(import.meta.url),'utf8'),
 'workspace-authority.txt':verificationWorkspaceAuthority,
 'store-authority.txt':hostModule('verification-store'),
 'recipe-authority.txt':hostModule('verification-recipe'),
 'content-identity-authority.txt':hostModule('content-identity'),
 'accepted-canonical-authority.txt':hostModule('contract-store'),
 'environment-authority.txt':hostModule('verification-environment'),
 'git-authority.txt':hostModule('build-workspace'),
 'process-authority.txt':hostModule('build-processes'),
 'process-kernel-helper.py':readFileSync(existsSync(sourceProcessHelper)?sourceProcessHelper:resolve('scripts/build-process-info.py'),'utf8'),
 'runtime-representation.txt':runtimeExtension,
};
const nativeHostModules=['test-writer','codex-json','oracle-execution','oracle-suite-policy','oracle-tree','oracle-author','oracle-source','verify-only','verify-only-author','verify-only-references','verify-only-admission','verify-only-identity','verify-only-deadline','verify-only-retry','verify-only-authoring','protected-existing-tests','project-recipes'];
const nativeScripts=['python-observer.py','python-judge.py','ui-observer.mjs','ui-judge.mjs','suite-worker.py','concurrent-worker.py','concurrent-observation.py','cli-observation-worker.py','timeout-observation.py','timeout-worker.py'];
export function evaluatorBundle():{files:Record<string,string>;hash:string}{
 const files={...protectedSnapshots};for(const name of nativeHostModules)files[name+'.txt']=hostModule(name);for(const name of nativeScripts)files[name]=readFileSync(join(oracleScripts,name),'utf8');
 files['test-writer-types.txt']=readFileSync(fileURLToPath(new URL('../../packages/shared/test-writer'+runtimeExtension,import.meta.url)),'utf8');files['verification-v1-score.txt']=readFileSync(fileURLToPath(new URL('../../packages/shared/verification-v1'+runtimeExtension,import.meta.url)),'utf8');
 files['verify-only-score.txt']=readFileSync(fileURLToPath(new URL('../../packages/shared/verify-only-v2'+runtimeExtension,import.meta.url)),'utf8');
 return {files,hash:hash(JSON.stringify(files))};
}
type Input={dataDir:string;runId:string;workspace:string;step:VerificationStep;native?:Awaited<ReturnType<typeof materializeNativeVerification>>;signal:AbortSignal;onLaunchPending?:()=>void|Promise<void>;onProcesses:(records:ProcessRecord[])=>void|Promise<void>};
type Result={status:'PASS'|'FAIL'|'ERROR'|'INCONCLUSIVE';durationMs:number;output:string;truncated:boolean;cleanup:CleanupResult;environment:Record<string,unknown>};
const clean:CleanupResult={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
export function protectedSandboxProfile(dataDir:string,workspace:string,bundle:string,scratch:string):string{
 const quote=(s:string)=>JSON.stringify(s);const exceptions=[workspace,bundle,scratch].map(p=>`(require-not (subpath ${quote(p)}))`).join(' ');
 // Darwin/Python require native system and framework reads. Restrict user,
 // coordinator, temporary, removable-volume and private configuration reads.
 const forbidden=[dataDir,'/Users','/private/tmp','/tmp','/private/var','/var','/private/etc','/etc','/Volumes','/home'];
 return `(version 1)(allow default)(deny network*)(deny mach*)(deny process-fork)(deny process-exec)(deny process-info*)(deny process-codesigning-status-get)(deny signal)(deny file-write* (require-not (subpath ${quote(scratch)})))`+forbidden.map(p=>`(deny file-read* (require-all (subpath ${quote(p)}) ${exceptions}))`).join('');
}
export async function executeProtectedStep(input:Input):Promise<Result>{
 if(input.step.kind==='NATIVE_ORACLE')return executeNativeStep(input);
 const began=performance.now();let output='',truncated=false,cleanup=clean;const observations:Record<string,unknown>[]=[];const environment:Record<string,unknown>={platform:process.platform,osRelease:release(),startedAt:new Date().toISOString(),noProcessStarted:true,hostObservations:observations,interpreter:'/usr/local/bin/python3',sandbox:'Darwin sandbox_init before candidate import',systemReadLimitation:'Native interpreter/system framework reads remain allowed; user, temporary, coordinator, private configuration, network, write, fork, exec and process signal access are restricted.',inheritedEnvironment:false};
 const finish=(status:Result['status'],message:string):Result=>{environment.endedAt=new Date().toISOString();const bytes=Buffer.from(output+message);if(bytes.length>65536)truncated=true;return {status,durationMs:Math.round(performance.now()-began),output:bytes.subarray(0,65536).toString('utf8'),truncated,cleanup,environment};};
 if(process.platform!=='darwin')return finish('INCONCLUSIVE','Native Darwin sandbox unavailable.');
 try{
 const root=await realpath(input.dataDir),run=join(root,'verification',input.runId),identity=JSON.parse(await readFile(join(run,'identity.json'),'utf8'));environment.diffRecomputed=identity.diffRecomputed===true;
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.runId)||input.workspace!==join(run,'workspace')||await realpath(input.workspace)!==input.workspace||identity.workspace!==input.workspace||identity.objectDir!==join(run,'objects'))throw new Error('Verification workspace ownership mismatch');
 const checkTree=async()=>{if(await verificationTreeHash(input.workspace,identity.objectDir)!==identity.treeHash)throw new Error('Verification full tree mismatch');};await checkTree();
 const bundle=evaluatorBundle(),bundlePath=join(run,'protected');await mkdir(bundlePath,{recursive:true,mode:0o700});for(const [name,content] of Object.entries(bundle.files)){const path=join(bundlePath,name);await writeFile(path,content,{flag:'wx',mode:0o400}).catch(async(error)=>{if(error.code!=='EEXIST')throw error;if((await lstat(path)).isSymbolicLink()||await readFile(path,'utf8')!==content)throw new Error('Protected evaluator integrity mismatch');});}
 environment.evaluatorHash=bundle.hash;environment.arch=process.arch;environment.nodeVersion=process.version;environment.gitVersion=execFileSync('git',['--version'],{encoding:'utf8',env:{PATH:process.env.PATH??'/opt/homebrew/bin:/usr/bin:/bin',HOME:'/nonexistent'},timeout:3000}).trim();environment.pythonVersion=execFileSync('/usr/local/bin/python3',['-I','--version'],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:3000}).trim();environment.lockHashes={};for(const lock of ['package-lock.json','pnpm-lock.yaml','yarn.lock','requirements.txt']){const bytes=await readFile(join(input.workspace,lock)).catch(()=>null);if(bytes)(environment.lockHashes as Record<string,string>)[lock]=createHash('sha256').update(bytes).digest('hex');}
 if(input.step.kind!=='DENIAL_ORACLE')return finish('INCONCLUSIVE','Step requires a static or manual evaluator.');
 environment.fixtureLanguage={version:'bounded-boolean-approval-v1',sourceBytes:256*1024,astNodes:200,statements:'if allowed / if not allowed, effect(), Boolean return; optional import time with literal sleep <=60s',scope:'Entire module shape validated before executing only the accepted function AST with empty builtins. Unsupported Python is INCONCLUSIVE.'};environment.oracleCase=input.step.oracleCase??'BOTH';const cases=input.step.oracleCase==='DENIED'?[false]:input.step.oracleCase==='ALLOWED'?[true]:[false,true];
 for(const allowed of cases){
  if(input.signal.aborted)return finish('ERROR','Verification interrupted.');await checkTree();
  const scratch=join(run,'scratch-'+randomUUID());await mkdir(scratch,{mode:0o700});
  environment.sandboxPolicyHash=hash(protectedSandboxProfile(root,input.workspace,bundlePath,scratch));environment.allowlistedEnvironment={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',TMPDIR:scratch};
  let metadata='',effects='',effectBytesObserved=0,timedOut=false,interrupted=false,records:ProcessRecord[]=[];
  await input.onLaunchPending?.();if(input.signal.aborted)return finish('ERROR','Verification interrupted before evaluator launch.');cleanup={verified:false,ambiguous:true,remaining:[],terminalCount:0,reason:'Evaluator launch has not yet been reconciled.'};
  const child=spawn('/usr/local/bin/python3',['-I','-B',join(bundlePath,'denial-driver.py'),input.workspace,scratch,protectedSandboxProfile(root,input.workspace,bundlePath,scratch),String(allowed)],{cwd:scratch,env:{PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',TMPDIR:scratch},detached:true,stdio:['pipe','pipe','pipe','pipe','pipe']});environment.noProcessStarted=false;
  const append=(b:Buffer)=>{const remaining=65536-Buffer.byteLength(output);if(b.length>remaining)truncated=true;if(remaining>0)output+=b.subarray(0,remaining).toString('utf8');};child.stdout.on('data',append);child.stderr.on('data',append);
  const metadataPipe=child.stdio[3]!,effectPipe=child.stdio[4]!;metadataPipe.on('data',(b:Buffer)=>{if(metadata.length<1024)metadata+=b.toString().slice(0,1025-metadata.length);});effectPipe.on('data',(b:Buffer)=>{effectBytesObserved+=b.length;if(effects.length<1024)effects+=b.toString().slice(0,1025-effects.length);});
  const exited=new Promise<{code:number|null;error?:Error}>(res=>{child.once('error',error=>res({code:null,error}));child.once('close',code=>res({code}));});
  let stopTask:Promise<void>|null=null;const stop=()=>stopTask??=(async()=>{if(records.length)cleanup=await reconcileOwnedProcesses(records);})();
  const abort=()=>{interrupted=true;void stop();};input.signal.addEventListener('abort',abort,{once:true});if(input.signal.aborted)abort();
  // Detached launcher belongs to its own kernel session; record birth/executable
  // before any timeout/interrupt signal, and persist those identities via caller.
  try{if(child.pid){records=ownedProcessSnapshot(child.pid);if(!records.length)throw new Error('Child identity unavailable');await input.onProcesses(records);if(input.signal.aborted||interrupted){child.stdin.destroy();stopTask=null;await stop();input.signal.removeEventListener('abort',abort);return finish('ERROR','Verification interrupted before candidate release.');}child.stdin.end('G');}}catch(error){child.stdin.destroy();input.signal.removeEventListener('abort',abort);if(records.length)await stop();else cleanup={verified:false,ambiguous:true,remaining:[],terminalCount:0,reason:'Spawned evaluator kernel identity could not be certified; candidate was not released.'};throw error;}
  const timeout=Math.max(10,Math.min(input.step.timeoutMs,30000));const timer=setTimeout(()=>{timedOut=true;void stop();},timeout);let deadlineTimer:ReturnType<typeof setTimeout>;const deadline=new Promise<{code:null;deadline:true}>(resolve=>{deadlineTimer=setTimeout(()=>resolve({code:null,deadline:true}),timeout+5000);});const outcome=await Promise.race([exited,deadline]);clearTimeout(timer);clearTimeout(deadlineTimer!);input.signal.removeEventListener('abort',abort);
  if('deadline' in outcome){cleanup={verified:false,ambiguous:true,remaining:cleanup.remaining,terminalCount:0,reason:'Evaluator did not close within its bounded cleanup deadline.'};return finish('INCONCLUSIVE','Evaluator close deadline exceeded; retained uncertain process cleanup.');}await stop();await checkTree();
  if(!cleanup.verified)return finish('INCONCLUSIVE','Owned process cleanup could not be certified.');if(timedOut||interrupted)return finish('ERROR',timedOut?'Evaluator timed out.':'Evaluator interrupted.');if(outcome.error)return finish('ERROR','Evaluator launch failed.');
  // The host owns this immutable effect record outside candidate write access.
  const effectLog=join(run,'host-effects-'+randomUUID()+'.log');await writeFile(effectLog,effects,{flag:'wx',mode:0o400});const observation:Record<string,unknown>={allowed,scratch,sandboxPolicyHash:hash(protectedSandboxProfile(root,input.workspace,bundlePath,scratch)),effectEventCount:effects.split('effect\n').length-1,eventBytes:Buffer.byteLength(effects),effectBytesObserved,eventTranscriptTruncated:effectBytesObserved>Buffer.byteLength(effects),eventTranscript:effects,eventProtocolValid:effects===('effect\n'.repeat(effects.split('effect\n').length-1)),effectLog,effectSha256:hash(effects),exitCode:outcome.code,completed:false,returnValue:null};observations.push(observation);
  let result:{supported?:boolean;completed?:boolean;returnValue?:boolean;reason?:string}|null=null;try{result=JSON.parse(metadata);}catch{/* Missing witness never overrides an already observed denied effect. */}
  observation.supported=result?.supported===true;observation.unsupportedReason=result?.supported===false?result.reason??null:null;observation.completed=result?.completed===true;observation.returnValue=result?.returnValue??null;
  if(!allowed&&effects!=='')return finish('FAIL','Denied proposal produced an observed brokered side effect.');
  if(!result)return finish('ERROR','No bounded evaluator completion witness.');
  if(result.supported===false)return finish('INCONCLUSIVE','Unsupported fixture language: '+String(result.reason??'candidate shape is outside the protected Boolean recipe'));
  if(result.supported!==true)return finish('ERROR','Missing protected fixture-language validation witness.');
  if(outcome.code!==0||result.completed!==true)return finish('ERROR','Evaluator failed before completing the case.');
  // Host is PASS authority for these finite invocation observations.
  // No return/assertion/test/stdout from candidate can declare PASS.
  if(result.returnValue!==allowed)return finish('FAIL','Proposal returned the wrong Boolean value.');
  if(allowed&&effects!=='effect\n')return finish('FAIL','Allowed proposal did not produce exactly one observed brokered side effect.');
 }
 await checkTree();return finish('PASS',input.step.oracleCase==='DENIED'?'Host denied invocation observations passed.':input.step.oracleCase==='ALLOWED'?'Host allowed invocation observations passed.':'Host denial and allowed-effect observations passed.');
 }catch(error){return finish('ERROR',error instanceof Error?error.message:'Protected verification failed.');}
}

async function executeNativeStep(input:Input):Promise<Result>{
 const began=performance.now(),environment:Record<string,unknown>={noProcessStarted:true,authority:'Frozen coordinator native oracle',candidateTestsAuthoritative:false};
 const finish=(message:string):Result=>({status:'INCONCLUSIVE',durationMs:Math.round(performance.now()-began),output:message,truncated:false,cleanup:clean,environment});
 try{
  const oracle=input.step.oracle,native=input.native;if(!oracle||!native||oracle.reference.admission!=='ADMITTED'||oracle.manifest.baseHead!==native.baseHead||input.step.claimIds.length!==1||input.step.claimIds[0]!==oracle.reference.claimId)return finish('Native oracle binding unavailable.');
  environment.oracleHash=oracle.reference.hash;environment.assurance=oracle.reference.assurance??'INTERFACE';environment.baseTestsRestored=native.baseTestsRestored;environment.candidateOnlyTestsExcluded=native.candidateOnlyTestsExcluded;
  if(native.dependencyChanges.length||native.tripwireHits.length){environment.dependencyChanges=native.dependencyChanges;environment.tripwireHits=native.tripwireHits;return finish('Dependency change or review tripwire requires human review; native verification is INCONCLUSIVE.');}
  const root=await realpath(input.dataDir),run=join(root,'verification',input.runId),identity=JSON.parse(await readFile(join(run,'identity.json'),'utf8'));
  if(native.workspace!==join(run,'native-workspace')||await realpath(native.workspace)!==native.workspace||identity.objectDir!==join(run,'objects'))return finish('Native workspace ownership mismatch.');
  const integrity=async()=>{if(canonicalContractJson(readOracle(oracle.reference))!==canonicalContractJson(oracle.manifest))throw Error('External oracle manifest identity changed');if(await verificationTreeHash(native.workspace,identity.objectDir)!==native.executionTree)throw Error('Restored native execution tree changed');};await integrity();
  const tests=oracle.manifest.tests.filter(t=>t.claimId===oracle.reference.claimId&&t.testId===oracle.reference.testId);if(tests.length!==1)return finish('Expected exactly one native oracle test per claim.');
  const executed=await executeOracleTest(oracle.manifest,tests[0]!,oracle.manifest.runnerDirectory==='sdk/python'?join(native.workspace,'sdk/python'):native.workspace,run,input.signal,{onLaunchPending:async()=>{environment.noProcessStarted=false;await input.onLaunchPending?.();},onProcesses:input.onProcesses});
  // Keep actual cleanup evidence even if post-execution integrity fails.
  try{await integrity();}catch(error){return {...executed,status:'INCONCLUSIVE',output:error instanceof Error?error.message:'Native integrity changed',environment:{...environment,...executed.environment}};}
  return {...executed,environment:{...environment,...executed.environment}};
 }catch(error){return finish(error instanceof Error?error.message:'Native oracle infrastructure unavailable.');}
}

// Diagnostics from Builder-authored tests never alter protected claim results.
export async function executeCandidateTestStep(input:Input):Promise<Result>{
 const environment:Record<string,unknown>={authority:'NONAUTHORITATIVE',protectedClaimAuthority:false,noProcessStarted:true};
 const unavailable=(message:string):Result=>({status:'INCONCLUSIVE',output:message,durationMs:0,truncated:false,cleanup:clean,environment});
 try{
  const oracle=input.step.oracle,native=input.native;if(!oracle||!native?.candidateTestPaths.length)return unavailable('No modified or added Candidate tests to run.');
  const root=await realpath(input.dataDir),run=join(root,'verification',input.runId),identity=JSON.parse(await readFile(join(run,'identity.json'),'utf8'));
  if(input.workspace!==join(run,'workspace')||await realpath(input.workspace)!==input.workspace||identity.objectDir!==join(run,'objects'))return unavailable('Candidate test workspace ownership mismatch.');
  const integrity=async()=>{if(canonicalContractJson(readOracle(oracle.reference))!==canonicalContractJson(oracle.manifest))throw Error('External oracle identity changed');if(await verificationTreeHash(input.workspace,identity.objectDir)!==identity.treeHash)throw Error('Immutable Candidate tree changed during diagnostics');};await integrity();
  const result=await executeCandidateTests(oracle.manifest,input.workspace,run,native.candidateTestPaths,input.signal,{onLaunchPending:async()=>{environment.noProcessStarted=false;await input.onLaunchPending?.();},onProcesses:input.onProcesses});
  try{await integrity();}catch(error){return {...result,status:'INCONCLUSIVE',output:error instanceof Error?error.message:'Candidate diagnostic integrity changed',environment:{...environment,...result.environment}};}
  return {...result,environment:{...environment,...result.environment}};
 }catch(error){return unavailable(error instanceof Error?error.message:'Candidate diagnostics unavailable.');}
}
