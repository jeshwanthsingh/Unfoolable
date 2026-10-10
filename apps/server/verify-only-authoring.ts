import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalContractJson} from './contract-store.ts';
import {oracleSource} from './oracle-source.ts';
import {admitVerifyOnly} from './verify-only-admission.ts';
import {verifyStep} from './verify-only-deadline.ts';
import {harnessRetry,retryEvidence} from './verify-only-retry.ts';
import type {VerifyBinding,VerifyClaim} from '../../packages/shared/verify-only.ts';
import type {OracleManifest} from '../../packages/shared/oracle.ts';
import type {VerifyReferences} from './verify-only-references.ts';
import type {executeOracleTest} from './oracle-execution.ts';
export type Proposal={claims:VerifyClaim[];manifest:OracleManifest|null;runnerDirectory:string;source?:Awaited<ReturnType<typeof oracleSource>>};
export type Author=(input:VerifyBinding,id:string,directory:string,signal:AbortSignal)=>Promise<Proposal>;
export type References=(input:VerifyBinding,source:Awaited<ReturnType<typeof oracleSource>>,directory:string,signal:AbortSignal)=>Promise<VerifyReferences>;
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function admittedCheck(c:VerifyClaim):boolean {const e=c.admissionEvidence;return !!c.test&&c.admission==='ADMITTED'&&!!e&&(c.classification==='GUARD'?e.base.length>0&&e.base.every(s=>s==='PASS'):e.base.length>0&&e.base.every(s=>s==='FAIL')&&e.correct==='PASS'&&e.wrong.includes('FAIL'));}
export async function authorAndAdmit(input:VerifyBinding,id:string,directory:string,signal:AbortSignal,author:Author,references:References,execute:typeof executeOracleTest){
 const attempts:{attempt:number;directory:string;status:string;claims?:{id:string;kept:boolean;admission:unknown}[];reason?:string}[]=[],records:{path:string;hash:string}[]=[];
 let best:Proposal|null=null,chosen:number|null=null,bestChanges=-1,anchor:unknown=null,authoredAnchor:unknown=null,anchoredProposal:Proposal|null=null;
 const obligations=(claims:VerifyClaim[])=>claims.filter(c=>c.requirement==='REQUIRED').map(c=>({id:c.id,classification:c.classification,requirement:c.requirement,intentQuote:c.intentQuote,targetPaths:c.targetPaths}));
 for(const attempt of [1,2]){
  if(signal.aborted)throw signal.reason??Error('Verification cancelled');const folder=join(directory,'authoring-attempt-'+attempt);mkdirSync(folder,{mode:0o700});
  if(authoredAnchor)writeFileSync(join(folder,'required-claims.json'),canonicalContractJson(authoredAnchor),{flag:'wx',mode:0o400});
  try {
   // No nested author retry: every provider invocation consumes one of two slots.
   const binding={...input},proposal=await verifyStep('Oracle authoring '+attempt,100000,signal,s=>author(binding,id,folder,s));binding.runnerDirectory=proposal.runnerDirectory;
   if(!proposal.claims.length||proposal.claims.some(c=>!['REQUIRED','ADVISORY'].includes(c.requirement)))throw Error('Every claim must be classified before checks');
   if(anchor&&canonicalContractJson(obligations(proposal.claims))!==canonicalContractJson(anchor))throw Error('Retry changed or dropped required obligations');
   anchoredProposal??=structuredClone(proposal);anchor??=obligations(proposal.claims);authoredAnchor??=obligations(proposal.claims.filter(c=>!c.test?.requests.some(r=>r.kind==='SUITE'||r.kind==='SCOPE')));
   writeFileSync(join(folder,'frozen-before-checks.json'),canonicalContractJson({binding,proposal}),{flag:'wx',mode:0o400});
   const source=proposal.source??await verifyStep('Reference source',30000,signal,()=>oracleSource(binding.repoRoot,binding.baseCommit,binding.intent));
   const refs=await harnessRetry('Independent reference authoring',folder,signal,()=>verifyStep('Independent reference authoring',100000,signal,s=>references(binding,source,folder,s)));
   await admitVerifyOnly(binding,proposal.claims,proposal.manifest,refs,folder,signal,execute);
   if(signal.aborted)throw signal.reason??Error('Verification cancelled');
   const kept=proposal.claims.map(c=>({id:c.id,kept:admittedCheck(c),admission:c.admissionEvidence??null})),changes=proposal.claims.filter(c=>c.classification==='CHANGE'&&admittedCheck(c)).length;
   const full=changes>0&&proposal.claims.filter(c=>c.requirement==='REQUIRED').every(admittedCheck);
   attempts.push({attempt,directory:folder,status:full?'FULLY_ADMITTED':'INCOMPLETE',claims:kept});
   writeFileSync(join(folder,'admission-result.json'),canonicalContractJson({proposal,kept,full}),{flag:'wx',mode:0o400});
   if(full||changes>bestChanges||changes===bestChanges&&proposal.claims.filter(admittedCheck).length>(best?.claims.filter(admittedCheck).length??0)){best=proposal;bestChanges=changes;chosen=attempt;}
   if(full)break;
  }catch(error){if(signal.aborted||/cleanup.*(?:uncertain|not certified)|not certified.*cleanup/i.test(error instanceof Error?error.message:''))throw error;
   attempts.push({attempt,directory:folder,status:'REJECTED',reason:error instanceof Error?error.message:'Authoring failed'});writeFileSync(join(folder,'rejection.json'),canonicalContractJson(attempts.at(-1)),{flag:'wx',mode:0o400});
  }
 }
 best??=anchoredProposal;
 if(!best){let runnerDirectory='.';try{runnerDirectory=(await verifyStep('Fallback source identity',30000,signal,()=>oracleSource(input.repoRoot,input.baseCommit,input.intent))).directory;}catch{if(signal.aborted)throw signal.reason;}best={runnerDirectory,manifest:null,claims:[{id:'E1',classification:'CHANGE',requirement:'REQUIRED',intentQuote:input.intent.slice(0,1000),targetPaths:[],summary:'Original intent was not admitted after two authoring attempts.',testName:'Original intent',mode:'HUMAN',reason:'Neither authoring attempt produced an admitted check.',test:null,admission:'NOT CHECKED',baseResult:'NOT CHECKED'}]};}
 if(!best.claims.some(c=>c.classification==='CHANGE')){const id='E'+(Math.max(0,...best.claims.map(c=>Number(c.id.slice(1))))+1);best.claims.push({id,classification:'CHANGE',requirement:'REQUIRED',intentQuote:input.intent.slice(0,1000),targetPaths:[],summary:'Requested change has no admitted reproduction.',testName:'Original intent',mode:'HUMAN',reason:'Guard-only checks cannot verify a requested change.',test:null,admission:'NOT CHECKED',baseResult:'NOT CHECKED'});}
 // Never execute any rejected test. Preserve every selected obligation/label.
 for(const c of best.claims)if(!admittedCheck(c)){c.test=null;c.admission='NOT CHECKED';c.mode='HUMAN';c.reason=c.reason??'Neither attempt admitted this claim; NOT CHECKED.';}
 if(best.manifest)best.manifest.tests=best.claims.flatMap(c=>c.test?[c.test]:[]);
 const selection={policy:'at most two independent authoring attempts; keep only full per-claim admission; no Candidate scoring retries',attempts,usedAttempt:chosen,usedClaims:best.claims.filter(c=>c.test).map(c=>({id:c.id,attempt:chosen}))};
 writeFileSync(join(directory,'authoring-attempts.json'),canonicalContractJson(selection),{flag:'wx',mode:0o400});
 const capture=(path:string)=>records.push({path,hash:hash(path)});
 capture(join(directory,'authoring-attempts.json'));
 for(const a of attempts){records.push(...retryEvidence(a.directory));for(const name of ['author-proposal.json','reference-proposal.json','frozen-before-checks.json','admission-result.json','rejection.json','required-claims.json']){const path=join(a.directory,name);if(existsSync(path))capture(path);}
  const raw=join(a.directory,'ai-outputs');if(existsSync(raw))for(const child of readdirSync(raw)){const path=join(raw,child,'record.json');if(existsSync(path))capture(path);}
  for(const name of readdirSync(a.directory).filter(n=>n.startsWith('admission-'))){const folder=join(a.directory,name),path=join(folder,'execution.json');if(!existsSync(path))continue;capture(path);records.push(...retryEvidence(folder));const execution=JSON.parse(readFileSync(path,'utf8'));const observed=execution.result.environment.observationPath;if(typeof observed==='string')capture(observed);}
 }
 return {proposal:best,records,selection};
}
