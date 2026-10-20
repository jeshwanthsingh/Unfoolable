import {scoreVerdict} from './verdict-core.ts';
export type VerifyRequirement='REQUIRED'|'ADVISORY';
export type VerifyStatus='PASS'|'FAIL'|'NOT CHECKED'|'ERROR'|'CANCELLED'|'STALE';
export type VerifyClaimResult={id:string;requirement:VerifyRequirement;status:VerifyStatus;reason:string|null};
export function scoreVerifyV2(claims:VerifyClaimResult[]):{status:VerifyStatus;acceptance:'VERIFIED'|'NOT VERIFIED';claims:VerifyClaimResult[]}{
 const scored=scoreVerdict({path:'claims',claims});
 const status=scored.status!;
 return {status,acceptance:scored.verdict==='VERIFIED'?'VERIFIED':'NOT VERIFIED',claims};
}
