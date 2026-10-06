import {PLANNING_LIMITS,VERIFICATION_TYPES,type PlanningInput,type PlanningPayload,type PlanningCoverage,type EvaluationClaim,type VerticalSlice} from '../../packages/shared/planning.ts';
import {canonicalContractJson} from './contract-store.ts';
import {PlanningError} from './planning-errors.ts';
const fail=(code='INVALID_PLANNING_OUTPUT',message='The planning draft failed structural or provenance validation.'):never=>{throw new PlanningError(code,message);};
const unsupported=():never=>fail('UNSUPPORTED_PLANNING_CLAIM','The planning draft expands accepted scope or prescribes unsupported implementation mechanics.');
const coverageError=(id:string):never=>fail('PLANNING_COVERAGE_INVALID',`Requirement ${id} has no complete plan/evaluation coverage.`);
function object(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))return fail();const r=v as Record<string,unknown>;if(Object.keys(r).length!==keys.length||!keys.every(k=>Object.hasOwn(r,k)))return fail();return r;}
function text(v:unknown,empty=false):string {if(typeof v!=='string'||(!empty&&!v.trim())||v.length>PLANNING_LIMITS.text||/[\uD800-\uDFFF]/u.test(v)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))return fail();return v;}
function texts(v:unknown,max:number,min=0):string[]{if(!Array.isArray(v)||v.length<min||v.length>max)return fail();return v.map(t=>text(t));}
function refs(v:unknown,available:Set<string>,min=0):string[]{const values=texts(v,PLANNING_LIMITS.references,min);if(new Set(values).size!==values.length||values.some(id=>!available.has(id)))return fail();return values;}
const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const negative=(s:string)=>/\b(?:no|not|never|without|exclude[ds]?|non-goals?|out of scope|cannot|can't|denied|reject(?:ed|ion)?)\b/i.test(s);
const clauses=(s:string)=>s.split(/[.\n;]/);
const numericTargets=(s:string)=>Array.from(s.matchAll(/\b(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|rps|requests per second|%|users?|records?|requests?)(?:\b|(?<=%))/gi),m=>Number(m[1])+':'+(m[2]!.toLowerCase().startsWith('millisecond')?'ms':m[2]!.toLowerCase().startsWith('second')?'s':m[2]!.toLowerCase()==='requests per second'?'rps':m[2]!.toLowerCase()));
const performanceBehavior=(s:string)=>/\b(?:performance|latency|throughput|rps|requests per second|response time|under load|faster|p95|p99)\b/i.test(s);
export function checkPlanningMetrics(input:PlanningInput):void{
 for(const r of input.contract.requirements){if(performanceBehavior(r.text)&&(!numericTargets(r.text).length||(/\b(?:latency|response time)\b/i.test(r.text)&&!numericTargets(r.text).some(t=>/:m?s$/.test(t)))))fail('PLANNING_METRIC_REQUIRED',`Requirement ${r.id} needs an accepted measurable performance target before planning.`);}
}
// Named, finite safeguards are conservative screening; human review still decides semantic quality.
function semantics(s:string,input:PlanningInput):void {
 const accepted=[input.contract.goal,...input.contract.requirements,...input.contract.scope,...input.contract.constraints];
 const authorizes=(phrase:string)=>accepted.some(i=>clauses(i.text).some(c=>!negative(c)&&normalized(c).includes(normalized(phrase))));
 for(const pattern of [/\b(?:redis|postgres(?:ql)?|mongodb|sqlite|kafka|rabbitmq|playwright|selenium|distributed locks?)\b/gi,/\b(?:create|add|introduce)\s+(?:[A-Za-z_][\w]*\s+){0,3}(?:class|table|schema|index|repository)\b[^.\n]*/gi,/\b(?:create|add|introduce)\s+[A-Z][A-Za-z]*(?:Repository|Controller|Service)\b/g,/\b(?:modify|edit|change|create|add)\s+[\w./-]+\.(?:ts|js|tsx|jsx|py|go|rs|sql)\b/gi,/\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:test|build|check)\b/gi,/\b(?:pytest|cargo test|go test)\b/gi])for(const match of s.matchAll(pattern))if(!authorizes(match[0]))unsupported();
 const suppliedTargets=new Set(accepted.flatMap(i=>numericTargets(i.text)));
 if(numericTargets(s).some(t=>!suppliedTargets.has(t)))unsupported();
 for(const ng of input.contract.nonGoals){
  const topics=Array.from(ng.text.matchAll(/\b(?:ios|android|mobile|slack|session-wide permissions?|production deployment|billing|email notifications?)\b/gi),m=>normalized(m[0]));
  const core=normalized(ng.text).replace(/^(?:do not|no|never|exclude|excluded|out of scope|non goal)\s+/,'').replace(/\b(?:add|include|introduce|implement|support|allow|enable|any|a|the)\b/g,' ').replace(/\s+/g,' ').trim();
  if(core.split(' ').length>=2)topics.push(core);
  for(const clause of clauses(s))if(!negative(clause)&&topics.some(t=>normalized(clause).includes(t)))unsupported();
 }
}
function meaningful(s:string,minWords=3):boolean{return normalized(s).split(' ').length>=minWords&&!/^(?:works?|security(?: architecture)? (?:is )?correct|tests? pass(?:es)?|correct|good|as expected)[.! ]*$/i.test(s.trim());}
export function validatePlanningPayload(output:unknown,input:PlanningInput):{payload:PlanningPayload;coverage:PlanningCoverage}{
 checkPlanningMetrics(input);
 let value=output;if(typeof value==='string'){if(Buffer.byteLength(value)>PLANNING_LIMITS.payloadBytes)return fail();try{value=JSON.parse(value);}catch{return fail();}}
 try{if(Buffer.byteLength(canonicalContractJson(value))>PLANNING_LIMITS.payloadBytes)return fail();}catch{return fail();}
 const root=object(value,['plan','evaluationContract']),plan=object(root.plan,['verticalSlices','crossCuttingRequirements','riskHandling']),evaluation=object(root.evaluationContract,['claims']);
 const rIds=new Set(input.contract.requirements.map(i=>i.id)),cIds=new Set(input.contract.constraints.map(i=>i.id)),kIds=new Set(input.contract.risks.map(i=>i.id));
 if(!Array.isArray(evaluation.claims)||evaluation.claims.length<1||evaluation.claims.length>PLANNING_LIMITS.claims)return fail();
 const claims:EvaluationClaim[]=evaluation.claims.map((v,n)=>{const row=object(v,['id','claim','requirementIds','constraintIds','riskIds','verificationType','requiredEvidence','preconditions','manualRationale','notes']);if(row.id!=='E'+(n+1)||!VERIFICATION_TYPES.includes(row.verificationType as never))return fail();const claim:EvaluationClaim={id:String(row.id),claim:text(row.claim),requirementIds:refs(row.requirementIds,rIds),constraintIds:refs(row.constraintIds,cIds),riskIds:refs(row.riskIds,kIds),verificationType:row.verificationType as EvaluationClaim['verificationType'],requiredEvidence:texts(row.requiredEvidence,8,1),preconditions:texts(row.preconditions,8),manualRationale:row.manualRationale===null?null:text(row.manualRationale),notes:text(row.notes,true)};
  if(!claim.requirementIds.length&&!claim.constraintIds.length&&!claim.riskIds.length)return fail();
  if(!meaningful(claim.claim)||claim.requiredEvidence.some(e=>!meaningful(e)))return fail('UNOBSERVABLE_PLANNING_CLAIM','Evaluation claims must name observable evidence.');
  if(claim.verificationType==='manual'){if(!claim.manualRationale||claim.manualRationale.trim().length<30||!meaningful(claim.manualRationale)||!/(?:subjective|visual|accessibility|human judg(?:e)?ment|deterministic|automated|cannot|unable|not reasonably|not practical|requires human)/i.test(claim.manualRationale))return fail();}else if(claim.manualRationale!==null)return fail();
  const bound=[...input.contract.requirements,...input.contract.constraints].filter(i=>[...claim.requirementIds,...claim.constraintIds].includes(i.id));
  const content=[claim.claim,...claim.requiredEvidence,...claim.preconditions,claim.notes,claim.manualRationale??''].join('\n');
  semantics(content,input);
  if(claim.verificationType==='browser'){
   const ui=/\b(?:browser|web (?:app|page|ui)|user interface|ui|screen|confirmation (?:dialog|modal))\b/i;
   if(!bound.some(i=>ui.test(i.text))||!input.sources.filter(s=>s.type!=='ENGINEERING_DEFAULT'&&s.type!=='USER_EDIT').some(s=>/\b(?:browser|web|html|react|frontend)\b/i.test(s.text)))unsupported();
  }
  const suppliedTargets=new Set(bound.flatMap(i=>numericTargets(i.text)));
  if(numericTargets(content).some(t=>!suppliedTargets.has(t)))unsupported();
  if(claim.verificationType==='performance'||performanceBehavior(content)||bound.some(i=>performanceBehavior(i.text))){
   const supplied=new Set(bound.flatMap(i=>numericTargets(i.text))),targets=numericTargets(content);
   if(!targets.length||targets.some(t=>!supplied.has(t)))unsupported();
   // Every number in performance evidence must be supplied by the cited accepted behavior.
   const suppliedNumbers=new Set(bound.flatMap(i=>Array.from(i.text.matchAll(/\b\d+(?:\.\d+)?\b/g),m=>m[0])));
   if(Array.from(content.matchAll(/\b\d+(?:\.\d+)?\b/g),m=>m[0]).some(n=>!suppliedNumbers.has(n)))unsupported();
   if(bound.some(i=>performanceBehavior(i.text))&&[...supplied].some(t=>!targets.includes(t)))unsupported();
  }
  return claim;
 });
 const eIds=new Set(claims.map(e=>e.id));
 for(const requirementId of rIds)if(!claims.some(claim=>claim.requirementIds.includes(requirementId)))coverageError(requirementId);
 if(!Array.isArray(plan.verticalSlices)||plan.verticalSlices.length<1||plan.verticalSlices.length>PLANNING_LIMITS.slices)return fail();
 const verticalSlices:VerticalSlice[]=plan.verticalSlices.map((v,n)=>{const row=object(v,['id','title','outcome','requirementIds','preconditions','userVisibleFlow','evaluationClaimIds','order']);if(row.id!=='S'+(n+1)||row.order!==n+1)return fail();const slice:VerticalSlice={id:String(row.id),title:text(row.title),outcome:text(row.outcome),requirementIds:refs(row.requirementIds,rIds,1),preconditions:texts(row.preconditions,8),userVisibleFlow:texts(row.userVisibleFlow,PLANNING_LIMITS.flowSteps,2),evaluationClaimIds:refs(row.evaluationClaimIds,eIds,1),order:n+1};
  if(/^(?:(?:phase|layer|build|implement|create|add)\s*\d*\s*[-—:]?\s*)?(?:database|backend|frontend|tests?|ui|database schema|backend api)(?:\s+(?:layer|schema|phase|work|setup))?$/i.test(slice.title.trim())||!meaningful(slice.outcome)||slice.userVisibleFlow.some(s=>!meaningful(s,2)))return fail('NON_VERTICAL_PLAN','Each slice must describe a meaningful end-to-end observable behavior.');
  semantics([slice.title,slice.outcome,...slice.userVisibleFlow,...slice.preconditions].join('\n'),input);
  const linked=claims.filter(e=>slice.evaluationClaimIds.includes(e.id));
  if(linked.some(e=>!e.requirementIds.some(r=>slice.requirementIds.includes(r)))||slice.requirementIds.some(r=>!linked.some(e=>e.requirementIds.includes(r))))return fail('PLANNING_COVERAGE_INVALID',`Slice ${slice.id} lacks evaluation claims for its covered requirements.`);
  return slice;
 });
 if(!Array.isArray(plan.crossCuttingRequirements)||plan.crossCuttingRequirements.length>rIds.size||!Array.isArray(plan.riskHandling)||plan.riskHandling.length!==kIds.size)return fail();
 const crossCuttingRequirements=plan.crossCuttingRequirements.map(v=>{const row=object(v,['requirementId','rationale','evaluationClaimIds']);if(typeof row.requirementId!=='string'||!rIds.has(row.requirementId))return fail();const rationale=text(row.rationale);if(!meaningful(rationale))return fail();semantics(rationale,input);const evaluationClaimIds=refs(row.evaluationClaimIds,eIds,1);if(evaluationClaimIds.some(id=>!claims.find(e=>e.id===id)!.requirementIds.includes(String(row.requirementId))))return fail();return {requirementId:row.requirementId,rationale,evaluationClaimIds};});
 if(new Set(crossCuttingRequirements.map(c=>c.requirementId)).size!==crossCuttingRequirements.length)return fail();
 const riskHandling=plan.riskHandling.map(v=>{const row=object(v,['riskId','disposition','evaluationClaimIds','notes']);if(typeof row.riskId!=='string'||!kIds.has(row.riskId)||!['coveredByEvaluation','handledDuringImplementation','requiresHumanAttention','informational'].includes(String(row.disposition)))return fail();const evaluationClaimIds=refs(row.evaluationClaimIds,eIds),notes=text(row.notes);semantics(notes,input);if(row.disposition==='coveredByEvaluation'){if(!evaluationClaimIds.length||evaluationClaimIds.some(id=>!claims.find(e=>e.id===id)!.riskIds.includes(String(row.riskId))))return fail();}else if(evaluationClaimIds.length)return fail();return {riskId:row.riskId,disposition:row.disposition as PlanningPayload['plan']['riskHandling'][number]['disposition'],evaluationClaimIds,notes};});
 if(new Set(riskHandling.map(k=>k.riskId)).size!==kIds.size)return fail();
 const requirements=[...rIds].map(requirementId=>{const sliceIds=verticalSlices.filter(s=>s.requirementIds.includes(requirementId)).map(s=>s.id),evaluationClaimIds=claims.filter(e=>e.requirementIds.includes(requirementId)).map(e=>e.id),crossCutting=crossCuttingRequirements.some(c=>c.requirementId===requirementId);if((!sliceIds.length&&!crossCutting)||!evaluationClaimIds.length)return coverageError(requirementId);return {requirementId,sliceIds,evaluationClaimIds,crossCutting};});
 const constraints=[...cIds].map(constraintId=>{const evaluationClaimIds=claims.filter(e=>e.constraintIds.includes(constraintId)).map(e=>e.id);if(!evaluationClaimIds.length)return fail('PLANNING_COVERAGE_INVALID',`Constraint ${constraintId} has no evaluation coverage.`);return {constraintId,evaluationClaimIds};});
 return {payload:{plan:{verticalSlices,crossCuttingRequirements,riskHandling},evaluationContract:{claims}},coverage:{requirements,constraints}};
}
const stringSchema={type:'string',minLength:1,maxLength:PLANNING_LIMITS.text};
const textArray=(min=0,max=8)=>({type:'array',minItems:min,maxItems:max,items:stringSchema});
// Installed strict structured output rejects uniqueItems; refs() still enforces uniqueness server-side.
const refArray=(min=0)=>({type:'array',minItems:min,maxItems:PLANNING_LIMITS.references,items:{type:'string',minLength:2,maxLength:6}});
const objectSchema=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
export const PLANNING_OUTPUT_SCHEMA=objectSchema({plan:objectSchema({verticalSlices:{type:'array',minItems:1,maxItems:8,items:objectSchema({id:{type:'string',pattern:'^S[1-8]$'},title:stringSchema,outcome:stringSchema,requirementIds:refArray(1),preconditions:textArray(),userVisibleFlow:textArray(2),evaluationClaimIds:refArray(1),order:{type:'integer',minimum:1,maximum:8}})},crossCuttingRequirements:{type:'array',maxItems:20,items:objectSchema({requirementId:stringSchema,rationale:stringSchema,evaluationClaimIds:refArray(1)})},riskHandling:{type:'array',maxItems:12,items:objectSchema({riskId:stringSchema,disposition:{type:'string',enum:['coveredByEvaluation','handledDuringImplementation','requiresHumanAttention','informational']},evaluationClaimIds:refArray(),notes:stringSchema})}}),evaluationContract:objectSchema({claims:{type:'array',minItems:1,maxItems:30,items:objectSchema({id:{type:'string',pattern:'^E(?:[1-9]|[12][0-9]|30)$'},claim:stringSchema,requirementIds:refArray(),constraintIds:refArray(),riskIds:refArray(),verificationType:{type:'string',enum:VERIFICATION_TYPES},requiredEvidence:textArray(1),preconditions:textArray(),manualRationale:{anyOf:[stringSchema,{type:'null'}]},notes:{type:'string',maxLength:PLANNING_LIMITS.text}})}})});
