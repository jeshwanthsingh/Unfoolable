import type {BuildView,BuildEvent} from '../../../packages/shared/build.ts';
import type {PlanningView} from '../../../packages/shared/planning.ts';
import type {ContractView} from '../../../packages/shared/contracts.ts';
import type {AnalysisView} from '../../../packages/shared/analysis.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
export type ContextFact='loading'|'failed'|'absent'|'captured';
export type Station={label:string;station:string;status:string;state:'recorded'|'captured'|'current'|'unknown'|'locked'|'attention'|'failed'};
export const NEEDS_YOU_EMPTY='Nothing needs your attention.';
export function journey(context:ContextFact,mission:Mission|null,clarification?:AnalysisView|null,contract?:ContractView|null,planning?:PlanningView|null,build?:BuildView|null):Station[]{
 return [{label:'Intent',station:'INTAKE',status:mission?'Intent recorded':'No intent recorded',state:mission?'recorded':'unknown'},
 {label:'Context',station:'UNDERSTAND',status:!mission?'Mission required':context==='captured'?'Context captured':context==='absent'?'Not captured':context==='loading'?'Loading context':'Context unavailable',state:!mission?'unknown':context==='captured'?'captured':context==='absent'?'current':'unknown'},
 ...(clarification===undefined?[{label:'Clarify',station:'CLARIFY',status:'Not available yet',state:'locked' as const}]:[clarifyStation(context,clarification)]),
 ...(contract===undefined?[{label:'Define',station:'DEFINE',status:'Not available yet',state:'locked' as const}]:[defineStation(contract)]),
 ...(planning===undefined?['Build','Verify','Proof'].map(label=>({label,station:label.toUpperCase(),status:'Not available yet',state:'locked' as const})):[build===null?{label:'Build',station:'BUILD',status:'Build unavailable',state:'unknown' as const}:build&&(build.attempt||build.eligible)?executionStation(build):buildStation(planning),...['Verify','Proof'].map(label=>({label,station:label.toUpperCase(),status:label==='Verify'&&build?.candidate?'AWAITING · not executed':'Execution unavailable',state:'locked' as const}))])];
}
export function intentPreview(intent:string):string {const paragraph=intent.trim().split(/\n\s*\n/,1)[0]??'';const text=paragraph.replace(/\s+/g,' ').trim();return text.length>180?text.slice(0,179)+'…':text;}
export function recentMission(missions:readonly Mission[],viewedId:string|null):{mission:Mission;kind:'viewed'|'recorded'}|null{
 const viewed=missions.find(m=>m.id===viewedId);if(viewed)return {mission:viewed,kind:'viewed'};
 const first=[...missions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))[0];return first?{mission:first,kind:'recorded'}:null;
}

