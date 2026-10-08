import {readOracle} from './oracle-author.ts';
import {createHash,randomUUID} from 'node:crypto';
import type {PlanningInput,EvaluationClaim} from '../../packages/shared/planning.ts';
import {VERIFICATION_VERSION,type VerificationRecipe,type VerificationStep} from '../../packages/shared/verification.ts';
import {canonicalContractJson} from './contract-store.ts';
export const verificationHash=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
// Objective path protection only. This never asserts semantic scope compliance.
export const TRUSTED_FORBIDDEN_PATHS=Object.freeze(['.git','.codex','.ssh','.aws','.env','verification','apps/server/verification','apps/server/verification-store.ts','apps/server/verification-recipe.ts','apps/server/verification-executor.ts','apps/server/verification-environment.ts','apps/server/verification-workspace.ts','apps/server/verification-migration.ts','packages/shared/verification.ts','scripts/protected-verification','scripts/verify_denial.py','command-center.sqlite']);
export type RecipeInput={missionId:string;contractRevisionId:string;planRevisionId:string;evaluationRevisionId:string;evaluationHash:string;claims:EvaluationClaim[];input:PlanningInput;sliceClaimIds:string[];evaluatorHash:string};
export function createVerificationRecipe(binding:RecipeInput):VerificationRecipe {
 const {input,claims,sliceClaimIds}=binding;
 const explicitDenial=input.contract.requirements.some(requirement=>requirement.text==='A denied proposal returns false without invoking the effect.'&&requirement.sourceIds.some(s=>input.sources.some(source=>source.id===s&&['ORIGINAL_INTENT','CLARIFICATION_ANSWER','USER_EDIT'].includes(source.type))));
 const boundRequirement=(claim:EvaluationClaim,text:string)=>claim.requirementIds.length===1&&input.contract.requirements.some(r=>r.id===claim.requirementIds[0]&&r.text===text&&r.sourceIds.some(id=>input.sources.some(source=>source.id===id&&['ORIGINAL_INTENT','CLARIFICATION_ANSWER','USER_EDIT'].includes(source.type))));
 const finiteDenialClaim=(claim:EvaluationClaim)=>claim.verificationType==='unit'&&claim.preconditions.length===0&&claim.notes===''&&claim.manualRationale===null&&((claim.claim==='Denied proposals never invoke the effect.'&&boundRequirement(claim,'A denied proposal returns false without invoking the effect.')&&canonicalContractJson(claim.requiredEvidence)===canonicalContractJson(['Denial test records zero effects and false return.']))||(claim.claim==='Allowed proposals run exactly once with true return.'&&boundRequirement(claim,'An allowed proposal invokes the effect exactly once and returns true.')&&canonicalContractJson(claim.requiredEvidence)===canonicalContractJson(['Existing allowed-path test records one effect and true return.'])));
 const signature=input.sources.some(source=>source.type==='PROJECT_EVIDENCE'&&source.path==='approval.py'&&/def\s+apply_proposal\s*\(\s*allowed\s*,\s*effect\s*\)/.test(source.text));
 const steps:VerificationStep[]=claims.map(claim=>{
  let oracle:VerificationStep['oracle'];let oracleCase:'DENIED'|'ALLOWED'|undefined;let kind:VerificationStep['kind']='UNSUPPORTED';let description='No trusted executable recipe covers this accepted claim.';
  if(sliceClaimIds.includes(claim.id)){
   if(claim.oracle){if(claim.oracle.admission==='ADMITTED'){kind='NATIVE_ORACLE';oracle={reference:structuredClone(claim.oracle),manifest:readOracle(claim.oracle)};description='Frozen native process oracle: '+claim.oracle.summary;}else description='Native oracle failed BASE admission: '+(claim.oracle.reason??'Rejected');}
   else if(claim.verificationType==='manual'&&claim.manualRationale?.trim()){kind='MANUAL';description=claim.manualRationale;}
   else if(signature&&explicitDenial&&finiteDenialClaim(claim)){kind='DENIAL_ORACLE';oracleCase=claim.claim==='Denied proposals never invoke the effect.'?'DENIED':'ALLOWED';description=oracleCase==='DENIED'?'Protected Boolean denial case: apply_proposal(false, effect) returns false with zero brokered effects. Exact accepted denial clause and pre-Build approval.py API; no provider/protocol authorization verdict.':'Protected Boolean allowed case: apply_proposal(true, effect) returns true with exactly one brokered effect. Exact accepted allowed clause and pre-Build approval.py API; no denial or provider/protocol authorization verdict.';}
   else if(claim.verificationType==='static'&&claim.claim==='Candidate changed paths do not modify protected evaluator or coordinator metadata paths.'){kind='STATIC_DIFF';description='Objective changed-path comparison against frozen coordinator forbidden paths; no semantic scope verdict.';}
  }else description='Claim is outside this Candidate slice; full acceptance remains unsupported.';
  return {id:'step:'+claim.id,claimIds:[claim.id],kind,timeoutMs:10000,description,provenance:'PROTECTED',...(oracle?{oracle}:{}),...(oracleCase?{oracleCase}:{}),...(kind==='STATIC_DIFF'?{forbiddenPaths:[...TRUSTED_FORBIDDEN_PATHS]}:{})};
 });
 const document={missionId:binding.missionId,contractRevisionId:binding.contractRevisionId,contractHash:input.contractHash,planRevisionId:binding.planRevisionId,evaluationRevisionId:binding.evaluationRevisionId,evaluationHash:binding.evaluationHash,version:VERIFICATION_VERSION,steps,claims,evaluatorHash:binding.evaluatorHash};
 const canonical=canonicalContractJson(document);
 return {id:randomUUID(),missionId:binding.missionId,contractRevisionId:binding.contractRevisionId,planRevisionId:binding.planRevisionId,evaluationRevisionId:binding.evaluationRevisionId,evaluationHash:binding.evaluationHash,version:VERIFICATION_VERSION,steps,claims,canonical,hash:verificationHash(canonical),evaluatorHash:binding.evaluatorHash,createdAt:new Date().toISOString()};
}
