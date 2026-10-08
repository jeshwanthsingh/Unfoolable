import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {realpath,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import {BUILDER_PROMPT_VERSION,CERTIFIED_CODEX_VERSION,type BuildInput} from '../../packages/shared/build.ts';
import type {VerticalSlicePlan,EvaluationContract} from '../../packages/shared/planning.ts';
import type {Logger} from './log.ts';
import {buildPlanningInput} from './planning-input.ts';
import {planningPhase,COMPLETE_PLANNING_PAIR} from './planning-phase.ts';
import {canonicalContractJson} from './contract-store.ts';
import {validatePlanningPayload} from './planning-validation.ts';
import {validateRepository} from './repository.ts';
import {safeBuildGit,sourceIndexHash,safeBuildPath} from './build-workspace.ts';
import {BuildError} from './build-errors.ts';
import {readOracle,evaluationSignature} from './oracle-author.ts';
export type BuildAdmission={input:BuildInput;sourceRoot:string;baseHead:string;gitCommonDir:string;admissionMs:number;sourceIndexHash:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const fail=(code:string,message:string):never=>{throw new BuildError(code,message);};
export async function admitBuild(db:DatabaseSync,missionId:string,sliceId:string,roots:readonly string[],logger:Logger,version:string):Promise<BuildAdmission>{
 const start=performance.now();if(version!==CERTIFIED_CODEX_VERSION)return fail('UNCERTIFIED_CODEX_VERSION','The installed Codex version is not certified for Builder.');
 const mission=db.prepare('SELECT m.id,m.original_intent,p.repo_root FROM missions m JOIN projects p ON p.id=m.project_id WHERE m.id=?').get(missionId);
 if(!mission)throw new BuildError('MISSION_NOT_FOUND','That Mission or its registered Project could not be found.',404);
 if(db.prepare("SELECT id FROM build_attempts WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED') LIMIT 1").get())return fail('BUILD_BUSY','An existing Builder Attempt requires completion or reconciliation.');
 let current:ReturnType<typeof buildPlanningInput>;try{current=buildPlanningInput(db,missionId);}catch{ return fail('PLAN_NOT_READY','Accept the current Mission Contract and complete planning pair before building.');}
 if(planningPhase(db,missionId,'CONTRACT_READY')!=='PLAN_READY'||db.prepare("SELECT id FROM planning_drafts WHERE mission_id=? AND status IN('PREPARING','RUNNING') LIMIT 1").get(missionId))return fail('PLAN_NOT_READY','The Mission must be in current PLAN_READY state.');
 const p=db.prepare('SELECT p.* '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? ORDER BY p.revision DESC LIMIT 1').get(missionId);
 if(!p||p.input_hash!==current.hash||p.contract_revision_id!==current.input.contractRevisionId)return fail('PLAN_NOT_READY','The accepted planning pair is stale or incomplete.');
 const e=db.prepare('SELECT * FROM evaluation_contract_revisions WHERE pair_id=?').get(p.pair_id!),draft=db.prepare('SELECT input_json,user_edits_json FROM planning_drafts WHERE id=?').get(p.draft_id!);
 if(!e||!draft||canonicalContractJson(JSON.parse(String(draft.input_json)))!==canonicalContractJson(current.input))return fail('INVALID_BUILD_INPUT','Accepted planning input identity is invalid.');
 const plan=JSON.parse(String(p.payload_json)) as VerticalSlicePlan,evaluation=JSON.parse(String(e.payload_json)) as EvaluationContract,edits=JSON.parse(String(p.user_edits_json)),coverage=JSON.parse(String(p.coverage_json));
 const pc=canonicalContractJson({payload:plan,inputHash:current.hash,userEdits:edits,coverage}),ec=canonicalContractJson({payload:evaluation,inputHash:current.hash,userEdits:edits});
 if(pc!==p.canonical||ec!==e.canonical||digest(pc)!==p.plan_hash||digest(ec)!==e.evaluation_hash||canonicalContractJson(JSON.parse(String(draft.user_edits_json)))!==canonicalContractJson(edits))return fail('INVALID_BUILD_INPUT','Accepted planning artifacts do not match their canonical hashes.');
 const validated=validatePlanningPayload({plan,evaluationContract:evaluation},current.input,{allowOracleReferences:true});if(canonicalContractJson(validated.coverage)!==canonicalContractJson(coverage))return fail('INVALID_BUILD_INPUT','Accepted planning coverage is invalid.');
 if(evaluation.claims.some(c=>c.oracle)){
  try{for(const claim of evaluation.claims){const ref=claim.oracle;if(!ref||ref.admission!=='ADMITTED')throw Error('Oracle has not passed BASE admission');const manifest=readOracle(ref);if(manifest.evaluationSignature!==evaluationSignature({plan,evaluationContract:evaluation})||manifest.sourceRoot!==String(mission.repo_root))throw Error('Oracle binding changed');}}catch{return fail('ORACLE_REJECTED','The protected oracle is missing, changed or not admitted. Review a fresh Evaluation draft before building.');}
 }
 const slice=plan.verticalSlices.find(s=>s.id===sliceId);if(!slice)throw new BuildError('UNKNOWN_SLICE','Choose exactly one Slice from the current accepted Plan.',400);
 const analysis=db.prepare("SELECT packet_json FROM mission_analyses WHERE id=? AND mission_id=? AND status='SUCCEEDED'").get(current.input.sourceBindings.analysisId,missionId);if(!analysis)return fail('INVALID_BUILD_INPUT','The accepted analysis binding is unavailable.');const packet=JSON.parse(String(analysis.packet_json));
 const sourceRoot=String(mission.repo_root);let identity:Awaited<ReturnType<typeof validateRepository>>;try{identity=await validateRepository(sourceRoot,roots,logger);}catch{ return fail('BUILD_REPOSITORY_INVALID','The registered Project repository cannot be revalidated within allowed roots.');}
 if(identity.repoRoot!==sourceRoot||await realpath(sourceRoot)!==sourceRoot)return fail('BUILD_REPOSITORY_CHANGED','The canonical repository path must match its registered root.');
 const baseHead=String(packet.project?.baseHead);if(identity.registeredHead!==baseHead)return fail('BUILD_HEAD_MISMATCH','Source HEAD must match the accepted analysis and planned base.');
 if((await safeBuildGit(sourceRoot,['status','--porcelain=v1','-z','--untracked-files=all'])).length)return fail('BUILD_SOURCE_DIRTY','The source repository must be clean, including untracked files.');
 const tracked=(await safeBuildGit(sourceRoot,['ls-files','-z'])).toString('utf8').split('\0').filter(Boolean);if(tracked.some(p=>!safeBuildPath(p)))return fail('UNSAFE_SOURCE_PATH','The source tracks a credential-like or unsafe path.');
 for(const path of tracked){if(path==='.cc-runtime'||path.startsWith('.cc-runtime/'))return fail('UNSAFE_SOURCE_PATH','The owned runtime directory cannot contain source files.');const stat=await lstat(join(sourceRoot,path));if(!stat.isFile()||stat.isSymbolicLink())return fail('UNSAFE_SOURCE_PATH','Builder source files must be regular files, without symlinks or submodules.');}
 const gitCommonDir=await realpath((await safeBuildGit(sourceRoot,['rev-parse','--path-format=absolute','--git-common-dir'])).toString('utf8').trim());
 const requirementIds=new Set([...slice.requirementIds,...plan.crossCuttingRequirements.map(r=>r.requirementId)]),claimIds=new Set([...slice.evaluationClaimIds,...plan.crossCuttingRequirements.flatMap(r=>r.evaluationClaimIds)]);
 const input:BuildInput={version:'builder-input-v1',missionId,originalIntent:String(mission.original_intent),planRevisionId:String(p.id),evaluationRevisionId:String(e.id),pairId:String(p.pair_id),planningInputHash:current.hash,contractRevisionId:current.input.contractRevisionId,contractHash:current.input.contractHash,planHash:String(p.plan_hash),evaluationHash:String(e.evaluation_hash),slice,contract:{goal:current.input.contract.goal,requirements:current.input.contract.requirements.filter(r=>requirementIds.has(r.id)),scope:current.input.contract.scope,nonGoals:current.input.contract.nonGoals,constraints:current.input.contract.constraints},evaluationClaims:evaluation.claims.filter(c=>claimIds.has(c.id)||c.constraintIds.length>0),project:{baseHead,branch:packet.project.branch??null},promptVersion:BUILDER_PROMPT_VERSION};
 return {input,sourceRoot,baseHead,gitCommonDir,admissionMs:Math.round(performance.now()-start),sourceIndexHash:await sourceIndexHash(sourceRoot)};
}
