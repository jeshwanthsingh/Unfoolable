import type {VerificationView,VerificationRun} from '../../../packages/shared/verification.ts';
import type {BuildView,BuildEvent} from '../../../packages/shared/build.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
export type ContextFact='loading'|'failed'|'absent'|'captured';
export type Station={label:string;station:string;status:string;state:'recorded'|'captured'|'current'|'unknown'|'locked'|'attention'|'failed'};
export const NEEDS_YOU_EMPTY='Nothing needs your attention.';
export function intentPreview(intent:string):string {const paragraph=intent.trim().split(/\n\s*\n/,1)[0]??'';const text=paragraph.replace(/\s+/g,' ').trim();return text.length>180?text.slice(0,179)+'…':text;}
export function recentMission(missions:readonly Mission[],viewedId:string|null):{mission:Mission;kind:'viewed'|'recorded'}|null{
 const viewed=missions.find(m=>m.id===viewedId);if(viewed)return {mission:viewed,kind:'viewed'};
 const first=[...missions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))[0];return first?{mission:first,kind:'recorded'}:null;
}

export function buildActive(view:BuildView):boolean{return !!view.attempt&&['CREATED','STARTING','RUNNING','FINALIZING','CANCELLING'].includes(view.attempt.status);}
export function executionStation(view:BuildView):Station{
 const base={label:'Build',station:'BUILD'};
 if(view.candidate&&view.current)return {...base,status:'CANDIDATE READY',state:'captured'};
 if(view.attempt?.status==='CANCELLING')return {...base,status:'CANCELLING',state:'attention'};
 if(view.attempt?.status==='RUNNING'&&view.permissions?.some(p=>p.status==='PENDING'&&p.attemptId===view.attempt!.id&&p.generation===view.attempt!.generation))return {...base,status:'WAITING FOR YOU',state:'attention'};
 if(buildActive(view))return {...base,status:view.attempt!.status==='FINALIZING'?'FREEZING CANDIDATE':'BUILDING',state:'current'};
 if(view.attempt&&['FAILED','INTERRUPTED','RECONCILE_REQUIRED'].includes(view.attempt.status))return {...base,status:view.attempt.status.replaceAll('_',' '),state:'failed'};
 return {...base,status:view.eligible?'Awaiting automatic build':'Approved Spec required',state:view.eligible?'current':'locked'};
}
export function mergeBuildView(previous:BuildView|null,next:BuildView):BuildView{
 const attempt=next.attempt;
 const prior=previous&&previous.attempt?.id===attempt?.id?previous.events:[];
 const events=new Map<number,BuildEvent>();
 for(const event of [...prior,...next.events])if(attempt&&event.attemptId===attempt.id&&event.generation===attempt.generation)events.set(event.sequence,event);
 return {...next,events:[...events.values()].sort((a,b)=>a.sequence-b.sequence).slice(-1000),eventsTruncated:next.eventsTruncated||events.size>1000||(previous?.attempt?.id===attempt?.id&&previous?.eventsTruncated===true)};
}
export function activityLabel(event:BuildEvent):string{
 const labels:Record<string,string>={'attempt.created':'Attempt created','builder.started':'Codex builder started','turn.started':'Builder turn started','tool.started':'Tool started','tool.completed':'Tool completed','builder.completed':'Builder completed','candidate.captured':'Candidate captured','attempt.failed':'Attempt failed','attempt.interrupted':'Attempt interrupted','permission.requested':'Filesystem permission requested','permission.decided':'Permission decision recorded','permission.transport_written':'Permission response written','permission.resolved':'Provider permission resolved','attempt.cancel_requested':'Cancellation requested','attempt.cancelling':'Owned execution cleanup in progress','attempt.reconcile_required':'Reconciliation required','attempt.retry_created':'Fresh attempt created'};
 return labels[event.kind]??event.kind.replaceAll('.',' · ').replaceAll('_',' ');
}

export function verificationActive(run:VerificationRun|undefined):boolean{return !!run&&['CREATED','PREPARING','RUNNING'].includes(run.status);}
export function verificationStation(view:VerificationView|null):Station {
 const base={label:'Verify',station:'VERIFY'};
 if(!view)return {...base,status:'Verification unavailable',state:'unknown'};
 const run=view.runs[0];
 if(!run)return {...base,status:view.eligible?'AWAITING · not executed':'Verification locked',state:view.eligible?'current':'locked'};
 if(!view.current)return {...base,status:'HISTORICAL · '+run.status,state:'attention'};
 if(verificationActive(run))return {...base,status:run.status==='RUNNING'?'VERIFYING':run.status,state:'current'};
 if(run.status==='PASSED'&&run.results.length>0&&run.results.every(result=>result.status==='PASS')&&view.recipe?.id===run.recipeId&&view.recipe.claims.every(claim=>run.results.some(result=>result.claimId===claim.id&&result.status==='PASS')))return {...base,status:'ACCEPTANCE CHECKS PASSED',state:'captured'};
 return {...base,status:run.status==='PASSED'?'INCONCLUSIVE':run.status==='FAILED'?'CHECKS FAILED':run.status,state:run.status==='INCONCLUSIVE'?'attention':'failed'};
}
export function manualDecisionAllowed(view:VerificationView,run:VerificationRun,claimId:string):boolean {
 return view.current&&view.runs[0]?.id===run.id&&run.status==='RUNNING'&&view.recipe?.id===run.recipeId&&view.recipe.steps.some(step=>step.kind==='MANUAL'&&step.claimIds.includes(claimId))&&run.results.some(result=>result.claimId===claimId&&result.status==='RUNNING'&&result.decidedAt===null);
}
