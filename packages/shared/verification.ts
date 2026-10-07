import type {EvaluationClaim} from './planning.ts';
import type {ProcessRecord,CleanupResult} from './build.ts';
export const VERIFICATION_VERSION='protected-verification-v1';
export type ClaimStatus='PENDING'|'RUNNING'|'PASS'|'FAIL'|'ERROR'|'UNSUPPORTED'|'INCONCLUSIVE';
export type VerificationStatus='CREATED'|'PREPARING'|'RUNNING'|'PASSED'|'FAILED'|'INCONCLUSIVE'|'ERROR'|'INTERRUPTED';
export type VerificationStep={id:string;claimIds:string[];kind:'DENIAL_ORACLE'|'STATIC_DIFF'|'MANUAL'|'UNSUPPORTED';timeoutMs:number;description:string;provenance:'PROTECTED';oracleCase?:'DENIED'|'ALLOWED';forbiddenPaths?:string[]};
export type VerificationRecipe={id:string;missionId:string;contractRevisionId:string;planRevisionId:string;evaluationRevisionId:string;evaluationHash:string;version:typeof VERIFICATION_VERSION;steps:VerificationStep[];claims:EvaluationClaim[];canonical:string;hash:string;evaluatorHash:string;createdAt:string};
export type VerificationEvidence={id:string;runId:string;claimId:string|null;kind:string;path:string;sha256:string;bytes:number;createdAt:string;excerpt:string;truncated:boolean};
export type VerificationClaimResult={claimId:string;status:ClaimStatus;stepId:string;durationMs:number|null;note:string|null;operator:string|null;decidedAt:string|null};
export type VerificationRun={id:string;missionId:string;candidateId:string;attemptId:string;generation:number;treeHash:string;diffHash:string;baseHead:string;recipeId:string;recipeHash:string;evaluationHash:string;evaluatorHash:string;status:VerificationStatus;workspace:string;createdAt:string;endedAt:string|null;environment:Record<string,unknown>;processes:ProcessRecord[];cleanup:CleanupResult|null;results:VerificationClaimResult[];evidence:VerificationEvidence[];error:string|null};
export type VerificationView={recipe:VerificationRecipe|null;runs:VerificationRun[];current:boolean;eligible:boolean;reason:string|null};
export type VerificationAttention={kind:'manual_evaluation';runId:string;claimId:string;missionId:string;projectId:string;projectName:string;originalIntent:string};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const keys=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>required.includes(key)||optional.includes(key));
const text=(value:unknown,max=200,empty=false):value is string=>typeof value==='string'&&value.length<=max&&(empty||value.trim().length>0)&&!value.includes('\0');
const sha=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const git=(value:unknown):value is string=>typeof value==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const timestamp=(value:unknown):value is string=>text(value,40)&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
const strings=(value:unknown,max=30,min=0,length=700,unique=false):value is string[]=>Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(item=>text(item,length))&&(!unique||new Set(value).size===value.length);
const claimStatuses=['PENDING','RUNNING','PASS','FAIL','ERROR','UNSUPPORTED','INCONCLUSIVE'];
const runStatuses=['CREATED','PREPARING','RUNNING','PASSED','FAILED','INCONCLUSIVE','ERROR','INTERRUPTED'];
function validClaim(value:unknown):value is EvaluationClaim {
 if(!object(value)||!keys(value,['id','claim','requirementIds','constraintIds','riskIds','verificationType','requiredEvidence','preconditions','manualRationale','notes']))return false;
 return text(value.id)&&text(value.claim,700)&&['unit','integration','browser','performance','security','recovery','static','manual'].includes(String(value.verificationType))&&strings(value.requirementIds,20,0,200,true)&&strings(value.constraintIds,20,0,200,true)&&strings(value.riskIds,20,0,200,true)&&strings(value.requiredEvidence,8,1)&&strings(value.preconditions,8)&&text(value.notes,700,true)&&(value.verificationType==='manual'?text(value.manualRationale,700):value.manualRationale===null);
}
function validRecipe(value:unknown):value is VerificationRecipe {
 if(!object(value)||!keys(value,['id','missionId','contractRevisionId','planRevisionId','evaluationRevisionId','evaluationHash','version','steps','claims','canonical','hash','evaluatorHash','createdAt']))return false;
 if(!['id','missionId','contractRevisionId','planRevisionId','evaluationRevisionId'].every(key=>text(value[key]))||value.version!==VERIFICATION_VERSION||!sha(value.evaluationHash)||!sha(value.hash)||!sha(value.evaluatorHash)||!text(value.canonical,262144)||!timestamp(value.createdAt)||!Array.isArray(value.claims)||value.claims.length<1||value.claims.length>30||!value.claims.every(validClaim)||new Set(value.claims.map(claim=>claim.id)).size!==value.claims.length||!Array.isArray(value.steps)||value.steps.length<1||value.steps.length>60)return false;
 const claims=new Set(value.claims.map(claim=>claim.id));
 if(!value.steps.every(step=>object(step)&&keys(step,['id','claimIds','kind','timeoutMs','description','provenance'],['forbiddenPaths','oracleCase'])&&text(step.id)&&strings(step.claimIds,30,1,200,true)&&step.claimIds.every(id=>claims.has(id))&&['DENIAL_ORACLE','STATIC_DIFF','MANUAL','UNSUPPORTED'].includes(String(step.kind))&&integer(step.timeoutMs,1,900000)&&text(step.description,2000)&&step.provenance==='PROTECTED'&&(!Object.hasOwn(step,'oracleCase')||step.kind==='DENIAL_ORACLE'&&['DENIED','ALLOWED'].includes(String(step.oracleCase)))&&(!Object.hasOwn(step,'forbiddenPaths')||strings(step.forbiddenPaths,256,0,4096,true))))return false;
 const steps=value.steps as VerificationStep[],acceptedClaims=value.claims as EvaluationClaim[];
 return new Set(steps.map(step=>step.id)).size===steps.length&&value.claims.every(claim=>steps.some(step=>step.claimIds.includes(claim.id)))&&steps.every(step=>step.kind!=='MANUAL'||step.claimIds.every(id=>acceptedClaims.some(claim=>claim.id===id&&claim.verificationType==='manual')));
}
function validProcess(value:unknown):value is ProcessRecord {
 return object(value)&&keys(value,['pid','ppid','pgid','sid','birth','executable','observedAt','exitedAt'])&&integer(value.pid,1)&&integer(value.ppid)&&integer(value.pgid)&&integer(value.sid)&&text(value.birth,200)&&text(value.executable,4096)&&timestamp(value.observedAt)&&(value.exitedAt===null||timestamp(value.exitedAt));
}
function validCleanup(value:unknown):value is CleanupResult {
 return object(value)&&keys(value,['verified','ambiguous','remaining','terminalCount','reason'])&&typeof value.verified==='boolean'&&typeof value.ambiguous==='boolean'&&Array.isArray(value.remaining)&&value.remaining.length<=256&&value.remaining.every(validProcess)&&integer(value.terminalCount)&&((value.reason===null)||text(value.reason,2000))&&(!value.verified||(!value.ambiguous&&value.remaining.length===0));
}
function validResult(value:unknown):value is VerificationClaimResult {
 return object(value)&&keys(value,['claimId','status','stepId','durationMs','note','operator','decidedAt'])&&text(value.claimId)&&text(value.stepId)&&claimStatuses.includes(String(value.status))&&(value.durationMs===null||(typeof value.durationMs==='number'&&Number.isFinite(value.durationMs)&&value.durationMs>=0&&value.durationMs<=86400000))&&(value.note===null||text(value.note,4000,true))&&(value.operator===null||text(value.operator,200))&&(value.decidedAt===null||timestamp(value.decidedAt))&&((value.operator===null)===(value.decidedAt===null));
}
function validEnvironment(value:unknown,depth=0):boolean {
 if(depth>16)return false;
 if(value===null||typeof value==='boolean')return true;
 if(typeof value==='string')return value.length<=65536;
 if(typeof value==='number')return Number.isFinite(value);
 if(Array.isArray(value))return value.length<=4096&&value.every(item=>validEnvironment(item,depth+1));
 return object(value)&&Object.keys(value).length<=256&&Object.entries(value).every(([key,item])=>text(key,200)&&validEnvironment(item,depth+1));
}
function validRun(value:unknown):value is VerificationRun {
 if(!object(value)||!keys(value,['id','missionId','candidateId','attemptId','generation','treeHash','diffHash','baseHead','recipeId','recipeHash','evaluationHash','evaluatorHash','status','workspace','createdAt','endedAt','environment','processes','cleanup','results','evidence','error']))return false;
 if(!['id','missionId','candidateId','attemptId','recipeId'].every(key=>text(value[key]))||!integer(value.generation,1)||!git(value.treeHash)||!git(value.baseHead)||!sha(value.diffHash)||!sha(value.recipeHash)||!sha(value.evaluationHash)||!sha(value.evaluatorHash)||!runStatuses.includes(String(value.status))||!text(value.workspace,4096)||!timestamp(value.createdAt)||!(value.endedAt===null||timestamp(value.endedAt))||!object(value.environment)||!validEnvironment(value.environment)||JSON.stringify(value.environment).length>262144||!Array.isArray(value.processes)||value.processes.length>256||!value.processes.every(validProcess)||!(value.cleanup===null||validCleanup(value.cleanup))||!Array.isArray(value.results)||value.results.length>30||!value.results.every(validResult)||new Set(value.results.map(result=>result.claimId)).size!==value.results.length||!Array.isArray(value.evidence)||value.evidence.length>256||!(value.error===null||text(value.error,2000)))return false;
 const results=value.results;
 if(!value.evidence.every(item=>object(item)&&keys(item,['id','runId','claimId','kind','path','sha256','bytes','createdAt','excerpt','truncated'])&&text(item.id)&&item.runId===value.id&&(item.claimId===null||text(item.claimId)&&results.some(result=>result.claimId===item.claimId))&&text(item.kind,200)&&text(item.path,4096)&&sha(item.sha256)&&integer(item.bytes,1,65536)&&timestamp(item.createdAt)&&text(item.excerpt,4096,true)&&typeof item.truncated==='boolean')||new Set(value.evidence.map(item=>(item as VerificationEvidence).id)).size!==value.evidence.length)return false;
 const active=['CREATED','PREPARING','RUNNING'].includes(String(value.status));
 if(active?value.endedAt!==null:value.endedAt===null)return false;
 if(value.status==='PASSED'&&(!results.length||results.some(result=>result.status!=='PASS')||!validCleanup(value.cleanup)||!value.cleanup.verified||!Object.keys(value.environment).length||results.some(result=>!(value.evidence as VerificationEvidence[]).some(item=>item.claimId===result.claimId&&!item.truncated))))return false;
 return true;
}
export function isVerificationView(value:unknown):value is VerificationView {
 if(!object(value)||!keys(value,['recipe','runs','current','eligible','reason'])||typeof value.current!=='boolean'||typeof value.eligible!=='boolean'||!(value.reason===null||text(value.reason,2000))||!(value.recipe===null||validRecipe(value.recipe))||!Array.isArray(value.runs)||value.runs.length>100||!value.runs.every(validRun)||new Set(value.runs.map(run=>run.id)).size!==value.runs.length)return false;
 const runs=value.runs,recipe=value.recipe;
 if(!runs.length)return recipe===null&&!value.current;
 if(!recipe||runs[0]!.recipeId!==recipe.id||runs.some(run=>run.missionId!==recipe.missionId))return false;
 for(const run of runs.filter(run=>run.recipeId===recipe.id)){
  if(run.recipeHash!==recipe.hash||run.evaluationHash!==recipe.evaluationHash||run.evaluatorHash!==recipe.evaluatorHash||run.results.length!==recipe.claims.length||!recipe.claims.every(claim=>run.results.some(result=>result.claimId===claim.id))||!run.results.every(result=>recipe.steps.some(step=>step.id===result.stepId&&step.claimIds.includes(result.claimId))))return false;
 }
 return true;
}
