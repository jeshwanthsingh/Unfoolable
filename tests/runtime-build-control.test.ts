import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {DatabaseSync} from 'node:sqlite';
import {planningFixture} from './helpers/build-fixture.ts';
import {createBuildStore} from '../apps/server/build-store.ts';
import {BuildError} from '../apps/server/build-errors.ts';
import type {BuilderDriver,BuilderResult,BuildInput,RuntimeBinding,RuntimeCallbacks,CleanupResult} from '../packages/shared/build.ts';
import type {PermissionDispatch,PermissionEnvelope} from '../packages/shared/permissions.ts';
const clean:CleanupResult={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
async function fixture(cleanup:CleanupResult=clean){
 const f=await planningFixture(),pair=f.planning.accept((await f.planning.compile('mission')).draft!.id).accepted!,dataDir=realpathSync(join(f.root,'data'));
 let callbacks:RuntimeCallbacks,binding:RuntimeBinding,resolve:(value:BuilderResult)=>void,reject:(error:Error)=>void,captures=0,abortProof=false;
 const writes:PermissionDispatch[]=[];
 const driver:BuilderDriver={version:async()=> 'codex-cli 0.160.0',reconcile:async()=>cleanup,run:async(ctx,_input,signal,cb)=>{
  callbacks=cb;binding={attemptId:ctx.attemptId,generation:ctx.generation,transportId:ctx.transportId,threadId:'thread-'+ctx.attemptId,turnId:'turn-'+ctx.attemptId};cb.binding(binding);cb.control!(binding,async d=>{writes.push(d);});
  return new Promise((yes,no)=>{resolve=yes;reject=no;signal.addEventListener('abort',()=>{
   const runtime=f.db.prepare('SELECT cancel_requested_at FROM build_runtime_state WHERE attempt_id=?').get(ctx.attemptId);
   abortProof=!!runtime?.cancel_requested_at&&f.db.prepare("SELECT count(*) AS n FROM runtime_permission_requests WHERE attempt_id=? AND status='PENDING'").get(ctx.attemptId)!.n===0;
   no(new BuildError('BUILD_INTERRUPTED','Interrupted.'));
  },{once:true});});
 }};
 const hooks={admit:async()=>({input:{planRevisionId:pair.plan.id,evaluationRevisionId:pair.evaluation.id,pairId:pair.plan.pairId,planningInputHash:pair.plan.inputHash} as BuildInput,sourceRoot:'/fixture',baseHead:'a'.repeat(40),gitCommonDir:'/fixture/.git',sourceIndexHash:'b'.repeat(64),admissionMs:1}),workspace:async(_a:unknown,id:string,dir:string)=>{
  const workspacePath=join(dir,'workspaces',id),artifactDir=join(dir,'attempts',id);mkdirSync(workspacePath,{recursive:true});mkdirSync(artifactDir,{recursive:true});return {workspacePath,artifactDir,gitCommonDir:'/fixture/.git',worktreeMs:1};
 },sourceFence:async()=>true,capture:async(attempt:{id:string;baseHead:string})=>{captures++;return {candidate:{id:'candidate-'+attempt.id,attemptId:attempt.id,baseHead:attempt.baseHead,treeHash:'c'.repeat(40),diffHash:'d'.repeat(64),changedPaths:[],diff:'',diffTruncated:false,inventoryTruncated:false,ignoredPaths:0,diffArtifactPath:'/fixture/diff',createdAt:new Date().toISOString()},captureMs:1};}};
 const store=createBuildStore(f.db,{dataDir,projectRoots:[]},()=>{},driver,hooks);await store.recover();
 return {...f,store,dataDir,hooks,driver,writes,get callbacks(){return callbacks!;},get binding(){return binding!;},get captures(){return captures;},get abortProof(){return abortProof;},complete(){resolve!({threadId:binding!.threadId!,turnId:binding!.turnId!,summary:'done',checks:[],cleanup,startupMs:1,builderMs:1});},fail(error:Error){reject!(error);},request(){
  const path=join(dataDir,'attempts',binding!.attemptId,'effects','sentinel.txt');
  const e:PermissionEnvelope={binding:binding!,receivedAt:new Date().toISOString(),request:{method:'item/permissions/requestApproval',id:0,params:{threadId:binding!.threadId,turnId:binding!.turnId,itemId:'sentinel',cwd:join(dataDir,'workspaces',binding!.attemptId),reason:'Write sentinel.',permissions:{network:null,fileSystem:{read:null,write:[path],entries:[{path:{type:'path',path},access:'write'}]}}}}};
  return {id:callbacks!.permission!(e),path};
 },async finish(){await store.close();f.finish();}};
}
async function waitFor(f:Awaited<ReturnType<typeof fixture>>,terminal=false){for(let i=0;i<300;i++){const row=f.store.view('mission').attempt;if(row&&(terminal?['CANDIDATE','FAILED','INTERRUPTED','RECONCILE_REQUIRED'].includes(row.status):row.status==='RUNNING'))return;await pause(10);}assert.fail('Coordinator did not reach expected state');}
test('completion without approvals captures a Candidate through the coordinator',async()=>{const f=await fixture();try{await f.store.start('mission','S1');await waitFor(f);f.complete();await waitFor(f,true);assert.equal(f.store.view('mission').attempt!.status,'CANDIDATE');assert.equal(f.store.view('mission').effect!.state,'NONE_OBSERVED');assert.equal(f.captures,1);}finally{await f.finish();}});
test('Cancel during FINALIZING fences a capture already in flight and creates no Candidate row',async()=>{
 const f=await fixture(),capture=f.hooks.capture;
 let enteredResolve!:()=>void,releaseResolve!:()=>void;
 const entered=new Promise<void>(resolve=>{enteredResolve=resolve;}),release=new Promise<void>(resolve=>{releaseResolve=resolve;});
 f.hooks.capture=async attempt=>{enteredResolve();await release;return capture(attempt);};
 try{
  await f.store.start('mission','S1');await waitFor(f);f.complete();
  await Promise.race([entered,pause(3000,undefined,{ref:false}).then(()=>assert.fail('Capture did not start'))]);
  const attempt=f.store.view('mission').attempt!;assert.equal(attempt.status,'FINALIZING');assert.equal(f.store.view('mission').candidate,null);
  await f.store.cancel(attempt.id);assert.ok(f.store.view('mission').cancelRequestedAt);assert.equal(f.store.view('mission').attempt!.status,'CANCELLING');
  releaseResolve();await waitFor(f,true);const ended=f.store.view('mission');assert.equal(ended.attempt!.status,'INTERRUPTED');assert.equal(ended.candidate,null);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM build_candidates').get()!.n,0);assert.equal(f.captures,1,'The in-flight capture returned, but its result was rejected');
 }finally{releaseResolve();await f.finish();}
});
test('Cancel durably records intent and invalidates pending permission before abort; retry fences all old callbacks',async()=>{const f=await fixture();try{
 await f.store.start('mission','S1');await waitFor(f);const first=f.store.view('mission').attempt!,old=f.callbacks,oldBinding=f.binding,request=f.request(),hash=f.store.view('mission').permissions![0]!.payloadHash;
 assert.equal(f.store.attention()[0]!.kind,'runtime_permission');const cancelling=await f.store.cancel(first.id);assert.ok(cancelling.cancelRequestedAt);assert.equal(cancelling.attempt!.status,'CANCELLING');assert.equal(f.abortProof,true);assert.equal(f.db.prepare('SELECT status FROM build_attempts WHERE id=?').get(first.id)!.status,'RUNNING');
 await assert.rejects(f.store.decide(request.id,'ALLOW',hash),{code:'STALE_PERMISSION_REQUEST'});await waitFor(f,true);assert.equal(f.captures,0);assert.equal(f.store.view('mission').attempt!.status,'INTERRUPTED');assert.equal(f.store.attention().length,0);
 await f.store.retry(first.id);await waitFor(f);const next=f.store.view('mission').attempt!;assert.notEqual(next.id,first.id);assert.equal(next.generation,first.generation+1);assert.notEqual(next.workspacePath,first.workspacePath);assert.notEqual(next.transportId,first.transportId);assert.notEqual(next.providerThreadId,first.providerThreadId);
 assert.equal(old.event(oldBinding,'late',{}),false);old.processes([{pid:99999,ppid:1,pgid:99999,sid:99999,birth:'old',executable:'fake',observedAt:'now',exitedAt:null}]);assert.equal(f.store.view('mission').attempt!.processes.length,0);assert.throws(()=>old.control!(oldBinding,async()=>{}),{code:'STALE_BUILD_BINDING'});assert.throws(()=>old.binding(oldBinding),{code:'STALE_BUILD_BINDING'});old.permissionResolved!(oldBinding,0);assert.equal(f.writes.length,0);f.complete();await waitFor(f,true);assert.equal(f.store.view('mission').candidate!.attemptId,next.id);
 }finally{await f.finish();}});
test('Allow and Deny require provider resolution before Candidate capture',async()=>{for(const decision of ['ALLOW','DENY'] as const){const f=await fixture();try{await f.store.start('mission','S1');await waitFor(f);const request=f.request(),row=f.store.view('mission').permissions![0]!;await f.store.decide(request.id,decision,row.payloadHash);assert.equal(f.store.view('mission').permissions![0]!.status,'TRANSPORT_WRITTEN');assert.equal(f.store.view('mission').candidate,null);f.complete();await waitFor(f,true);assert.equal(f.captures,0);assert.equal(f.store.view('mission').attempt!.status,'RECONCILE_REQUIRED');await assert.rejects(f.store.retry(f.binding.attemptId),{code:'RETRY_NOT_SAFE'});}finally{await f.finish();}}});
test('resolved Allow and Deny complete with observable effect evidence distinct from Candidate',async()=>{for(const decision of ['ALLOW','DENY'] as const){const f=await fixture();try{await f.store.start('mission','S1');await waitFor(f);const request=f.request(),row=f.store.view('mission').permissions![0]!;await f.store.decide(request.id,decision,row.payloadHash);if(decision==='ALLOW')writeFileSync(request.path,'sentinel');f.callbacks.permissionResolved!(f.binding,0);f.complete();await waitFor(f,true);const view=f.store.view('mission');assert.equal(view.attempt!.status,'CANDIDATE');assert.equal(view.permissions![0]!.status,'RESOLVED');assert.equal(view.effect!.state,decision==='ALLOW'?'OBSERVED':'NONE_OBSERVED');assert.equal(f.captures,1);}finally{await f.finish();}}});
test('unsafe Cancel cleanup blocks Retry and produces reconciliation attention',async()=>{const f=await fixture({verified:false,ambiguous:true,remaining:[],terminalCount:0,reason:'unverified child'});try{await f.store.start('mission','S1');await waitFor(f);await f.store.cancel(f.binding.attemptId);await waitFor(f,true);assert.equal(f.store.view('mission').attempt!.status,'RECONCILE_REQUIRED');assert.equal(f.store.attention()[0]!.kind,'reconciliation');await assert.rejects(f.store.retry(f.binding.attemptId),{code:'RETRY_NOT_SAFE'});assert.equal(f.captures,0);}finally{await f.finish();}});
test('app-server loss after Allow preserves observed file evidence but leaves the outcome UNKNOWN',async()=>{const f=await fixture();try{await f.store.start('mission','S1');await waitFor(f);const request=f.request(),hash=f.store.view('mission').permissions![0]!.payloadHash;await f.store.decide(request.id,'ALLOW',hash);writeFileSync(request.path,'observed before transport death');f.fail(new BuildError('BUILD_TRANSPORT_LOST','App-server exited.'));await waitFor(f,true);const view=f.store.view('mission');assert.equal(view.attempt!.status,'RECONCILE_REQUIRED');assert.equal(view.effect!.state,'UNKNOWN');assert.equal(view.effect!.files.find(file=>file.path===request.path)!.exists,true);assert.equal(view.permissions![0]!.decision,'ALLOW');assert.equal(view.candidate,null);assert.equal(f.captures,0);await assert.rejects(f.store.retry(f.binding.attemptId),{code:'RETRY_NOT_SAFE'});}finally{await f.finish();}});
test('crash recovery never replays an old response; committed Allow remains UNKNOWN even when the file exists',async()=>{for(const allow of [false,true]){const f=await fixture();let snapshot:DatabaseSync|undefined,restarted:ReturnType<typeof createBuildStore>|undefined;try{
 await f.store.start('mission','S1');await waitFor(f);const request=f.request(),hash=f.store.view('mission').permissions![0]!.payloadHash;
 f.callbacks.processes([{pid:99999,ppid:1,pgid:99999,sid:99999,birth:'durable-test-record',executable:'fake',observedAt:'now',exitedAt:null}]);
 if(allow){await f.store.decide(request.id,'ALLOW',hash);writeFileSync(request.path,'already observed');}
 const filename=join(f.dataDir,'crash.sqlite');f.db.exec("VACUUM INTO '"+filename.replaceAll("'","''")+"'");await f.store.close();snapshot=new DatabaseSync(filename);let runs=0;
 restarted=createBuildStore(snapshot,{dataDir:f.dataDir,projectRoots:[]},()=>{},{version:async()=>'',run:async()=>{runs++;throw Error('must not run');},reconcile:async()=>{assert.equal(snapshot!.prepare('SELECT transport_valid FROM build_attempts').get()!.transport_valid,0);assert.equal(snapshot!.prepare('SELECT status FROM runtime_permission_requests').get()!.status,'INVALIDATED');return clean;}});
 await restarted.recover();const view=restarted.view('mission');assert.equal(runs,0);assert.equal(view.candidate,null);assert.equal(view.permissions![0]!.status,'INVALIDATED');assert.equal(view.attempt!.status,allow?'RECONCILE_REQUIRED':'INTERRUPTED');assert.equal(view.effect!.state,allow?'UNKNOWN':'NONE_OBSERVED');if(allow)assert.equal(view.effect!.files.find(file=>file.path===request.path)!.exists,true);
 await assert.rejects(restarted.decide(request.id,'ALLOW',hash),{code:'STALE_PERMISSION_REQUEST'});assert.equal(f.writes.length,allow?1:0);if(allow)await assert.rejects(restarted.retry(f.binding.attemptId),{code:'RETRY_NOT_SAFE'});
 }finally{await restarted?.close();snapshot?.close();await f.finish();}}});
