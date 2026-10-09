import {evaluatorBundle} from './verification-executor.ts';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,realpathSync,writeFileSync,readFileSync,cpSync,readdirSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {validateRepository} from './repository.ts';
import {safeBuildGit} from './build-workspace.ts';
import {canonicalContractJson} from './contract-store.ts';
import {materializeOracleTree,restoreBaseTests,dependencyChanges,reviewTripwire} from './oracle-tree.ts';
import {executeOracleTest} from './oracle-execution.ts';
import {authorVerifyOnly} from './verify-only-author.ts';
import {authorVerifyReferences,type VerifyReferences} from './verify-only-references.ts';
import {oracleSource} from './oracle-source.ts';
import {admitVerifyOnly,executionStatus,executionTest,scopedRevision} from './verify-only-admission.ts';
import {verifyHash,verifyTreeHash} from './verify-only-identity.ts';
import {verifyStep} from './verify-only-deadline.ts';
import {scoreVerifyV2,type VerifyClaimResult} from '../../packages/shared/verify-only-v2.ts';
import {SpecError} from './spec-errors.ts';
import type {Logger} from './log.ts';
import type {VerifyInput,VerifyBinding,VerifyView,VerifyReview,VerifyResult,VerifyClaim,VerifyEvidence} from '../../packages/shared/verify-only.ts';
import type {OracleManifest} from '../../packages/shared/oracle.ts';
type Proposal={claims:VerifyClaim[];manifest:OracleManifest|null;runnerDirectory:string;source?:Awaited<ReturnType<typeof oracleSource>>};
type Author=(input:VerifyBinding,id:string,directory:string,signal:AbortSignal)=>Promise<Proposal>;
type References=(input:VerifyBinding,source:Awaited<ReturnType<typeof oracleSource>>,directory:string,signal:AbortSignal)=>Promise<VerifyReferences>;
type Ledger={requiredList?:{id:string;requirement:string;testName:string}[];requiredChecksHash?:string;recipeHash?:string;abandonedAt?:string;waiver?:NonNullable<VerifyView['waiver']>;partial?:VerifyClaimResult[];cleanupUncertain?:boolean;resultHash?:string;admissionRecords?:{path:string;hash:string}[]};
const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const requiredList=(claims:VerifyClaim[])=>claims.map(c=>({id:c.id,requirement:c.requirement,testName:c.testName}));
const recipe=(input:VerifyBinding,review:VerifyReview)=>verifyHash({input,evaluatorHash:review.evaluatorHash,manifest:review.manifest,claims:review.claims.map(({admission:_a,admissionEvidence:_e,baseResult:_b,reason:_r,...c})=>c)});
export function scoreVerifyOnly(claims:VerifyClaimResult[],evidence:VerifyEvidence|null=null):VerifyResult{const scored=scoreVerifyV2(claims),executed=claims.filter(c=>c.status!=='NOT CHECKED').map(c=>({...c,requirement:'REQUIRED' as const}));return {...scored,automatedStatus:scoreVerifyV2(executed).status,evidence};}

