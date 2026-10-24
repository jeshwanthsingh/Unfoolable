import type {ChangeKind} from './change-classification.ts';
export type ReviewRiskRule={path:string;kind?:ChangeKind;raiseTo:'GREEN'|'AMBER'|'RED';message:string};
export type ReviewRisk={color:'GREEN'|'AMBER'|'RED';reason:string;files:number;changedLines:number;cap:{lines:number;files:number}};
export function isReviewRisk(v:unknown):v is ReviewRisk {if(!v||typeof v!=='object')return false;const r=v as ReviewRisk;return ['GREEN','AMBER','RED'].includes(r.color)&&typeof r.reason==='string'&&Number.isSafeInteger(r.files)&&r.files>=0&&Number.isSafeInteger(r.changedLines)&&r.changedLines>=0&&!!r.cap&&Number.isSafeInteger(r.cap.lines)&&r.cap.lines>0&&Number.isSafeInteger(r.cap.files)&&r.cap.files>0;}
