import type {ContractBinding,ContractPayload,ContractSource} from './contracts.ts';
export const PLANNING_PROMPT_VERSION='mission-planning-v2';
export const PLANNING_DEFAULTS_VERSION='planning-defaults-v1';
export const PLANNING_LIMITS=Object.freeze({slices:8,claims:30,text:700,flowSteps:8,references:20,inputBytes:524288,payloadBytes:65536,canonicalBytes:131072});
export const PLANNING_DEFAULTS=['Prefer the smallest end-to-end observable increments.','Define evidence before implementation; prefer deterministic automated verification.','Preserve accepted scope, constraints and non-goals.','Classify risks without promoting them to requirements.'] as const;
export type PlanningInput={version:'planning-input-v1';missionId:string;contractRevisionId:string;contractHash:string;contractInputHash:string;contract:ContractPayload;sourceBindings:ContractBinding;sources:ContractSource[];promptVersion:typeof PLANNING_PROMPT_VERSION;defaultsVersion:typeof PLANNING_DEFAULTS_VERSION;defaults:readonly string[];limits:typeof PLANNING_LIMITS};
export const VERIFICATION_TYPES=['unit','integration','browser','performance','security','recovery','static','manual'] as const;
export type VerificationType=typeof VERIFICATION_TYPES[number];
export type VerticalSlice={id:string;title:string;outcome:string;requirementIds:string[];preconditions:string[];userVisibleFlow:string[];evaluationClaimIds:string[];order:number};
export type EvaluationClaim={id:string;claim:string;requirementIds:string[];constraintIds:string[];riskIds:string[];verificationType:VerificationType;requiredEvidence:string[];preconditions:string[];manualRationale:string|null;notes:string};
export type CrossCuttingRequirement={requirementId:string;rationale:string;evaluationClaimIds:string[]};
export type RiskHandling={riskId:string;disposition:'coveredByEvaluation'|'handledDuringImplementation'|'requiresHumanAttention'|'informational';evaluationClaimIds:string[];notes:string};
export type VerticalSlicePlan={verticalSlices:VerticalSlice[];crossCuttingRequirements:CrossCuttingRequirement[];riskHandling:RiskHandling[]};
export type EvaluationContract={claims:EvaluationClaim[]};
export type PlanningPayload={plan:VerticalSlicePlan;evaluationContract:EvaluationContract};
export type RequirementCoverage={requirementId:string;sliceIds:string[];evaluationClaimIds:string[];crossCutting:boolean};
export type ConstraintCoverage={constraintId:string;evaluationClaimIds:string[]};
export type PlanningCoverage={requirements:RequirementCoverage[];constraints:ConstraintCoverage[]};
export type PlanningEdit={targetId:string;kind:'USER_EDIT';fields:string[]};
export type PlanningStatus='PREPARING'|'RUNNING'|'SUCCEEDED'|'FAILED'|'INTERRUPTED';
export type PlanningDraft={id:string;missionId:string;parentDraftId:string|null;origin:'CODEX'|'USER_EDIT'|'REVISION';status:PlanningStatus;input:PlanningInput;inputHash:string;payload:PlanningPayload|null;coverage:PlanningCoverage|null;userEdits:PlanningEdit[];promptVersion:string;toolVersion:string|null;elapsedMs:number|null;createdAt:string;completedAt:string|null;error:string|null};
export type PlanRevision={id:string;pairId:string;missionId:string;revision:number;draftId:string;contractRevisionId:string;inputHash:string;payload:VerticalSlicePlan;coverage:PlanningCoverage;userEdits:PlanningEdit[];planHash:string;canonical:string;acceptedAt:string};
export type EvaluationRevision={id:string;pairId:string;missionId:string;revision:number;draftId:string;contractRevisionId:string;inputHash:string;payload:EvaluationContract;evaluationHash:string;canonical:string;acceptedAt:string};
export type PlanningPair={plan:PlanRevision;evaluation:EvaluationRevision;input:PlanningInput};
export type PlanningHistory={pairId:string;revision:number;planHash:string;evaluationHash:string;acceptedAt:string};
export type PlanningPhase='DRAFT'|'NEEDS_CLARIFICATION'|'CLARIFIED'|'CONTRACT_REVIEW'|'CONTRACT_READY'|'PLAN_REVIEW'|'PLAN_READY';
export type PlanningView={draft:PlanningDraft|null;operation:PlanningDraft|null;accepted:PlanningPair|null;history:PlanningHistory[];current:boolean;draftStale:boolean;acceptedStale:boolean;eligible:boolean;phase:PlanningPhase};
export type PlanningAttentionItem={kind:'plan_review';draftId:string;missionId:string;projectId:string;projectName:string;originalIntent:string;slices:number;claims:number};

