export type VerifyRequirement='REQUIRED'|'ADVISORY';
export type VerifyStatus='PASS'|'FAIL'|'NOT CHECKED'|'ERROR'|'CANCELLED'|'STALE';
export type VerifyClaimResult={id:string;requirement:VerifyRequirement;status:VerifyStatus;reason:string|null};
export function scoreVerifyV2(claims:VerifyClaimResult[]):{status:VerifyStatus;acceptance:'VERIFIED'|'NOT VERIFIED';claims:VerifyClaimResult[]}{
 const required=claims.filter(c=>c.requirement==='REQUIRED');
 const status:VerifyStatus=!required.length?'NOT CHECKED':(['STALE','CANCELLED','ERROR','FAIL','NOT CHECKED'] as const).find(s=>required.some(c=>c.status===s))??'PASS';
 return {status,acceptance:required.length>0&&required.every(c=>c.status==='PASS')?'VERIFIED':'NOT VERIFIED',claims};
}