function clarifyStation(context:ContextFact,data:AnalysisView|null):Station{const base={label:'Clarify',station:'CLARIFY'};if(!data)return {...base,status:'Analysis unavailable',state:'unknown'};if(data.operation?.status==='PREPARING')return {...base,status:'Preparing evidence',state:'current'};if(data.operation?.status==='RUNNING')return {...base,status:'ANALYZING',state:'current'};if(data.operation?.status==='FAILED'||data.operation?.status==='INTERRUPTED')return {...base,status:data.operation.status,state:'failed'};const unanswered=data.questions.filter(q=>!q.answer).length;if(unanswered)return {...base,status:'NEEDS YOU · '+unanswered,state:'attention'};if(['CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(data.phase)&&data.analysis)return {...base,status:data.stale?'CLARIFIED · older context':'CLARIFIED',state:'captured'};return {...base,status:context==='captured'?'Analysis available':'Context required',state:context==='captured'?'current':'unknown'};}

function defineStation(data:ContractView|null):Station{
 const base={label:'Define',station:'DEFINE'};
 if(!data)return {...base,status:'Contract unavailable',state:'unknown'};
 if(data.operation?.status==='PREPARING')return {...base,status:'Preparing contract',state:'current'};
 if(data.operation?.status==='RUNNING')return {...base,status:'DRAFTING',state:'current'};
 if(data.draftStale&&(!data.accepted||data.draft?.id!==data.accepted.draftId))return {...base,status:'Draft stale',state:'attention'};
 if(data.phase==='CONTRACT_REVIEW'&&data.draft)return {...base,status:'REVIEW',state:'attention'};
 if(data.accepted&&data.current&&['CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(data.phase))return {...base,status:'CONTRACT READY',state:'captured'};
 if(data.acceptedStale)return {...base,status:'Contract historical',state:'attention'};
 if(data.acceptedStale)return {...base,status:'PLAN HISTORICAL',state:'attention'};
 if(data.operation?.status==='FAILED'||data.operation?.status==='INTERRUPTED')return {...base,status:data.operation.status,state:'failed'};
 return {...base,status:data.eligible?'Ready to draft':'Clarification required',state:data.eligible?'current':'unknown'};
}

function buildStation(data:PlanningView|null):Station {
 const base={label:'Build',station:'BUILD'};
 if(!data)return {...base,status:'Planning unavailable',state:'unknown'};
 if(data.operation?.status==='RUNNING')return {...base,status:'DRAFTING PLAN',state:'current'};
 if(data.operation?.status==='PREPARING')return {...base,status:'PREPARING PLAN',state:'current'};
 if(data.draftStale)return {...base,status:'PLAN HISTORICAL',state:'attention'};
 if(data.phase==='PLAN_REVIEW'&&data.draft)return {...base,status:'PLAN REVIEW',state:'attention'};
 if(data.phase==='PLAN_READY'&&data.current&&data.accepted)return {...base,status:'PLAN READY',state:'current'};
 if(data.acceptedStale)return {...base,status:'PLAN HISTORICAL',state:'attention'};
 if(data.operation?.status==='FAILED'||data.operation?.status==='INTERRUPTED')return {...base,status:data.operation.status,state:'failed'};
 return {...base,status:data.eligible?'READY TO PLAN':'CONTRACT REQUIRED',state:data.eligible?'current':'locked'};
}

export function buildActive(view:BuildView):boolean{return !!view.attempt&&['CREATED','STARTING','RUNNING','FINALIZING'].includes(view.attempt.status);}
export function executionStation(view:BuildView):Station{
 const base={label:'Build',station:'BUILD'};
 if(view.candidate&&view.current)return {...base,status:'CANDIDATE READY',state:'captured'};
 if(buildActive(view))return {...base,status:view.attempt!.status==='FINALIZING'?'FREEZING CANDIDATE':'BUILDING',state:'current'};
 if(view.attempt&&['FAILED','INTERRUPTED','RECONCILE_REQUIRED'].includes(view.attempt.status))return {...base,status:view.attempt.status.replaceAll('_',' '),state:'failed'};
 return {...base,status:view.eligible?'PLAN READY · select a slice':'CURRENT PLAN REQUIRED',state:view.eligible?'current':'locked'};
}
export function mergeBuildView(previous:BuildView|null,next:BuildView):BuildView{
 const attempt=next.attempt;
 const prior=previous&&previous.attempt?.id===attempt?.id?previous.events:[];
 const events=new Map<number,BuildEvent>();
 for(const event of [...prior,...next.events])if(attempt&&event.attemptId===attempt.id&&event.generation===attempt.generation)events.set(event.sequence,event);
 return {...next,events:[...events.values()].sort((a,b)=>a.sequence-b.sequence).slice(-1000),eventsTruncated:next.eventsTruncated||events.size>1000||(previous?.attempt?.id===attempt?.id&&previous?.eventsTruncated===true)};
}
export function activityLabel(event:BuildEvent):string{
 const labels:Record<string,string>={'attempt.created':'Attempt created','builder.started':'Codex builder started','turn.started':'Builder turn started','tool.started':'Tool started','tool.completed':'Tool completed','builder.completed':'Builder completed','candidate.captured':'Candidate captured','attempt.failed':'Attempt failed','attempt.interrupted':'Attempt interrupted'};
 return labels[event.kind]??event.kind.replaceAll('.',' · ').replaceAll('_',' ');
}
