import type {SpecView} from '../../../packages/shared/spec.ts';
export function canAcceptSpec(view:SpecView):boolean{return view.phase==='SPEC_REVIEW'&&!view.accepted&&!!view.specId&&!!view.goal&&view.claims.length>0&&view.claims.every(claim=>claim.admitted);}
export function canLandMission(view:SpecView):boolean{return view.phase==='CHECKS_PASSED'&&view.accepted&&!!view.specId&&!!view.runId&&view.claims.length>0&&view.claims.every(claim=>claim.admitted);}
export function specLabel(view:SpecView|null):string{return view?view.phase.replaceAll('_',' '):'Spec unavailable';}
