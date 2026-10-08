import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import type {MissionOutcome} from '../../packages/shared/outcomes.ts';
import type {BuildView,CleanupResult} from '../../packages/shared/build.ts';
import {isVerificationView,type VerificationView} from '../../packages/shared/verification.ts';
import type {Logger} from './log.ts';
import {diagnosisOwnershipUncertain} from './debug-ownership.ts';
import {BuildError} from './build-errors.ts';
import {safeBuildGit} from './build-workspace.ts';
import {materializeCandidate} from './verification-workspace.ts';
import {validateRepository} from './repository.ts';
type Intent={outcome:MissionOutcome;sourceRoot:string;baseHead:string;treeHash:string;gitCommonDir:string};
const fail=(code:string,message:string):never=>{throw new BuildError(code,message);};
const clean=(c:CleanupResult|null)=>!!c?.verified&&!c.ambiguous&&!c.remaining.length&&c.terminalCount===0;
export function createMissionOutcomeStore(db:DatabaseSync,config:{dataDir:string;projectRoots:readonly string[]},logger:Logger,readers:{verification:(id:string)=>VerificationView;build:(id:string)=>BuildView}){
 const busy=new Set<string>();
 const view=(missionId:string):MissionOutcome|null=>{const row=db.prepare('SELECT * FROM mission_outcomes WHERE mission_id=?').get(missionId);return row?{missionId,state:row.state as MissionOutcome['state'],createdAt:String(row.created_at),branch:row.branch as string|null,commit:row.commit_hash as string|null,candidateId:row.candidate_id as string|null,runId:row.run_id as string|null}:null;};
 const pending=(id:string):Intent|null=>{const r=db.prepare('SELECT intent_json FROM mission_land_intents WHERE mission_id=?').get(id);return r?JSON.parse(String(r.intent_json)):null;};
 const exists=(id:string)=>{if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))fail('INVALID_MISSION_ID','Mission identity is invalid.');const row=db.prepare('SELECT p.repo_root FROM missions m JOIN projects p ON p.id=m.project_id WHERE m.id=?').get(id);if(!row)fail('MISSION_NOT_FOUND','Mission not found.');return String(row!.repo_root);};
 const idle=(id:string)=>{if(diagnosisOwnershipUncertain(db)||db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debug_sessions'").get()&&db.prepare("SELECT id FROM debug_sessions WHERE status IN('CREATED','DIAGNOSING','CORRECTING','VERIFYING')").get())fail('OUTCOME_BUSY','Debug execution or Diagnosis cleanup requires reconciliation.');const b=readers.build(id),v=readers.verification(id);if(b.workerPresent||b.attempt&&(['CREATED','STARTING','RUNNING','FINALIZING','CANCELLING','RECONCILE_REQUIRED'].includes(b.attempt.status)||!clean(b.attempt.cleanup))||v.runs.some(r=>['CREATED','PREPARING','RUNNING'].includes(r.status)||!clean(r.cleanup)))fail('OUTCOME_BUSY','Owned execution or cleanup requires completion and reconciliation.');return {b,v};};
 const admission=(id:string,expected:string)=>{const {b,v}=idle(id),candidate=b.candidate,attempt=b.attempt,run=v.runs[0];if(!isVerificationView(v)||!b.current||!v.current||!v.eligible||!candidate||!attempt||!run||run.id!==expected||run.status!=='PASSED'||!run.endedAt||!clean(run.cleanup)||!v.recipe||!v.recipe.claims.length||run.results.length!==v.recipe.claims.length||run.results.some(r=>r.status!=='PASS')||!v.recipe.claims.every(c=>run.results.some(r=>r.claimId===c.id))||run.candidateId!==candidate.id||run.attemptId!==attempt.id||run.generation!==attempt.generation||run.treeHash!==candidate.treeHash||run.diffHash!==candidate.diffHash||run.baseHead!==candidate.baseHead||attempt.baseHead!==candidate.baseHead||attempt.status!=='CANDIDATE'||candidate.inventoryTruncated||run.environment.evidenceValidated!==true||run.environment.currentnessValidated!==true)fail('LAND_NOT_CURRENT','Land requires the current complete protected PASS and certified cleanup.');return {candidate:candidate!,attempt:attempt!,run:run!};};
 const save=(o:MissionOutcome)=>{db.prepare('INSERT INTO mission_outcomes VALUES(?,?,?,?,?,?,?)').run(o.missionId,o.state,o.createdAt,o.branch,o.commit,o.candidateId,o.runId);logger({event:'mission.outcome',code:o.state});return o;};
 const git=async(root:string,args:string[],input?:Buffer)=>(await safeBuildGit(root,args,65*1024*1024,undefined,input)).toString().trim();
 const source=async(root:string,base:string,common?:string)=>{const repo=await validateRepository(root,config.projectRoots,logger);if(repo.repoRoot!==root||await realpath(root)!==root||repo.registeredHead!==base)fail('SOURCE_CHANGED','Source HEAD or canonical repository identity changed; review is required.');const dir=await realpath(await git(root,['rev-parse','--path-format=absolute','--git-common-dir']));if(common&&dir!==common)fail('SOURCE_CHANGED','Source Git identity changed; review is required.');return dir;};
 const refValue=(root:string,ref:string)=>git(root,['show-ref','--verify','--hash',ref]).catch(()=>null);
 const land=async(missionId:string,expectedRunId:string):Promise<MissionOutcome>=>{
  exists(missionId);if(busy.has(missionId))return fail('OUTCOME_BUSY','A terminal operation is already active.');busy.add(missionId);
  try{
   const done=view(missionId);if(done){if(done.state==='LANDED'&&done.runId===expectedRunId)return done;return fail('MISSION_TERMINAL','Mission already has an immutable terminal outcome.');}
   let intent=pending(missionId);
   if(intent&&intent.outcome.runId!==expectedRunId)return fail('LAND_RECONCILE_REQUIRED','Retry the original Land run to reconcile its durable intent.');
   const root=exists(missionId);
   // A recorded intent permits only adoption of its exact previously created ref.
   if(intent){if(root!==intent.sourceRoot)return fail('SOURCE_CHANGED','Registered source identity changed.');await source(root,intent.baseHead,intent.gitCommonDir);const ref='refs/heads/'+intent.outcome.branch,found=await refValue(root,ref);if(found){if(found!==intent.outcome.commit)return fail('LAND_BRANCH_CONFLICT','Land branch differs from the durable intent; review is required.');if(await git(root,['rev-parse',found+'^{tree}'])!==intent.treeHash||await git(root,['rev-list','--parents','-n','1',found])!==found+' '+intent.baseHead)return fail('LAND_RECONCILE_REQUIRED','Land commit binding cannot be certified.');return save(intent.outcome);}}
   const {candidate,attempt,run}=admission(missionId,expectedRunId);if(attempt.sourceRoot!==root)return fail('SOURCE_CHANGED','Candidate source identity differs from the registered repository.');
   const ownership=JSON.parse(await readFile(join(await realpath(config.dataDir),'attempts',attempt.id,'ownership.json'),'utf8')) as {attemptId?:string;sourceRoot?:string;baseHead?:string;gitCommonDir?:string};if(ownership.attemptId!==attempt.id||ownership.sourceRoot!==root||ownership.baseHead!==candidate.baseHead||typeof ownership.gitCommonDir!=='string')return fail('SOURCE_CHANGED','Candidate source ownership identity cannot be certified.');
   const common=await source(root,candidate.baseHead,intent?.gitCommonDir??ownership.gitCommonDir),branch='cc/'+missionId,ref='refs/heads/'+branch;
   if(await refValue(root,ref))return fail('LAND_BRANCH_CONFLICT','The Land branch already exists and will not be overwritten.');
   if(intent){if(intent.treeHash!==candidate.treeHash||intent.outcome.candidateId!==candidate.id||intent.baseHead!==candidate.baseHead)return fail('LAND_RECONCILE_REQUIRED','Candidate differs from the durable Land intent.');}
   else{
    const materialized=await materializeCandidate(config.dataDir,'land-'+randomUUID(),candidate);
    const pack=await readFile(join(await realpath(config.dataDir),'attempts',attempt.id,'candidate.pack'));
    if(createHash('sha256').update(pack).digest('hex')!==materialized.packHash||run.environment.packHash!==materialized.packHash)return fail('CANDIDATE_ARTIFACT_IDENTITY_MISMATCH','Candidate pack changed after protected verification.');
    admission(missionId,expectedRunId);await source(root,candidate.baseHead,common);
    await safeBuildGit(root,['unpack-objects','-r'],65*1024*1024,undefined,pack);
    const commit=await git(root,['-c','user.name=Command Center','-c','user.email=command-center@localhost','-c','commit.gpgSign=false','commit-tree',candidate.treeHash,'-p',candidate.baseHead,'-m','Command Center Land '+missionId]);
    intent={sourceRoot:root,baseHead:candidate.baseHead,treeHash:candidate.treeHash,gitCommonDir:common,outcome:{missionId,state:'LANDED',createdAt:new Date().toISOString(),branch,commit,candidateId:candidate.id,runId:run.id}};
    if(view(missionId))return fail('MISSION_TERMINAL','Mission became terminal during Land preparation.');
    db.prepare('INSERT INTO mission_land_intents VALUES(?,?)').run(missionId,JSON.stringify(intent));
   }
   admission(missionId,expectedRunId);await source(root,intent.baseHead,intent.gitCommonDir);
   try{await git(root,['update-ref','--stdin'],Buffer.from('start\nverify HEAD '+intent.baseHead+'\ncreate '+ref+' '+intent.outcome.commit+'\nprepare\ncommit\n'));}catch{const found=await refValue(root,ref);if(found!==intent.outcome.commit)fail('LAND_RECONCILE_REQUIRED','Atomic branch creation did not complete; review or retry the original run.');}
   if(await refValue(root,ref)!==intent.outcome.commit)fail('LAND_RECONCILE_REQUIRED','Land branch identity changed before recording the outcome.');
   return save(intent.outcome);
  }finally{busy.delete(missionId);}
 };
 const abandon=async(missionId:string):Promise<MissionOutcome>=>{exists(missionId);if(busy.has(missionId))return fail('OUTCOME_BUSY','A terminal operation is already active.');const done=view(missionId);if(done){if(done.state==='ABANDONED')return done;return fail('MISSION_TERMINAL','Mission is already landed.');}if(pending(missionId))return fail('LAND_RECONCILE_REQUIRED','A durable Land intent requires reconciliation before another outcome.');idle(missionId);return save({missionId,state:'ABANDONED',createdAt:new Date().toISOString(),branch:null,commit:null,candidateId:null,runId:null});};
 return {view,land,abandon};
}
