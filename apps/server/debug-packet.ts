import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import type {BuildInput,BuildCandidate,BuilderCheck,CleanupResult,ChangedPath} from '../../packages/shared/build.ts';
import type {VerificationRun,VerificationRecipe,VerificationView} from '../../packages/shared/verification.ts';
import {DEBUG_LIMITS,type FailurePacket,type FailurePacketData} from '../../packages/shared/debug.ts';
import {canonicalContractJson} from './contract-store.ts';
import {verificationHash} from './verification-recipe.ts';
import {safeBuildGit,safeBuildPath} from './build-workspace.ts';
import {BuildError} from './build-errors.ts';
const fail=(code:string,message:string):never=>{throw new BuildError(code,message);};
const clean=(value:CleanupResult|null)=>!!value?.verified&&!value.ambiguous&&!value.remaining.length;
const safePath=(path:string)=>safeBuildPath(path)&&!/^[A-Za-z]:/.test(path);
const git=(value:string)=>/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const sha=(value:string)=>/^[a-f0-9]{64}$/.test(value);
const secret=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b/;
export const boundedDebugText=(text:string,bytes:number)=>{let out=Buffer.from(text).subarray(0,bytes).toString('utf8');while(Buffer.byteLength(out)>bytes)out=out.slice(0,-1);return out;};
export type PacketStore={view:(missionId:string)=>VerificationView;readEvidence:(runId:string,evidenceId:string)=>Record<string,unknown>};
export type PacketOptions={sessionId:string;cycle:number;previousCycles:FailurePacketData['previousCycles'];store?:PacketStore};
export type PacketInput={dataDir:string;input:BuildInput;candidate:BuildCandidate;run:VerificationRun;recipe:VerificationRecipe;checks:BuilderCheck[];cleanup:CleanupResult|null;view:VerificationView;readEvidence:PacketStore['readEvidence']};
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
/** Reads only frozen Git objects and validated protected evidence. Never reads the live repository/workspace. */
export async function makeFailurePacketFrom(supplied:PacketInput,options:PacketOptions):Promise<FailurePacket>{
 const {dataDir,readEvidence}=supplied;
 options=structuredClone({sessionId:options.sessionId,cycle:options.cycle,previousCycles:options.previousCycles});
 // Clone before any async boundary so callers cannot change the packet's inputs mid-read.
 const {input,candidate,run,recipe,checks,cleanup,view}=structuredClone({input:supplied.input,candidate:supplied.candidate,run:supplied.run,recipe:supplied.recipe,checks:supplied.checks,cleanup:supplied.cleanup,view:supplied.view});
 if(!options.sessionId||!Number.isSafeInteger(options.cycle)||options.cycle<1||options.cycle>DEBUG_LIMITS.corrections||options.previousCycles.length!==options.cycle-1)return fail('DEBUG_PACKET_INVALID','Invalid bounded debugging cycle.');
 if(!view.current||view.runs[0]?.id!==run.id||canonicalContractJson(view.runs[0])!==canonicalContractJson(run)||view.recipe?.hash!==recipe.hash)return fail('DEBUG_PACKET_STALE','Debugging requires the exact current Verification Run.');
 if(run.status!=='FAILED'||!run.results.length||run.results.some(r=>!['PASS','FAIL'].includes(r.status))||!run.results.some(r=>r.status==='FAIL')||!clean(run.cleanup)||!clean(cleanup))return fail('DEBUG_PACKET_INELIGIBLE','Only a required FAIL with certified Builder/Verifier cleanup can be diagnosed.');
 const bindingEqual=input.missionId===run.missionId&&recipe.missionId===run.missionId&&candidate.id===run.candidateId&&candidate.attemptId===run.attemptId&&candidate.baseHead===run.baseHead&&candidate.treeHash===run.treeHash&&candidate.diffHash===run.diffHash&&input.project.baseHead===run.baseHead&&recipe.id===run.recipeId&&recipe.hash===run.recipeHash&&recipe.evaluationHash===run.evaluationHash&&input.evaluationHash===run.evaluationHash&&recipe.evaluatorHash===run.evaluatorHash&&input.contractRevisionId===recipe.contractRevisionId&&input.planRevisionId===recipe.planRevisionId&&input.evaluationRevisionId===recipe.evaluationRevisionId;
 if(!bindingEqual||!Number.isSafeInteger(run.generation)||run.generation<1||![run.treeHash,run.baseHead].every(git)||![run.diffHash,run.recipeHash,run.evaluationHash,run.evaluatorHash,input.planHash,input.contractHash].every(sha)||verificationHash(recipe.canonical)!==recipe.hash)return fail('DEBUG_PACKET_BINDING','Candidate, accepted artifacts and recipe do not share one identity.');
 const rc=JSON.parse(recipe.canonical);
 if(canonicalContractJson({...rc,missionId:recipe.missionId,contractRevisionId:recipe.contractRevisionId,planRevisionId:recipe.planRevisionId,evaluationRevisionId:recipe.evaluationRevisionId,evaluationHash:recipe.evaluationHash,version:recipe.version,steps:recipe.steps,claims:recipe.claims,evaluatorHash:recipe.evaluatorHash})!==recipe.canonical)return fail('DEBUG_PACKET_BINDING','Recipe metadata differs from its canonical identity.');
 if(run.results.length!==recipe.claims.length||new Set(run.results.map(r=>r.claimId)).size!==run.results.length||!run.results.every(r=>recipe.claims.some(c=>c.id===r.claimId)&&recipe.steps.some(s=>s.id===r.stepId&&s.claimIds.includes(r.claimId)))||recipe.claims.some(c=>!input.evaluationClaims.some(i=>canonicalContractJson(i)===canonicalContractJson(c))))return fail('DEBUG_PACKET_BINDING','Protected claim identities differ from the accepted Evaluation.');
 const environmentIdentity=run.environment.environmentIdentity;
 if(typeof environmentIdentity!=='string'||!sha(environmentIdentity)||verificationHash(canonicalContractJson(run.environment.environmentManifest))!==environmentIdentity||run.environment.candidateTree!==run.treeHash||run.environment.baseHead!==run.baseHead||run.environment.recipeHash!==run.recipeHash||run.environment.evaluatorHash!==run.evaluatorHash)return fail('DEBUG_PACKET_BINDING','Verifier environment identity is incomplete or changed.');
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(run.id))return fail('DEBUG_PACKET_BINDING','Invalid Run identity.');
 const root=realpathSync(resolve(dataDir)),objectDir=join(root,'verification',run.id,'objects');
 if(run.environment.objectDir!==objectDir||realpathSync(objectDir)!==objectDir||(await safeBuildGit(objectDir,['rev-parse','--is-bare-repository'],100)).toString().trim()!=='true')return fail('DEBUG_PACKET_BINDING','The frozen bare object store is unavailable.');
 const rawDiff=await safeBuildGit(objectDir,['diff','--no-ext-diff','--no-textconv','--binary','--no-renames',run.baseHead,run.treeHash,'--'],4194305);
 if(verificationHash(rawDiff)!==run.diffHash)return fail('DEBUG_PACKET_BINDING','Frozen diff bytes differ from the Candidate identity.');
 const actualStatus=(await safeBuildGit(objectDir,['diff','--name-status','--no-renames','-z',run.baseHead,run.treeHash,'--'],4194305)).toString().split('\0').filter(Boolean),actualPaths=actualStatus.filter((_v,i)=>i%2===1);
 const kinds=new Map(actualPaths.map((path,i)=>[path,actualStatus[i*2]==='A'?'added':actualStatus[i*2]==='D'?'deleted':'modified']));
 if(candidate.changedPaths.some(p=>p.kind!==kinds.get(p.path)||p.oldPath!==undefined))return fail('DEBUG_PACKET_BINDING','Changed-path kind differs from the frozen diff.');
 if(canonicalContractJson(actualPaths.slice().sort())!==canonicalContractJson(candidate.changedPaths.map(p=>p.path).sort()))return fail('DEBUG_PACKET_BINDING','Changed-path metadata differs from the frozen diff.');
 if(candidate.changedPaths.some(p=>!safePath(p.path)||(p.oldPath!==undefined&&!safePath(p.oldPath))))return fail('DEBUG_PACKET_PATH','Changed paths contain unsafe or sensitive locations.');
 const failedClaims=run.results.filter(r=>r.status==='FAIL').map(r=>{const step=recipe.steps.find(s=>s.id===r.stepId)!;return {claim:recipe.claims.find(c=>c.id===r.claimId)!,stepId:r.stepId,protectedStep:{id:step.id,kind:step.kind,description:boundedDebugText(step.description,DEBUG_LIMITS.text),timeoutMs:step.timeoutMs,...(step.oracleCase?{oracleCase:step.oracleCase}:{})},observation:boundedDebugText(r.note??'Required protected step failed.',DEBUG_LIMITS.text)};});
 if(failedClaims.length>DEBUG_LIMITS.evidence)return fail('DEBUG_PACKET_LIMIT','Failed claim count exceeds the bounded evidence packet.');
 const failedIds=new Set(failedClaims.map(f=>f.claim.id));
 const records=failedClaims.map(f=>{const found=run.evidence.find(e=>e.claimId===f.claim.id);if(!found)return fail('DEBUG_PACKET_EVIDENCE','A failed protected claim has no bound evidence.');return found;});
 if(new Set(records.map(e=>e.id)).size!==records.length)return fail('DEBUG_PACKET_EVIDENCE','Evidence identities are duplicated.');
 const evidence=records.map(record=>{const document=readEvidence(run.id,record.id),canonical=canonicalContractJson(document);if(record.runId!==run.id||!failedIds.has(record.claimId!)||!sha(record.sha256)||record.bytes!==Buffer.byteLength(canonical)||verificationHash(canonical)!==record.sha256)return fail('DEBUG_PACKET_EVIDENCE','Protected evidence identity changed.');const text=boundedDebugText(canonical,DEBUG_LIMITS.evidenceBytes);return {id:record.id,claimId:record.claimId!,kind:record.kind,sha256:record.sha256,bytes:record.bytes,text,truncated:record.truncated||Buffer.byteLength(canonical)>DEBUG_LIMITS.evidenceBytes,trust:'UNTRUSTED_DATA' as const};});
 const sources:FailurePacketData['sources']=[];
 // This fixed API path comes from the host-protected oracle, never from Candidate logs or AI output.
 const oraclePaths=failedClaims.some(f=>f.protectedStep.kind==='DENIAL_ORACLE')?['approval.py']:[];
 const sourcePaths:ChangedPath[]=[...oraclePaths.map(path=>candidate.changedPaths.find(p=>p.path===path)??{path,kind:'modified' as const,additions:0,deletions:0}),...candidate.changedPaths.filter(p=>!oraclePaths.includes(p.path))].slice(0,DEBUG_LIMITS.paths);
 for(const changed of sourcePaths){
  for(const revision of ['BASE','CANDIDATE'] as const){if(revision==='BASE'&&changed.kind==='added'||revision==='CANDIDATE'&&changed.kind==='deleted')continue;
   const tree=revision==='BASE'?run.baseHead:run.treeHash,path=revision==='BASE'?(changed.oldPath??changed.path):changed.path;
   const entry=(await safeBuildGit(objectDir,['ls-tree','-z',tree,'--',path],8192)).toString();const match=/^(100644|100755) blob ([a-f0-9]{40,64})\t([^\0]+)\0$/.exec(entry);
   if(!match||match[3]!==path)return fail('DEBUG_PACKET_PATH','Source window is not an exact regular frozen blob.');
   const bytes=await safeBuildGit(objectDir,['cat-file','blob',match[2]!],4194305);
   if(bytes.includes(0))continue;
   const all=bytes.toString('utf8'),lines=all.split('\n');
   const section=rawDiff.toString('utf8').split('diff --git ').find(s=>s.startsWith('a/'+changed.path+' b/'+changed.path+'\n')),hunk=section?.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
   const first=Math.max(0,Math.min(lines.length-1,Number(hunk?.[revision==='BASE'?1:2]??1)-1)-10),window=lines.slice(first,first+DEBUG_LIMITS.sourceLines).join('\n'),text=boundedDebugText(window,DEBUG_LIMITS.sourceBytes);
   sources.push({id:'source-'+(sources.length+1),path,revision,startLine:first+1,endLine:first+text.split('\n').length,text,truncated:first>0||Buffer.byteLength(text)<bytes.length});
  }
 }
 const requirementIds=new Set([...input.slice.requirementIds,...failedClaims.flatMap(f=>f.claim.requirementIds)]);
 const data:FailurePacketData={version:'failure-packet-v1',missionId:run.missionId,originalIntent:input.originalIntent,slice:{id:input.slice.id,title:input.slice.title,outcome:input.slice.outcome},requirements:input.contract.requirements.filter(r=>requirementIds.has(r.id)).map(({id,text})=>({id,text})),constraints:input.contract.constraints.map(({id,text})=>({id,text})),nonGoals:input.contract.nonGoals.map(({id,text})=>({id,text})),binding:{candidateId:candidate.id,attemptId:run.attemptId,generation:run.generation,treeHash:run.treeHash,baseHead:run.baseHead,diffHash:run.diffHash,verificationRunId:run.id,contractRevisionId:input.contractRevisionId,contractHash:input.contractHash,planRevisionId:input.planRevisionId,planHash:input.planHash,evaluationRevisionId:input.evaluationRevisionId,evaluationHash:input.evaluationHash,recipeId:recipe.id,recipeHash:recipe.hash,evaluatorHash:recipe.evaluatorHash,environmentIdentity},environment:{identity:environmentIdentity,manifest:run.environment.environmentManifest&&typeof run.environment.environmentManifest==='object'&&!Array.isArray(run.environment.environmentManifest)?run.environment.environmentManifest as Record<string,unknown>:null,unavailable:!run.environment.environmentManifest},failedClaims,evidence,sources,changedPaths:candidate.changedPaths,diffExcerpt:boundedDebugText(rawDiff.toString('utf8'),DEBUG_LIMITS.diffBytes),diffTruncated:rawDiff.length>DEBUG_LIMITS.diffBytes,builderChecks:{authoritative:false,checks:checks.slice(0,8).map(c=>({...c,cwd:'[isolated Builder workspace]',command:boundedDebugText(c.command,1000),output:boundedDebugText(c.output,1000),truncated:c.truncated||Buffer.byteLength(c.output)>1000}))},previousCycles:structuredClone(options.previousCycles),limits:DEBUG_LIMITS,truncated:false};
 data.truncated=data.diffTruncated||candidate.changedPaths.length>DEBUG_LIMITS.paths||data.sources.some(s=>s.truncated)||data.evidence.some(e=>e.truncated)||checks.length>8;
 while(Buffer.byteLength(canonicalContractJson(data))>DEBUG_LIMITS.packetBytes&&data.sources.length){data.sources.pop();data.truncated=true;}
 if(Buffer.byteLength(canonicalContractJson(data))>DEBUG_LIMITS.packetBytes){data.diffExcerpt='';data.diffTruncated=true;data.builderChecks.checks=[];data.environment.manifest=null;data.environment.unavailable=true;data.truncated=true;}
 const canonical=canonicalContractJson(data);
 if(Buffer.byteLength(canonical)>DEBUG_LIMITS.packetBytes)return fail('DEBUG_PACKET_LIMIT','Required failure metadata exceeds the bounded packet.');
 if(secret.test(canonical))return fail('DEBUG_PACKET_SECRET','Failure evidence contains a credential-like value requiring human handling.');
 return freeze({id:randomUUID(),sessionId:options.sessionId,cycle:options.cycle,data,canonical,hash:verificationHash(canonical),createdAt:new Date().toISOString()});
}
export async function makeFailurePacket(db:DatabaseSync,dataDir:string,missionId:string,runId:string,options:PacketOptions):Promise<FailurePacket>{
 if(!options.store)return fail('DEBUG_PACKET_STORE','Supply the existing Verification Store for protected evidence validation.');
 const view=options.store.view(missionId),run=view.runs.find(r=>r.id===runId),recipe=view.recipe;
 if(!run||!recipe)return fail('DEBUG_PACKET_STALE','Current failed Run and recipe are required.');
 const row=db.prepare('SELECT input_json,checks_json,cleanup_json,generation,status FROM build_attempts WHERE id=? AND mission_id=?').get(run.attemptId,missionId);
 const candidate=db.prepare('SELECT candidate_json FROM build_candidates WHERE attempt_id=?').get(run.attemptId);
 if(!row||!candidate||row.status!=='CANDIDATE'||row.generation!==run.generation)return fail('DEBUG_PACKET_BINDING','Current frozen Builder attempt is unavailable.');
 const packet=await makeFailurePacketFrom({dataDir,input:JSON.parse(String(row.input_json)),checks:JSON.parse(String(row.checks_json)),cleanup:JSON.parse(String(row.cleanup_json)),candidate:JSON.parse(String(candidate.candidate_json)),run,recipe,view,readEvidence:options.store.readEvidence},options);
 const finalView=options.store.view(missionId);if(!finalView.current||canonicalContractJson(finalView.runs[0])!==canonicalContractJson(run)||finalView.recipe?.hash!==recipe.hash)return fail('DEBUG_PACKET_STALE','Verification currentness changed while assembling the Failure Packet.');
 return packet;
}
