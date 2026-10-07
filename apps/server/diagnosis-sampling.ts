/** Only kernel-query misses receive a short retry; persistence and policy failures remain sticky. */
export class DiagnosisQueryMiss extends Error {}
export function diagnosisSamplingFaults(fail:(reason:'query'|'hard')=>void,deadlineMs=300){
 let querySince:number|null=null;
 return {success(){querySince=null;},error(problem:unknown,at:number){if(!(problem instanceof DiagnosisQueryMiss)){fail('hard');return;}querySince??=at;if(at-querySince>=deadlineMs)fail('query');},pending(){return querySince!==null;}};
}
