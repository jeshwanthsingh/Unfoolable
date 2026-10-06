import type {Mission} from '../../../packages/shared/missions.ts';
export type ContextFact='loading'|'failed'|'absent'|'captured';
export type Station={label:string;station:string;status:string;state:'recorded'|'captured'|'current'|'unknown'|'locked'};
export const NEEDS_YOU_EMPTY='Nothing needs your attention.';
export function journey(context:ContextFact,mission:Mission|null):Station[]{
 return [{label:'Intent',station:'INTAKE',status:mission?'Intent recorded':'No intent recorded',state:mission?'recorded':'unknown'},
 {label:'Context',station:'UNDERSTAND',status:!mission?'Mission required':context==='captured'?'Context captured':context==='absent'?'Not captured':context==='loading'?'Loading context':'Context unavailable',state:!mission?'unknown':context==='captured'?'captured':context==='absent'?'current':'unknown'},
 ...['Clarify','Define','Build','Verify','Proof'].map(label=>({label,station:label.toUpperCase(),status:'Not available yet',state:'locked' as const}))];
}
export function intentPreview(intent:string):string {const paragraph=intent.trim().split(/\n\s*\n/,1)[0]??'';const text=paragraph.replace(/\s+/g,' ').trim();return text.length>180?text.slice(0,179)+'…':text;}
export function recentMission(missions:readonly Mission[],viewedId:string|null):{mission:Mission;kind:'viewed'|'recorded'}|null{
 const viewed=missions.find(m=>m.id===viewedId);if(viewed)return {mission:viewed,kind:'viewed'};
 const first=[...missions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))[0];return first?{mission:first,kind:'recorded'}:null;
}
