import type {OracleManifest,OracleTest} from './oracle.ts';
import type {VerifyRequirement,VerifyStatus,VerifyClaimResult} from './verify-only-v2.ts';
import {isV1Report} from './verification-v1.ts';
import type {V1Report} from './verification-v1.ts';
export type VerifyInput={repoPath:string;baseRef:string;candidateRef:string;intent:string;projectId?:string;taskChecks?:boolean;testWriter?:boolean};
export type VerifyBinding=VerifyInput&{repoRoot:string;baseCommit:string;candidateCommit:string;baseTree:string;candidateTree:string;runnerDirectory:string};
export type VerifyClaim={id:string;classification:'CHANGE'|'GUARD';testName:string;summary:string;mode:'AUTOMATED'|'HUMAN';reason:string|null;test:OracleTest|null;admission:'ADMITTED'|'REJECTED'|'NOT CHECKED';baseResult:string;requirement:VerifyRequirement;intentQuote:string;targetPaths:string[];admissionEvidence?:{base:VerifyStatus[];correct:VerifyStatus;wrong:VerifyStatus[];failureRate?:number;residualRisk?:string}};
export type VerifyReview={hash:string;evaluatorHash:string;claims:VerifyClaim[];manifest:OracleManifest|null};
export type VerifyEvidence={recipeBase?:{path:string;hash:string;sourceTree:string};candidateExport:{path:string;hash:string;sourceTree:string};overlay:{path:string;hash:string;restored:string[];candidateOnlyTests:string[]};executionTree:{path:string;hash:string;trustedLinks:Record<string,string>};recipeHash:string;requiredChecksHash:string;inputHash:string;executedChecks:{id:string;path:string;hash:string}[];records:{path:string;hash:string}[];hash:string};
export type VerifyResult={status:VerifyStatus;acceptance:'VERIFIED'|'PASSED WITH GAPS'|'NOT VERIFIED'|'ACCEPT WITH WAIVER';automatedStatus:VerifyStatus;claims:VerifyClaimResult[];excludedTests?:{claimId:string;testId:string;reason:string;status:'EXCLUDED'}[];evidence:VerifyEvidence|null;v1?:V1Report};
export type VerifyView={id:string;state:'AUTHORING'|'REVIEW'|'VERIFYING'|'RESULT'|'ERROR';input:VerifyBinding;review:VerifyReview|null;result:VerifyResult|null;error:string|null;approvedAt:string|null;protocolVersion:1|2;abandonedAt:string|null;waiver:{kind:'ACCEPT_WITH_WAIVER';actor:'human';at:string;reason:string;claimIds:string[];evidenceHash:string}|null};

export function isVerifyView(value:unknown):value is VerifyView{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Record<string,any>,i=v.input;
 if(Object.keys(v).sort().join(',')!=='abandonedAt,approvedAt,error,id,input,protocolVersion,result,review,state,waiver'||![1,2].includes(v.protocolVersion)||typeof v.id!=='string'||!['AUTHORING','REVIEW','VERIFYING','RESULT','ERROR'].includes(v.state)||!i||typeof i!=='object'||!['repoPath','baseRef','candidateRef','intent','repoRoot','runnerDirectory'].every(k=>typeof i[k]==='string')||!['baseCommit','candidateCommit','baseTree','candidateTree'].every(k=>/^[a-f0-9]{40,64}$/.test(i[k])))return false;
 if(v.error!==null&&typeof v.error!=='string'||v.approvedAt!==null&&typeof v.approvedAt!=='string')return false;
 if(i.projectId!==undefined&&(typeof i.projectId!=='string'||!i.projectId.trim())||i.taskChecks!==undefined&&typeof i.taskChecks!=='boolean')return false;
 if(v.review!==null&&(!(['AUTHORING','RESULT','ERROR'].includes(v.state)&&v.approvedAt===null&&v.review?.hash==='')&&!/^[a-f0-9]{64}$/.test(v.review?.hash)||!/^[a-f0-9]{64}$/.test(v.review?.evaluatorHash)||!Array.isArray(v.review?.claims)||!v.review.claims.every((c:Record<string,unknown>)=>!!c&&typeof c==='object'&&typeof c.id==='string'&&typeof c.testName==='string'&&typeof c.summary==='string'&&['AUTOMATED','HUMAN'].includes(String(c.mode))&&['ADMITTED','REJECTED','NOT CHECKED'].includes(String(c.admission)))))return false;
 if(v.result!==null&&(!['PASS','FAIL','NOT CHECKED','ERROR','CANCELLED','STALE'].includes(v.result?.status)||!['VERIFIED','PASSED WITH GAPS','NOT VERIFIED','ACCEPT WITH WAIVER'].includes(v.result?.acceptance)||!['PASS','FAIL','NOT CHECKED','ERROR','CANCELLED','STALE'].includes(v.result?.automatedStatus)||!Array.isArray(v.result?.claims)||!v.result.claims.every((c:Record<string,unknown>)=>['REQUIRED','ADVISORY'].includes(String(c.requirement))&&['PASS','FAIL','NOT CHECKED','ERROR','CANCELLED','STALE'].includes(String(c.status)))))return false;
 if(v.result?.v1!==undefined){
  if(!isV1Report(v.result.v1))return false;
  const expected=v.result.v1.verdict==='ERROR'?'ERROR':v.result.v1.verdict==='FAILED'?'FAIL':'PASS';
  const acceptance=v.result.v1.verdict==='FAILED'||v.result.v1.verdict==='ERROR'?'NOT VERIFIED':v.result.v1.verdict;
  if(v.result.status!==expected||v.result.automatedStatus!==expected||v.result.acceptance!==acceptance)return false;
  if(expected==='PASS'&&(!v.review||!v.result.evidence||!/^[a-f0-9]{64}$/.test(v.result.evidence.hash)||!v.result.v1.recipeIds.length))return false;
 }
 if(v.result?.acceptance==='PASSED WITH GAPS'&&v.result.v1===undefined)return false;
 if(v.result?.excludedTests!==undefined&&(!Array.isArray(v.result.excludedTests)||!v.result.excludedTests.every((e:Record<string,unknown>)=>e&&e.status==='EXCLUDED'&&typeof e.claimId==='string'&&typeof e.testId==='string'&&typeof e.reason==='string'&&e.reason.length>0)))return false;
 return true;
}
