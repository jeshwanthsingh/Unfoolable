// Explicit CLI-only lifecycle fixtures. No product configuration selects these adapters.
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import type {BuilderDriver} from '../packages/shared/build.ts';
import type {FailurePacket,DebugDiagnosis} from '../packages/shared/debug.ts';
import type {diagnoseVerificationFailure} from '../apps/server/debug-diagnosis.ts';
const clean={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
const fixed='def apply_proposal(allowed, effect):\n    if allowed:\n        effect()\n    return allowed\n';
export function developmentAdapters(scenario:string){
 const fixtureDiagnosis:typeof diagnoseVerificationFailure=async(packet:FailurePacket,signal,onStarted)=>{
  onStarted?.();if(scenario==='diagnosis-wait')await new Promise<void>(r=>{if(signal.aborted)r();else signal.addEventListener('abort',()=>r(),{once:true});});if(signal.aborted)throw Error('Fixture interrupted');
  const reference=packet.data.sources[0]?.id??packet.data.evidence[0]!.id;
  const output:DebugDiagnosis={observations:[{text:'Protected Boolean behavior has a recorded failed claim.',evidenceIds:[packet.data.evidence[0]!.id]}],hypotheses:[{id:'H1',statement:'The current guard or Boolean return may be incorrect.',evidenceIds:[reference],discriminatingObservation:'Re-run both protected Boolean cases after the correction.'}],selectedHypothesisId:'H1',correctionDirection:'Adjust approval.py to guard denied effects and preserve the allowed true return.',classification:'candidate_defect'};
  if(scenario==='ambiguity'){output.classification='requirement_ambiguity';output.correctionDirection='Escalate to a human engineering decision.';}
  return {output,toolVersion:'DEVELOPMENT_ADAPTER',elapsedMs:1};
 };
 const fixtureDriver:BuilderDriver={version:async()=> 'codex-cli 0.160.0',reconcile:async()=>clean,run:async(ctx,input,signal,callbacks)=>{
  const binding={attemptId:ctx.attemptId,generation:ctx.generation,transportId:ctx.transportId,threadId:'development-thread-'+ctx.attemptId,turnId:'development-turn-'+ctx.attemptId};callbacks.binding(binding);
  if(!input.correction)throw Error('Adapter accepts only seeded fixture corrections');
  if(scenario==='cancel')await new Promise<void>(r=>{if(signal.aborted)r();else signal.addEventListener('abort',()=>r(),{once:true});});
  if(scenario==='permission'){
   mkdirSync(join(ctx.artifactDir,'effects'),{recursive:true});const path=join(ctx.artifactDir,'effects','effect.txt');let release!:()=>void;const response=new Promise<void>(r=>{release=r;});
   callbacks.control!(binding,async dispatch=>{const grant=dispatch.response.permissions.fileSystem as {write?:unknown}|undefined;if(grant){if(dispatch.response.scope!=='turn'||!Array.isArray(grant.write)||grant.write.length!==1||grant.write[0]!==path)throw Error('Fixture received unexpected permission scope');writeFileSync(path,'APPROVED\n');}callbacks.permissionResolved!(binding,0);release();});
   callbacks.permission!({binding,receivedAt:new Date().toISOString(),request:{method:'item/permissions/requestApproval',id:0,params:{threadId:binding.threadId,turnId:binding.turnId,itemId:'development-permission',cwd:ctx.workspace,reason:'Disposable correction permission fixture.',permissions:{network:null,fileSystem:{read:null,write:[path],entries:[{path:{type:'path',path},access:'write'}]}}}}});
   const abort=()=>release();signal.addEventListener('abort',abort,{once:true});await response;signal.removeEventListener('abort',abort);
  }
  if(signal.aborted)throw Error('Fixture correction stopped');
  let code=fixed;
  if(scenario==='two'&&input.correction.cycle===1)code='def apply_proposal(allowed, effect):\n    return False\n';
  if(scenario==='exhaustion')code='def apply_proposal(allowed, effect):\n    effect()\n    return allowed\n'+ '\n'.repeat(input.correction.cycle);
  if(scenario==='verify-wait')code='import time\ndef apply_proposal(allowed, effect):\n    time.sleep(60)\n    if allowed:\n        effect()\n    return allowed\n';
  writeFileSync(join(ctx.workspace,'approval.py'),code);
  return {threadId:binding.threadId,turnId:binding.turnId,summary:'Development lifecycle adapter; no Codex worker was invoked.',checks:[],cleanup:clean,startupMs:0,builderMs:1};
 }};
 return {fixtureDriver,fixtureDiagnosis};
}
