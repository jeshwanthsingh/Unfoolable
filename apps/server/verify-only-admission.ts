import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import type {VerifyBinding,VerifyClaim} from '../../packages/shared/verify-only.ts';
import type {OracleManifest,OracleTest} from '../../packages/shared/oracle.ts';
import type {OracleExecution} from './oracle-execution.ts';
import type {ReferenceEdit,VerifyReferences} from './verify-only-references.ts';
import {materializeOracleTree} from './oracle-tree.ts';
import {safeBuildGit} from './build-workspace.ts';
import {canonicalContractJson} from './contract-store.ts';
import {verifyStep} from './verify-only-deadline.ts';
import {harnessRetry,retryableExecution} from './verify-only-retry.ts';
import type {VerifyStatus} from '../../packages/shared/verify-only-v2.ts';

export function executionStatus(result:OracleExecution):VerifyStatus{
 if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length||result.truncated||result.status==='INCONCLUSIVE')return 'ERROR';
 try{const output=JSON.parse(result.output);if(output.observations?.some((row:{exception?:{phase?:string};returnValue?:{report?:{numTotalTests?:number};tests?:{exceptionType?:string}[]}})=>['suite','concurrent','cli'].includes(row.exception?.phase??'')||row.returnValue?.tests?.some(t=>t.exceptionType==='PermissionError')||row.returnValue?.report?.numTotalTests===0))return 'ERROR';}catch{return 'ERROR';}
 return result.status;
}
export async function scopedRevision(input:VerifyBinding,revision:string):Promise<string>{return input.runnerDirectory==='sdk/python'?(await safeBuildGit(input.repoRoot,['rev-parse',revision+':sdk/python'],1000)).toString().trim():revision;}
export async function referenceTree(input:VerifyBinding,edits:ReferenceEdit[],directory:string):Promise<string>{
 await materializeOracleTree(input.repoRoot,await scopedRevision(input,input.baseCommit),directory);
 for(const e of edits){const path=input.runnerDirectory==='sdk/python'?e.path.replace(/^sdk\/python\//,''):e.path;if(path.startsWith('/')||path.split('/').includes('..'))throw Error('Reference path escaped BASE');const file=join(directory,path),before=readFileSync(file,'utf8');if(before.split(e.before).length!==2)throw Error('Reference edit is not a unique BASE hunk: '+e.path);writeFileSync(file,before.replace(e.before,e.after));}
 return directory;
}
export function executionTest(test:OracleTest,workspace:string,manifest:OracleManifest,changed:string[],admission=false):OracleTest{
 const copy=structuredClone(test);
 for(const r of copy.requests){if(r.kind==='CONCURRENT'&&admission&&!r.distinctUrls)r.repetitions=500;if(r.kind==='SUITE'&&manifest.runner==='vitest')r.fixtureInput={root:join(workspace,manifest.runnerDirectory)};if(r.kind==='SCOPE'){
  const allowed=r.scope!.allowed;if(!allowed.length||allowed.some(p=>p.startsWith('/')||p.includes('..')))throw Error('Invalid scope patterns');
  const matches=(name:string,p:string)=>p.endsWith('/**')?name.startsWith(p.slice(0,-2)):name===p;
  r.scope={allowed,changed,outside:changed.filter(n=>!allowed.some(p=>matches(n,p)))};
 }}return copy;
}
function sampledOutcomes(result:OracleExecution){
 const file=result.environment.observationPath;if(typeof file!=='string')return null;
 const data=JSON.parse(readFileSync(file,'utf8')) as {observations:{returnValue?:{completedPairs:number;requestedPairs:number;histogram:{count:number;outcome:{exitCodes:(number|null)[];exceptionTypes:(string|null)[];storedRows:number;warmExitCode:number}}[]}}[]};
 const rows=data.observations.flatMap(o=>o.returnValue?.histogram?[o.returnValue]:[]);if(!rows.length)return null;
 const failures=rows.reduce((n,r)=>n+r.histogram.filter(h=>h.outcome.storedRows!==1||h.outcome.warmExitCode!==0||h.outcome.exitCodes.some(c=>c!==0)||h.outcome.exceptionTypes.some(c=>c!==null)).reduce((k,h)=>k+h.count,0),0);
 return {complete:rows.every(r=>r.completedPairs===r.requestedPairs),pairs:rows.reduce((n,r)=>n+r.completedPairs,0),failures};
}
export async function admitVerifyOnly(input:VerifyBinding,claims:VerifyClaim[],manifest:OracleManifest|null,refs:VerifyReferences,directory:string,signal:AbortSignal,execute:(manifest:OracleManifest,test:OracleTest,workspace:string,directory:string,signal:AbortSignal)=>Promise<OracleExecution>){
 if(!manifest)return;
 const base=join(directory,'base');await verifyStep('BASE export',60000,signal,async()=>materializeOracleTree(input.repoRoot,await scopedRevision(input,input.baseCommit),base));
 const baseWorkspace=base;
 const correct=await verifyStep('Correct reference export',60000,signal,()=>referenceTree(input,refs.correct,join(directory,'correct-reference')));
 const wrong:string[]=[];for(let n=0;n<refs.wrong.length;n++)wrong.push(await verifyStep('Wrong reference export',60000,signal,()=>referenceTree(input,refs.wrong[n]!.edits,join(directory,'wrong-reference-'+n))));
 const run=async(c:VerifyClaim,workspace:string,changed:string[],label:string,admission=false)=>{
  const folder=join(directory,'admission-'+c.id+'-'+label);mkdirSync(folder,{mode:0o700});
  const test=executionTest(c.test!,workspace,manifest,changed,admission);
  const result=await harnessRetry('Admission '+c.id+' '+label,folder,signal,attempt=>verifyStep('Admission '+c.id+' '+label,180000,signal,s=>execute(manifest,test,workspace,join(folder,'execution-'+attempt),s)),retryableExecution);
  writeFileSync(join(folder,'execution.json'),canonicalContractJson({test,result}),{flag:'wx',mode:0o600});
  if(!result.cleanup.verified||result.cleanup.ambiguous)throw Error('Admission cleanup is not certified');return result;
 };
 for(const c of claims){if(!c.test)continue;const concurrent=c.classification==='CHANGE'&&c.test.requests.some(r=>r.kind==='CONCURRENT'&&!r.distinctUrls),baseStatuses:VerifyStatus[]=[],samples:{complete:boolean;pairs:number;failures:number}[]=[];
  for(let n=0;n<(concurrent?3:1);n++){const result=await run(c,baseWorkspace,[],'base-'+n,true);baseStatuses.push(executionStatus(result));const sample=sampledOutcomes(result);if(sample)samples.push(sample);}
  c.baseResult=baseStatuses.join(', ');
  if(c.classification==='GUARD'){c.admission=baseStatuses.every(s=>s==='PASS')?'ADMITTED':'REJECTED';c.reason=c.admission==='ADMITTED'?null:'Regression tester did not pass BASE; no Candidate verdict is authorized.';c.admissionEvidence={base:baseStatuses,correct:'NOT CHECKED',wrong:[]};continue;}
  const relevant=(edits:ReferenceEdit[])=>edits.some(e=>c.targetPaths.includes(e.path));
  const correctResult=await run(c,correct,refs.correct.map(e=>e.path),'correct'),correctStatus=executionStatus(correctResult);const wrongStatuses:VerifyStatus[]=[];
  for(let n=0;n<wrong.length;n++){if(!relevant(refs.wrong[n]!.edits)){wrongStatuses.push('NOT CHECKED');continue;}const result=await run(c,wrong[n]!,refs.wrong[n]!.edits.map(e=>e.path),'wrong-'+n,true);const sample=sampledOutcomes(result);wrongStatuses.push(concurrent&&(!sample?.complete||!sample.failures)?'NOT CHECKED':executionStatus(result));}
  const meaningful=(!concurrent||samples.length===3&&samples.every(s=>s.complete&&s.failures>0))&&relevant(refs.correct);
  c.admission=meaningful&&baseStatuses.every(s=>s==='FAIL')&&correctStatus==='PASS'&&wrongStatuses.includes('FAIL')?'ADMITTED':'REJECTED';c.reason=c.admission==='ADMITTED'?null:'Tester admission requires intended BASE failure, independent correct PASS and plausible wrong FAIL. No Candidate failure is inferred.';
  c.admissionEvidence={base:baseStatuses,correct:correctStatus,wrong:wrongStatuses};
  if(samples.length){const count=samples.reduce((n,s)=>n+s.pairs,0),bad=samples.reduce((n,s)=>n+s.failures,0),rate=bad/count;c.admissionEvidence.failureRate=rate;c.admissionEvidence.residualRisk=`BASE ${bad}/${count} sampled pairs (${(rate*100).toFixed(3)}%). Statistical verification cannot prove race absence. Assuming independent pairs and a tenfold-reduced rate, zero failures in 2000 occurs with probability ${(Math.pow(1-rate/10,2000)*100).toFixed(2)}%; independence is an assumption.`;}
 }
}
