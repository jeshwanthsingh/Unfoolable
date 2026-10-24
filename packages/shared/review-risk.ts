import type {ChangeKind} from './change-classification.ts';
export type ReviewRiskRule={path:string;kind?:ChangeKind;raiseTo:'GREEN'|'AMBER'|'RED';message:string};
export type ReviewRisk={color:'GREEN'|'AMBER'|'RED';reason:string;files:number;changedLines:number;cap:{lines:number;files:number}};
export function isReviewRisk(v:unknown):v is ReviewRisk {if(!v||typeof v!=='object')return false;const r=v as ReviewRisk;return ['GREEN','AMBER','RED'].includes(r.color)&&typeof r.reason==='string'&&Number.isSafeInteger(r.files)&&r.files>=0&&Number.isSafeInteger(r.changedLines)&&r.changedLines>=0&&!!r.cap&&Number.isSafeInteger(r.cap.lines)&&r.cap.lines>0&&Number.isSafeInteger(r.cap.files)&&r.cap.files>0;}

export function plainReviewRiskReason(risk:ReviewRisk|undefined):string {
 if(!risk)return '';
 return risk.reason.replaceAll('Project rule: ','').replaceAll('Playbook, CI or lockfiles changed','Project checks, automation or dependency versions changed').replaceAll('New quality-gate finding','An automatic code check found a new problem').replaceAll('Test-tampering flag','A test may have been weakened').replaceAll('Test-tampering check unavailable',"We couldn't check whether tests were changed").replaceAll('Protected checks and gates passed; no flags; small diff.','Checks passed. No review warnings were found.').replaceAll('Checks have gaps or incomplete evidence; inspect the diff.',"Some behavior couldn't be checked. Review the changes.").replaceAll('Protected checks failed','The locked tests found a problem');
}