import {isAttentionResponse as isContractAttentionResponse,type AttentionResponse as ContractAttentionResponse} from './contracts.ts';
export type AttentionResponse={items:(ContractAttentionResponse['items'][number]|PlanningAttentionItem)[];count:number};
const po=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const pt=(v:unknown,max=100,empty=false):v is string=>typeof v==='string'&&(empty||!!v.trim())&&v.length<=max;
const ph=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const pk=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const pa=(v:unknown,max=20,min=0,unique=false):v is string[]=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(s=>pt(s,700))&&(!unique||new Set(v).size===v.length);
function planningInput(v:unknown):v is PlanningInput{
 if(!po(v)||!pk(v,['version','missionId','contractRevisionId','contractHash','contractInputHash','contract','sourceBindings','sources','promptVersion','defaultsVersion','defaults','limits'])||v.version!=='planning-input-v1'||!pt(v.missionId)||!pt(v.contractRevisionId)||!ph(v.contractHash)||!ph(v.contractInputHash)||v.promptVersion!==PLANNING_PROMPT_VERSION||v.defaultsVersion!==PLANNING_DEFAULTS_VERSION||!po(v.limits)||!pk(v.limits,Object.keys(PLANNING_LIMITS))||!Object.entries(PLANNING_LIMITS).every(([k,n])=>(v.limits as Record<string,unknown>)[k]===n)||!Array.isArray(v.defaults)||v.defaults.length!==PLANNING_DEFAULTS.length||!v.defaults.every((d,n)=>d===PLANNING_DEFAULTS[n])||!po(v.sourceBindings)||!pk(v.sourceBindings,['missionId','originalIntent','snapshotId','analysisId','packetHash','answers']))return false;
 const b=v.sourceBindings;if(b.missionId!==v.missionId||!pt(b.originalIntent,8000)||!pt(b.snapshotId)||!pt(b.analysisId)||!ph(b.packetHash)||!Array.isArray(b.answers)||b.answers.length>5||!b.answers.every(a=>po(a)&&pk(a,['questionId','text','updatedAt'])&&pt(a.questionId)&&pt(a.text,4000)&&pt(a.updatedAt)))return false;
 if(!Array.isArray(v.sources)||v.sources.length>171||!v.sources.every(s=>po(s)&&pt(s.id,120)&&pt(s.text,131072)&&['ORIGINAL_INTENT','PROJECT_EVIDENCE','CLARIFICATION_ANSWER','ENGINEERING_DEFAULT','USER_EDIT'].includes(String(s.type))&&Object.keys(s).every(k=>['id','type','text','path','startLine','endLine','questionId','question','updatedAt'].includes(k))&&(s.type!=='PROJECT_EVIDENCE'||(pt(s.path,4096)&&Number.isSafeInteger(s.startLine)&&Number(s.startLine)>0&&Number.isSafeInteger(s.endLine)&&Number(s.endLine)>=Number(s.startLine)))&&(s.type!=='CLARIFICATION_ANSWER'||(pt(s.questionId)&&pt(s.question,600)&&pt(s.updatedAt))))||new Set(v.sources.map(s=>s.id)).size!==v.sources.length||!po(v.contract)||!pk(v.contract,['goal','requirements','scope','nonGoals','constraints','assumptions','risks']))return false;
 const available=new Set(v.sources.map(s=>s.id));const item=(s:unknown,id:string)=>po(s)&&pk(s,['id','text','sourceIds'])&&s.id===id&&pt(s.text,700)&&pa(s.sourceIds,6,1,true)&&s.sourceIds.every(r=>available.has(r));
 return item(v.contract.goal,'G1')&&([['requirements','R',20,1],['scope','S',12,1],['nonGoals','NG',15,0],['constraints','C',15,0],['assumptions','A',12,0],['risks','K',12,0]] as const).every(([k,p,max,min])=>Array.isArray((v.contract as Record<string,unknown>)[k])&&((v.contract as Record<string,unknown>)[k] as unknown[]).length>=min&&((v.contract as Record<string,unknown>)[k] as unknown[]).length<=max&&((v.contract as Record<string,unknown>)[k] as unknown[]).every((s,n)=>item(s,p+(n+1))));
}
function planningPayload(v:unknown,input:PlanningInput):v is PlanningPayload{
 if(!po(v)||!pk(v,['plan','evaluationContract'])||!po(v.plan)||!pk(v.plan,['verticalSlices','crossCuttingRequirements','riskHandling'])||!po(v.evaluationContract)||!pk(v.evaluationContract,['claims']))return false;
 const r=new Set(input.contract.requirements.map(i=>i.id)),c=new Set(input.contract.constraints.map(i=>i.id)),k=new Set(input.contract.risks.map(i=>i.id));const refs=(v:unknown,set:Set<string>,min=0)=>pa(v,20,min,true)&&v.every(id=>set.has(id));
 const claims=v.evaluationContract.claims;if(!Array.isArray(claims)||claims.length<1||claims.length>30||!claims.every((e,n)=>po(e)&&pk(e,['id','claim','requirementIds','constraintIds','riskIds','verificationType','requiredEvidence','preconditions','manualRationale','notes'])&&e.id==='E'+(n+1)&&pt(e.claim,700)&&refs(e.requirementIds,r)&&refs(e.constraintIds,c)&&refs(e.riskIds,k)&&VERIFICATION_TYPES.includes(e.verificationType as never)&&pa(e.requiredEvidence,8,1)&&pa(e.preconditions,8)&&pt(e.notes,700,true)&&(e.verificationType==='manual'?pt(e.manualRationale,700)&&e.manualRationale.trim().length>=30:e.manualRationale===null)))return false;
 const es=new Set(claims.map(e=>e.id));const slices=v.plan.verticalSlices,cross=v.plan.crossCuttingRequirements,risks=v.plan.riskHandling;
 return Array.isArray(slices)&&slices.length>=1&&slices.length<=8&&slices.every((s,n)=>po(s)&&pk(s,['id','title','outcome','requirementIds','preconditions','userVisibleFlow','evaluationClaimIds','order'])&&s.id==='S'+(n+1)&&s.order===n+1&&pt(s.title,700)&&pt(s.outcome,700)&&refs(s.requirementIds,r,1)&&pa(s.preconditions,8)&&pa(s.userVisibleFlow,8,2)&&refs(s.evaluationClaimIds,es,1))&&Array.isArray(cross)&&cross.length<=r.size&&new Set(cross.map(s=>s.requirementId)).size===cross.length&&cross.every(s=>po(s)&&pk(s,['requirementId','rationale','evaluationClaimIds'])&&r.has(s.requirementId as string)&&pt(s.rationale,700)&&refs(s.evaluationClaimIds,es,1))&&Array.isArray(risks)&&risks.length===k.size&&new Set(risks.map(s=>s.riskId)).size===k.size&&risks.every(s=>po(s)&&pk(s,['riskId','disposition','evaluationClaimIds','notes'])&&k.has(s.riskId as string)&&['coveredByEvaluation','handledDuringImplementation','requiresHumanAttention','informational'].includes(String(s.disposition))&&refs(s.evaluationClaimIds,es,s.disposition==='coveredByEvaluation'?1:0)&&pt(s.notes,700));
}
function planningCoverage(v:unknown,input:PlanningInput,payload:PlanningPayload):v is PlanningCoverage{
 if(!po(v)||!pk(v,['requirements','constraints'])||!Array.isArray(v.requirements)||!Array.isArray(v.constraints)||v.requirements.length!==input.contract.requirements.length||v.constraints.length!==input.contract.constraints.length)return false;
 const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 return v.requirements.every((r,n)=>{const id=input.contract.requirements[n]!.id;return po(r)&&pk(r,['requirementId','sliceIds','evaluationClaimIds','crossCutting'])&&r.requirementId===id&&equal(r.sliceIds,payload.plan.verticalSlices.filter(s=>s.requirementIds.includes(id)).map(s=>s.id))&&equal(r.evaluationClaimIds,payload.evaluationContract.claims.filter(e=>e.requirementIds.includes(id)).map(e=>e.id))&&r.crossCutting===payload.plan.crossCuttingRequirements.some(c=>c.requirementId===id)&&((r.sliceIds as string[]).length>0||r.crossCutting===true)&&(r.evaluationClaimIds as string[]).length>0;})&&v.constraints.every((c,n)=>{const id=input.contract.constraints[n]!.id;return po(c)&&pk(c,['constraintId','evaluationClaimIds'])&&c.constraintId===id&&equal(c.evaluationClaimIds,payload.evaluationContract.claims.filter(e=>e.constraintIds.includes(id)).map(e=>e.id))&&(c.evaluationClaimIds as string[]).length>0;});
}
const planningEdits=(v:unknown)=>Array.isArray(v)&&v.length<=250&&v.every(e=>po(e)&&pk(e,['targetId','kind','fields'])&&pt(e.targetId)&&e.kind==='USER_EDIT'&&pa(e.fields,20,1,true));
function planningDraft(v:unknown):v is PlanningDraft{
 if(!po(v)||!pk(v,['id','missionId','parentDraftId','origin','status','input','inputHash','payload','coverage','userEdits','promptVersion','toolVersion','elapsedMs','createdAt','completedAt','error'])||!pt(v.id)||!pt(v.missionId)||!(v.parentDraftId===null||pt(v.parentDraftId))||!['CODEX','USER_EDIT','REVISION'].includes(String(v.origin))||!['PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED'].includes(String(v.status))||!planningInput(v.input)||v.input.missionId!==v.missionId||!ph(v.inputHash)||!planningEdits(v.userEdits)||v.promptVersion!==PLANNING_PROMPT_VERSION||!(v.toolVersion===null||pt(v.toolVersion))||!(v.elapsedMs===null||(typeof v.elapsedMs==='number'&&Number.isFinite(v.elapsedMs)&&v.elapsedMs>=0))||!pt(v.createdAt)||!(v.completedAt===null||pt(v.completedAt))||!(v.error===null||pt(v.error,1000)))return false;
 if(v.payload===null)return v.coverage===null&&v.status!=='SUCCEEDED';
 return planningPayload(v.payload,v.input)&&planningCoverage(v.coverage,v.input,v.payload)&&(v.status!=='SUCCEEDED'||v.completedAt!==null);
}
export function isPlanningPair(v:unknown):v is PlanningPair {
 if(!po(v)||!pk(v,['plan','evaluation','input'])||!planningInput(v.input)||!po(v.plan)||!po(v.evaluation))return false;
 const p=v.plan,e=v.evaluation;
 if(!pk(p,['id','pairId','missionId','revision','draftId','contractRevisionId','inputHash','payload','coverage','userEdits','planHash','canonical','acceptedAt'])||!pk(e,['id','pairId','missionId','revision','draftId','contractRevisionId','inputHash','payload','evaluationHash','canonical','acceptedAt']))return false;
 for(const row of [p,e])if(!['id','pairId','missionId','draftId','contractRevisionId','acceptedAt'].every(k=>pt(row[k]))||!Number.isSafeInteger(row.revision)||Number(row.revision)<1||!ph(row.inputHash)||!pt(row.canonical,PLANNING_LIMITS.canonicalBytes)||row.missionId!==v.input.missionId||row.contractRevisionId!==v.input.contractRevisionId)return false;
 if(!['pairId','missionId','revision','draftId','contractRevisionId','inputHash','acceptedAt'].every(k=>p[k]===e[k])||!ph(p.planHash)||!ph(e.evaluationHash)||!planningEdits(p.userEdits))return false;
 const payload={plan:p.payload,evaluationContract:e.payload};return planningPayload(payload,v.input)&&planningCoverage(p.coverage,v.input,payload);
}
export function isPlanningView(v:unknown):v is PlanningView {
 if(!po(v)||!pk(v,['draft','operation','accepted','history','current','draftStale','acceptedStale','eligible','phase'])||!['DRAFT','NEEDS_CLARIFICATION','CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY'].includes(String(v.phase))||!['current','draftStale','acceptedStale','eligible'].every(k=>typeof v[k]==='boolean')||!(v.draft===null||planningDraft(v.draft))||!(v.operation===null||planningDraft(v.operation))||!(v.accepted===null||isPlanningPair(v.accepted))||!Array.isArray(v.history)||v.history.length>10000||!v.history.every(h=>po(h)&&pk(h,['pairId','revision','planHash','evaluationHash','acceptedAt'])&&pt(h.pairId)&&Number.isSafeInteger(h.revision)&&Number(h.revision)>0&&ph(h.planHash)&&ph(h.evaluationHash)&&pt(h.acceptedAt)))return false;
 if(v.current&&(v.accepted===null||v.acceptedStale))return false;
 if(v.phase==='PLAN_READY'&&!v.current)return false;
 if(v.phase==='PLAN_REVIEW'&&(v.draft===null||(v.draft as PlanningDraft).status!=='SUCCEEDED'||v.draftStale))return false;
 return true;
}
export function isAttentionResponse(v:unknown):v is AttentionResponse{
 if(!po(v)||!pk(v,['items','count'])||!Array.isArray(v.items)||v.count!==v.items.length)return false;
 return v.items.every(i=>{if(!po(i))return false;if(i.kind!=='plan_review')return isContractAttentionResponse({items:[i],count:1});return pk(i,['kind','draftId','missionId','projectId','projectName','originalIntent','slices','claims'])&&pt(i.draftId)&&pt(i.missionId)&&pt(i.projectId)&&pt(i.projectName,120)&&pt(i.originalIntent,8000)&&Number.isSafeInteger(i.slices)&&Number(i.slices)>=1&&Number(i.slices)<=8&&Number.isSafeInteger(i.claims)&&Number(i.claims)>=1&&Number(i.claims)<=30;});
}
