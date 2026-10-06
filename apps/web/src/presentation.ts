import type {ContractView} from '../../../packages/shared/contracts.ts';
import type {AnalysisView} from '../../../packages/shared/analysis.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
export type ContextFact='loading'|'failed'|'absent'|'captured';
export type Station={label:string;station:string;status:string;state:'recorded'|'captured'|'current'|'unknown'|'locked'|'attention'|'failed'};
export const NEEDS_YOU_EMPTY='Nothing needs your attention.';
export function journey(context:ContextFact,mission:Mission|null,clarification?:AnalysisView|null,contract?:ContractView|null):Station[]{
 return [{label:'Intent',station:'INTAKE',status:mission?'Intent recorded':'No intent recorded',state:mission?'recorded':'unknown'},
 {label:'Context',station:'UNDERSTAND',status:!mission?'Mission required':context==='captured'?'Context captured':context==='absent'?'Not captured':context==='loading'?'Loading context':'Context unavailable',state:!mission?'unknown':context==='captured'?'captured':context==='absent'?'current':'unknown'},
 ...(clarification===undefined?[{label:'Clarify',station:'CLARIFY',status:'Not available yet',state:'locked' as const}]:[clarifyStation(context,clarification)]),
 ...(contract===undefined?[{label:'Define',station:'DEFINE',status:'Not available yet',state:'locked' as const}]:[defineStation(contract)]),
 ...['Build','Verify','Proof'].map(label=>({label,station:label.toUpperCase(),status:'Not available yet',state:'locked' as const}))];
}
export function intentPreview(intent:string):string {const paragraph=intent.trim().split(/\n\s*\n/,1)[0]??'';const text=paragraph.replace(/\s+/g,' ').trim();return text.length>180?text.slice(0,179)+'…':text;}
export function recentMission(missions:readonly Mission[],viewedId:string|null):{mission:Mission;kind:'viewed'|'recorded'}|null{
 const viewed=missions.find(m=>m.id===viewedId);if(viewed)return {mission:viewed,kind:'viewed'};
 const first=[...missions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))[0];return first?{mission:first,kind:'recorded'}:null;
}

function clarifyStation(context:ContextFact,data:AnalysisView|null):Station{const base={label:'Clarify',station:'CLARIFY'};if(!data)return {...base,status:'Analysis unavailable',state:'unknown'};if(data.operation?.status==='PREPARING')return {...base,status:'Preparing evidence',state:'current'};if(data.operation?.status==='RUNNING')return {...base,status:'ANALYZING',state:'current'};if(data.operation?.status==='FAILED'||data.operation?.status==='INTERRUPTED')return {...base,status:data.operation.status,state:'failed'};const unanswered=data.questions.filter(q=>!q.answer).length;if(unanswered)return {...base,status:'NEEDS YOU · '+unanswered,state:'attention'};if(['CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY'].includes(data.phase)&&data.analysis)return {...base,status:data.stale?'CLARIFIED · older context':'CLARIFIED',state:'captured'};return {...base,status:context==='captured'?'Analysis available':'Context required',state:context==='captured'?'current':'unknown'};}

function defineStation(data:ContractView|null):Station{
 const base={label:'Define',station:'DEFINE'};
 if(!data)return {...base,status:'Contract unavailable',state:'unknown'};
 if(data.operation?.status==='PREPARING')return {...base,status:'Preparing contract',state:'current'};
 if(data.operation?.status==='RUNNING')return {...base,status:'DRAFTING',state:'current'};
 if(data.draftStale&&(!data.accepted||data.draft?.id!==data.accepted.draftId))return {...base,status:'Draft stale',state:'attention'};
 if(data.phase==='CONTRACT_REVIEW'&&data.draft)return {...base,status:'REVIEW',state:'attention'};
 if(data.accepted&&data.current&&data.phase==='CONTRACT_READY')return {...base,status:'CONTRACT READY',state:'captured'};
 if(data.acceptedStale)return {...base,status:'Contract historical',state:'attention'};
 if(data.operation?.status==='FAILED'||data.operation?.status==='INTERRUPTED')return {...base,status:data.operation.status,state:'failed'};
 return {...base,status:data.eligible?'Ready to draft':'Clarification required',state:data.eligible?'current':'unknown'};
}
