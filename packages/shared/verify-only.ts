import type {OracleManifest,OracleTest} from './oracle.ts';
export type VerifyInput={repoPath:string;baseRef:string;candidateRef:string;intent:string};
export type VerifyBinding=VerifyInput&{repoRoot:string;baseCommit:string;candidateCommit:string;baseTree:string;candidateTree:string;runnerDirectory:string};
export type VerifyClaim={id:string;classification:'CHANGE'|'GUARD';testName:string;summary:string;mode:'AUTOMATED'|'HUMAN';reason:string|null;test:OracleTest|null;admission:'ADMITTED'|'REJECTED'|'NOT CHECKED';baseResult:string;};
export type VerifyReview={hash:string;evaluatorHash:string;claims:VerifyClaim[];manifest:OracleManifest|null};
export type VerifyResult={status:'PASS'|'FAIL'|'PARTIAL'|'INCONCLUSIVE'|'NOT CHECKED';automatedStatus:'PASS'|'FAIL'|'INCONCLUSIVE'|'NOT CHECKED';claims:{id:string;status:string;reason:string|null}[];};
export type VerifyView={id:string;state:'AUTHORING'|'REVIEW'|'VERIFYING'|'RESULT'|'ERROR';input:VerifyBinding;review:VerifyReview|null;result:VerifyResult|null;error:string|null;approvedAt:string|null;};

export function isVerifyView(value:unknown):value is VerifyView{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Record<string,any>,i=v.input;
 if(Object.keys(v).sort().join(',')!=='approvedAt,error,id,input,result,review,state'||typeof v.id!=='string'||!['AUTHORING','REVIEW','VERIFYING','RESULT','ERROR'].includes(v.state)||!i||typeof i!=='object'||!['repoPath','baseRef','candidateRef','intent','repoRoot','runnerDirectory'].every(k=>typeof i[k]==='string')||!['baseCommit','candidateCommit','baseTree','candidateTree'].every(k=>/^[a-f0-9]{40,64}$/.test(i[k])))return false;
 if(v.error!==null&&typeof v.error!=='string'||v.approvedAt!==null&&typeof v.approvedAt!=='string')return false;
 if(v.review!==null&&(!/^[a-f0-9]{64}$/.test(v.review?.hash)||!/^[a-f0-9]{64}$/.test(v.review?.evaluatorHash)||!Array.isArray(v.review?.claims)||!v.review.claims.every((c:Record<string,unknown>)=>!!c&&typeof c==='object'&&typeof c.id==='string'&&typeof c.testName==='string'&&typeof c.summary==='string'&&['AUTOMATED','HUMAN'].includes(String(c.mode))&&['ADMITTED','REJECTED','NOT CHECKED'].includes(String(c.admission)))))return false;
 if(v.result!==null&&(!['PASS','FAIL','PARTIAL','INCONCLUSIVE','NOT CHECKED'].includes(v.result?.status)||!['PASS','FAIL','INCONCLUSIVE','NOT CHECKED'].includes(v.result?.automatedStatus)||!Array.isArray(v.result?.claims)))return false;
 return true;
}