export function createVerifyOnly(db:DatabaseSync,config:{dataDir:string;projectRoots:readonly string[]},logger:Logger,author:Author=authorVerifyOnly,execute:typeof executeOracleTest=executeOracleTest,references:References=authorVerifyReferences){
 let closed=false;const operations=new Map<string,{controller:AbortController;promise:Promise<void>}>();
 const directory=(id:string)=>join(realpathSync(config.dataDir),'verify-only',id);
 const row=(id:string)=>{const r=db.prepare('SELECT * FROM verify_only_runs WHERE id=?').get(id);if(!r)throw new SpecError('VERIFY_NOT_FOUND','Verification request not found.',404);return r;};
 const ledger=(id:string):Ledger=>JSON.parse(String(row(id).ledger_json));
 const saveLedger=(id:string,value:Ledger)=>db.prepare('UPDATE verify_only_runs SET ledger_json=? WHERE id=?').run(canonicalContractJson(value),id);
 const update=(id:string,state:VerifyView['state'],review:VerifyReview|null,result:VerifyResult|null,error:string|null=null)=>db.prepare('UPDATE verify_only_runs SET state=?,review_json=?,result_json=?,error=? WHERE id=?').run(state,review?canonicalContractJson(review):null,result?canonicalContractJson(result):null,error,id);
 const stale=(v:VerifyView,reason:string):VerifyView=>{v.result=v.result?{...v.result,status:'STALE',acceptance:'NOT VERIFIED',automatedStatus:'STALE',claims:v.result.claims.map(c=>({...c,status:'STALE',reason}))}:{status:'STALE',acceptance:'NOT VERIFIED',automatedStatus:'STALE',claims:v.review?.claims.map(c=>({id:c.id,requirement:c.requirement,status:'STALE',reason}))??[],evidence:null};v.error=reason;return v;};
 const view=(id:string):VerifyView=>{
  const r=row(id),l=ledger(id),input=JSON.parse(String(r.input_json)),review:VerifyReview|null=r.review_json?JSON.parse(String(r.review_json)):null;
  let result:VerifyResult|null=r.result_json?JSON.parse(String(r.result_json)):null;
  if(Number(r.protocol_version)===1){if(review)review.claims=review.claims.map(c=>({...c,requirement:'REQUIRED',intentQuote:input.intent.slice(0,1000),targetPaths:c.targetPaths??[]}));if(result)result={status:'STALE',acceptance:'NOT VERIFIED',automatedStatus:'STALE',claims:(result.claims??[]).map(c=>({...c,requirement:'REQUIRED',status:'STALE',reason:'Historical v1 evidence has no v2 tester admission.'})),evidence:null};}
  const v:VerifyView={id,state:r.state as VerifyView['state'],input,review,result,error:r.error as string|null,approvedAt:r.approved_at as string|null,protocolVersion:Number(r.protocol_version) as 1|2,abandonedAt:l.abandonedAt??null,waiver:l.waiver??null};
  if(v.protocolVersion===2&&review&&l.requiredChecksHash!==verifyHash(requiredList(review.claims)))return stale(v,'Required-check identity changed.');
  if(v.protocolVersion===2&&review&&(recipe(input,review)!==l.recipeHash||review.evaluatorHash!==evaluatorBundle().hash))return stale(v,'Recipe or protected evaluator identity changed.');
  if(result&&l.resultHash){try{if(verifyHash(result)!==l.resultHash||fileHash(join(directory(id),'result.json'))!==createHash('sha256').update(canonicalContractJson(result)).digest('hex'))return stale(v,'Recorded verdict changed.');}catch{return stale(v,'Recorded verdict unavailable.');}}
  if(l.admissionRecords?.some(record=>{try{return fileHash(record.path)!==record.hash;}catch{return true;}}))return stale(v,'Tester admission evidence changed.');
  if(result?.evidence){const e=result.evidence;try{if(e.inputHash!==verifyHash(input)||e.recipeHash!==recipe(input,review!)||e.requiredChecksHash!==l.requiredChecksHash||review!.evaluatorHash!==evaluatorBundle().hash||verifyTreeHash(e.candidateExport.path)!==e.candidateExport.hash||verifyTreeHash(e.overlay.path)!==e.overlay.hash||verifyTreeHash(e.executionTree.path,e.executionTree.trustedLinks)!==e.executionTree.hash||e.executedChecks.some(c=>fileHash(c.path)!==c.hash)||e.records.some(c=>fileHash(c.path)!==c.hash)||verifyHash({...e,hash:''})!==e.hash)return stale(v,'Candidate export, overlay, recipe, required checks or execution evidence changed.');}catch{return stale(v,'Evidence is unavailable or changed.');}}
  if(l.abandonedAt&&v.result)v.result={...v.result,status:l.cleanupUncertain?'ERROR':'CANCELLED',acceptance:'NOT VERIFIED'};
  else if(l.waiver&&v.result){if(!v.result.evidence||l.waiver.evidenceHash!==v.result.evidence.hash)return stale(v,'Waiver belongs to different evidence.');v.result={...v.result,acceptance:'ACCEPT WITH WAIVER'};}
  return v;
 };
 const launch=(id:string,job:(signal:AbortSignal)=>Promise<void>)=>{const controller=new AbortController();const promise=Promise.resolve().then(()=>job(controller.signal)).catch(error=>{
   const current=view(id),uncertain=/cleanup.*(?:uncertain|not certified)|not certified.*cleanup/i.test(error instanceof Error?error.message:''),changed=error instanceof SpecError&&error.code==='VERIFY_STALE_EXECUTION',cancelled=!!ledger(id).abandonedAt&&!uncertain,claims=current.review?.claims.map(c=>({id:c.id,requirement:c.requirement,status:changed?'STALE' as const:cancelled?'CANCELLED' as const:'ERROR' as const,reason:changed?'Execution source changed.':cancelled?'Verification abandoned.':'Tester or environment did not complete.'}))??[];
   if(uncertain)saveLedger(id,{...ledger(id),cleanupUncertain:true});
   writeFileSync(join(directory(id),'error.json'),canonicalContractJson({code:error instanceof SpecError?error.code:'VERIFY_ERROR',reason:error instanceof Error?error.message:'Unknown verifier failure',cleanupUncertain:uncertain}),{mode:0o600});
   const result=scoreVerifyOnly(claims);if(changed)result.status='STALE';else if(cancelled)result.status='CANCELLED';else result.status='ERROR';
   update(id,cancelled?'RESULT':'ERROR',current.review,result,error instanceof SpecError?error.message:cancelled?null:'Verification could not complete. Inspect retained tester evidence.');logger({event:'verify_only.failed',code:error instanceof SpecError?error.code:'VERIFY_ERROR'});
  }).finally(()=>{if(!ledger(id).cleanupUncertain)operations.delete(id);});operations.set(id,{controller,promise});};
 const check=(id:string,signal:AbortSignal)=>{if(closed||signal.aborted||ledger(id).abandonedAt)throw Error('Verification interrupted');};
 const resolve=async(root:string,ref:unknown)=>{if(typeof ref!=='string'||!ref||ref.length>200||ref.startsWith('-')||/[\x00-\x20]/.test(ref))throw new SpecError('INVALID_REF','Supply a local commit ref.',400);try{return (await safeBuildGit(root,['rev-parse','--verify',ref+'^{commit}'],1000)).toString().trim();}catch{throw new SpecError('INVALID_REF','That local commit is unavailable.',422);}};
 const create=async(body:unknown):Promise<VerifyView>=>{
  if(closed)throw new SpecError('VERIFY_UNAVAILABLE','Verifier is closed.');if(db.prepare("SELECT id FROM verify_only_runs WHERE json_extract(ledger_json,'$.cleanupUncertain')=1").get())throw new SpecError('VERIFY_RECONCILE_REQUIRED','Owned cleanup requires reconciliation.');
  if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='baseRef,candidateRef,intent,repoPath')throw new SpecError('INVALID_VERIFY_INPUT','Provide repo, BASE, Candidate ref and intent.',400);
  const b=body as VerifyInput;if(typeof b.intent!=='string'||!b.intent.trim()||Buffer.byteLength(b.intent)>16000)throw new SpecError('INVALID_VERIFY_INPUT','Supply bounded original intent.',400);
  const repo=await verifyStep('Repository validation',10000,new AbortController().signal,()=>validateRepository(b.repoPath,config.projectRoots,logger)),baseCommit=await resolve(repo.repoRoot,b.baseRef),candidateCommit=await resolve(repo.repoRoot,b.candidateRef),id=randomUUID();
  const input:VerifyBinding={...b,repoRoot:repo.repoRoot,baseCommit,candidateCommit,baseTree:(await safeBuildGit(repo.repoRoot,['rev-parse',baseCommit+'^{tree}'],1000)).toString().trim(),candidateTree:(await safeBuildGit(repo.repoRoot,['rev-parse',candidateCommit+'^{tree}'],1000)).toString().trim(),runnerDirectory:'.'};
  db.prepare("INSERT INTO verify_only_runs(id,input_json,state,created_at,protocol_version) VALUES(?,?,'AUTHORING',?,2)").run(id,canonicalContractJson(input),new Date().toISOString());mkdirSync(directory(id),{recursive:true,mode:0o700});
  launch(id,async signal=>{
   const proposal=await verifyStep('Oracle authoring',100000,signal,s=>author(input,id,directory(id),s));check(id,signal);input.runnerDirectory=proposal.runnerDirectory;
   if(!proposal.claims.length||proposal.claims.some(c=>!['REQUIRED','ADVISORY'].includes(c.requirement)))throw Error('Every claim must be classified before checks');
   db.prepare('UPDATE verify_only_runs SET input_json=? WHERE id=?').run(canonicalContractJson(input),id);
   const review:VerifyReview={hash:'',evaluatorHash:evaluatorBundle().hash,claims:proposal.claims,manifest:proposal.manifest};const list=requiredList(review.claims),l:Ledger={requiredList:list,requiredChecksHash:verifyHash(list),recipeHash:recipe(input,review)};
   saveLedger(id,l);writeFileSync(join(directory(id),'frozen-before-checks.json'),canonicalContractJson({input,requiredList:list,recipeHash:l.recipeHash,review}),{flag:'wx',mode:0o400});
   // Publish frozen claims before admission for truthful cancellation/error handling; never approvable while AUTHORING.
   update(id,'AUTHORING',review,null);
   const source=proposal.source??await verifyStep('Reference source',30000,signal,()=>oracleSource(input.repoRoot,input.baseCommit,input.intent));
   const refs=await verifyStep('Independent reference authoring',100000,signal,s=>references(input,source,directory(id),s));check(id,signal);
   await admitVerifyOnly(input,review.claims,review.manifest,refs,directory(id),signal,execute);check(id,signal);
   if(recipe(input,review)!==l.recipeHash||verifyHash(requiredList(review.claims))!==l.requiredChecksHash)throw Error('Tester identity changed during admission');
   const records:{path:string;hash:string}[]=[];for(const name of readdirSync(directory(id)).filter(n=>n.startsWith('admission-'))){const path=join(directory(id),name,'execution.json');records.push({path,hash:fileHash(path)});const execution=JSON.parse(readFileSync(path,'utf8'));if(typeof execution.result.environment.observationPath==='string'){const observation=execution.result.environment.observationPath;records.push({path:observation,hash:fileHash(observation)});}}
   for(const name of ['author-proposal.json','reference-proposal.json']){const path=join(directory(id),name);try{records.push({path,hash:fileHash(path)});}catch{}}
   saveLedger(id,{...ledger(id),admissionRecords:records});review.hash=verifyHash({input,claims:review.claims,manifest:review.manifest,evaluatorHash:review.evaluatorHash});writeFileSync(join(directory(id),'review.json'),canonicalContractJson(review),{flag:'wx',mode:0o400});update(id,'REVIEW',review,null);
  });return view(id);
 };
 const approve=(id:string,reviewHash:unknown):VerifyView=>{
  if(closed)throw new SpecError('VERIFY_UNAVAILABLE','Verifier is closed.');const request=view(id);if(request.protocolVersion!==2)throw new SpecError('LEGACY_VERIFY_REVIEW','Create a v2 verification request; legacy evidence is not re-admitted.');
  if(typeof reviewHash!=='string'||request.review?.hash!==reviewHash)throw new SpecError('STALE_VERIFY_REVIEW','Approve the exact oracle review.');if(request.abandonedAt)throw new SpecError('VERIFY_CANCELLED','Verification was abandoned.');
  if(request.result?.status==='STALE'||db.prepare("SELECT id FROM verify_only_runs WHERE json_extract(ledger_json,'$.cleanupUncertain')=1").get())throw new SpecError('VERIFY_RECONCILE_REQUIRED','Changed evidence or uncertain cleanup prevents execution.');
  if(request.approvedAt)return request;if(request.state!=='REVIEW')throw new SpecError('VERIFY_NOT_REVIEWABLE','Oracle review is not ready.');
  if(request.review.evaluatorHash!==evaluatorBundle().hash||verifyHash({input:request.input,claims:request.review.claims,manifest:request.review.manifest,evaluatorHash:request.review.evaluatorHash})!==reviewHash||recipe(request.input,request.review)!==ledger(id).recipeHash)throw new SpecError('VERIFY_IDENTITY_CHANGED','Oracle content changed.');
  db.prepare("UPDATE verify_only_runs SET state='VERIFYING',approved_at=? WHERE id=? AND state='REVIEW' AND approved_at IS NULL").run(new Date().toISOString(),id);
  launch(id,async signal=>{
   const input=request.input,review=request.review!,dir=directory(id);check(id,signal);
   const canonical=await validateRepository(input.repoRoot,config.projectRoots,logger);if(canonical.repoRoot!==input.repoRoot)throw Error('Source identity changed');
   const exportPath=join(dir,'candidate-export'),revision=await scopedRevision(input,input.candidateCommit);await verifyStep('Candidate export',60000,signal,()=>materializeOracleTree(input.repoRoot,revision,exportPath));check(id,signal);
   const overlayPath=join(dir,'base-test-overlay');mkdirSync(overlayPath);const baseRevision=await scopedRevision(input,input.baseCommit);await restoreBaseTests(input.repoRoot,baseRevision,overlayPath);
   const workspace=join(dir,'executed-tree');cpSync(exportPath,workspace,{recursive:true});const restored=await restoreBaseTests(input.repoRoot,baseRevision,workspace);check(id,signal);
   const trustedLinks:Record<string,string>={};if(review.manifest?.runner==='vitest'&&review.manifest.dependencyRoot){const relative=input.runnerDirectory+'/node_modules';trustedLinks[relative]=realpathSync(review.manifest.dependencyRoot);symlinkSync(trustedLinks[relative]!,join(workspace,relative));}
   const e:VerifyEvidence={candidateExport:{path:exportPath,hash:verifyTreeHash(exportPath),sourceTree:input.candidateTree},overlay:{path:overlayPath,hash:verifyTreeHash(overlayPath),...restored},executionTree:{path:workspace,hash:verifyTreeHash(workspace,trustedLinks),trustedLinks},recipeHash:ledger(id).recipeHash!,requiredChecksHash:ledger(id).requiredChecksHash!,inputHash:verifyHash(input),executedChecks:[],records:[...(ledger(id).admissionRecords??[])],hash:''};
   writeFileSync(join(dir,'candidate-export.json'),canonicalContractJson(e.candidateExport),{flag:'wx',mode:0o400});writeFileSync(join(dir,'restored-test-overlay.json'),canonicalContractJson(e.overlay),{flag:'wx',mode:0o400});
   const warnings=[...await dependencyChanges(input.repoRoot,input.baseCommit,input.candidateCommit),...await reviewTripwire(input.repoRoot,input.baseCommit,input.candidateCommit)];
   const changed=(await safeBuildGit(input.repoRoot,['diff','--name-only',input.baseCommit,input.candidateCommit],262144)).toString().trim().split('\n').filter(Boolean),results:VerifyClaimResult[]=[];
   for(const c of review.claims){check(id,signal);if(verifyTreeHash(workspace,trustedLinks)!==e.executionTree.hash)throw new SpecError('VERIFY_STALE_EXECUTION','Composed execution source changed.');if(!c.test||c.admission!=='ADMITTED'){results.push({id:c.id,requirement:c.requirement,status:c.admissionEvidence?.correct==='ERROR'||c.admissionEvidence?.base.includes('ERROR')?'ERROR':'NOT CHECKED',reason:c.reason??'No admitted executable check.'});continue;}if(warnings.length){results.push({id:c.id,requirement:c.requirement,status:'NOT CHECKED',reason:'Dependency change or security review flag requires human review.'});continue;}
    const test=executionTest(c.test,workspace,review.manifest!,changed),result=await verifyStep('Candidate check '+c.id,180000,signal,s=>execute(review.manifest!,test,workspace,dir,s));if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length)throw Error('Owned cleanup not certified');check(id,signal);const path=join(dir,'candidate-'+c.id+'.json');writeFileSync(path,canonicalContractJson({test,result}),{flag:'wx',mode:0o600});e.executedChecks.push({id:c.id,path,hash:fileHash(path)});if(typeof result.environment.observationPath==='string')e.records.push({path:result.environment.observationPath,hash:fileHash(result.environment.observationPath)});results.push({id:c.id,requirement:c.requirement,status:executionStatus(result),reason:executionStatus(result)==='ERROR'?'Tester/environment failed; no code failure inferred.':null});saveLedger(id,{...ledger(id),partial:results});if(!result.cleanup.verified||result.cleanup.ambiguous)throw Error('Owned cleanup not certified');
   }
   for(const name of ['review.json','frozen-before-checks.json','candidate-export.json','restored-test-overlay.json'])e.records.push({path:join(dir,name),hash:fileHash(join(dir,name))});
   if(verifyTreeHash(workspace,trustedLinks)!==e.executionTree.hash)throw new SpecError('VERIFY_STALE_EXECUTION','Execution tree changed');e.hash=verifyHash(e);const result=scoreVerifyOnly(results,e);writeFileSync(join(dir,'result.json'),canonicalContractJson(result),{flag:'wx',mode:0o400});saveLedger(id,{...ledger(id),resultHash:verifyHash(result)});update(id,'RESULT',review,result);
  });return view(id);
 };
 const abandon=async(id:string):Promise<VerifyView>=>{const current=view(id);if(current.abandonedAt)return current;saveLedger(id,{...ledger(id),abandonedAt:new Date().toISOString()});operations.get(id)?.controller.abort();await operations.get(id)?.promise;const after=view(id);if(!after.result){const result=scoreVerifyOnly(after.review?.claims.map(c=>({id:c.id,requirement:c.requirement,status:'CANCELLED',reason:'Verification abandoned.'}))??[]);result.status='CANCELLED';update(id,'RESULT',after.review,result);}return view(id);};
 const waive=(id:string,body:unknown):VerifyView=>{const current=view(id);if(!current.result?.evidence||current.result.status==='STALE'||current.abandonedAt)throw new SpecError('VERIFY_NOT_WAIVABLE','Only current bound evidence can be waived.');const b=body as {reviewHash?:unknown;reason?:unknown;claimIds?:unknown};const failed=current.result.claims.filter(c=>c.requirement==='REQUIRED'&&c.status!=='PASS').map(c=>c.id).sort();if(!b||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>2000||b.reviewHash!==current.review?.hash||!Array.isArray(b.claimIds)||canonicalContractJson([...b.claimIds].sort())!==canonicalContractJson(failed)||!failed.length)throw new SpecError('INVALID_VERIFY_WAIVER','Name every unmet REQUIRED claim and give an explicit reason.',400);const l=ledger(id);if(l.waiver)return view(id);saveLedger(id,{...l,waiver:{kind:'ACCEPT_WITH_WAIVER',actor:'human',at:new Date().toISOString(),reason:b.reason,claimIds:failed,evidenceHash:current.result.evidence.hash}});return view(id);};
 const close=async()=>{closed=true;for(const o of operations.values())o.controller.abort();await Promise.all([...operations.values()].map(o=>o.promise));if(db.isOpen&&db.prepare("SELECT id FROM verify_only_runs WHERE json_extract(ledger_json,'$.cleanupUncertain')=1").get())throw new SpecError('VERIFY_RECONCILE_REQUIRED','Owned cleanup remains uncertain.');};
 db.prepare("UPDATE verify_only_runs SET state='ERROR',error='Coordinator restarted; no authoring or execution was replayed.' WHERE state IN('AUTHORING','VERIFYING')").run();
 return {create,view,approve,abandon,waive,close,list:()=>db.prepare('SELECT id FROM verify_only_runs ORDER BY created_at DESC,id').all().map(r=>view(String(r.id))),wait:async(id:string)=>{await operations.get(id)?.promise;return view(id);}};
}
