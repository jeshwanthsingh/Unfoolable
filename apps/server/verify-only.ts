import {evaluatorBundle} from './verification-executor.ts';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,realpathSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateRepository} from './repository.ts';
import {safeBuildGit} from './build-workspace.ts';
import {canonicalContractJson} from './contract-store.ts';
import {materializeOracleTree,restoreBaseTests,dependencyChanges,reviewTripwire} from './oracle-tree.ts';
import {executeOracleTest,type OracleExecution} from './oracle-execution.ts';
import {authorVerifyOnly} from './verify-only-author.ts';
import {SpecError} from './spec-errors.ts';
import type {Logger} from './log.ts';
import type {VerifyInput,VerifyBinding,VerifyView,VerifyReview,VerifyResult} from '../../packages/shared/verify-only.ts';
const hash=(v:unknown)=>createHash('sha256').update(canonicalContractJson(v)).digest('hex');
const clean=(e:OracleExecution)=>e.cleanup.verified&&!e.cleanup.ambiguous&&!e.cleanup.remaining.length&&!e.truncated;
export function scoreVerifyOnly(claims:VerifyResult['claims']):VerifyResult{
 const automated=claims.filter(c=>!['HUMAN / NOT CHECKED','REJECTED'].includes(c.status));
 const automatedStatus=automated.some(c=>c.status==='FAIL')?'FAIL':automated.some(c=>c.status!=='PASS')?'INCONCLUSIVE':automated.length?'PASS':'NOT CHECKED';
 return {status:automatedStatus==='FAIL'?'FAIL':automatedStatus==='INCONCLUSIVE'?'INCONCLUSIVE':claims.some(c=>['HUMAN / NOT CHECKED','REJECTED'].includes(c.status))?(automated.length?'PARTIAL':'NOT CHECKED'):automatedStatus,automatedStatus,claims};
}
type Author=typeof authorVerifyOnly;
type Execute=typeof executeOracleTest;
export function createVerifyOnly(db:DatabaseSync,config:{dataDir:string;projectRoots:readonly string[]},logger:Logger,author:Author=authorVerifyOnly,execute:Execute=executeOracleTest){
 let closed=false;const operations=new Map<string,{controller:AbortController;promise:Promise<void>}>();
 const view=(id:string):VerifyView=>{const r=db.prepare('SELECT * FROM verify_only_runs WHERE id=?').get(id);if(!r)throw new SpecError('VERIFY_NOT_FOUND','Verification request not found.',404);return {id,state:r.state as VerifyView['state'],input:JSON.parse(String(r.input_json)),review:r.review_json?JSON.parse(String(r.review_json)):null,result:r.result_json?JSON.parse(String(r.result_json)):null,error:r.error as string|null,approvedAt:r.approved_at as string|null};};
 const directory=(id:string)=>join(realpathSync(config.dataDir),'verify-only',id);
 const update=(id:string,state:VerifyView['state'],review:VerifyReview|null,result:VerifyResult|null,error:string|null=null)=>db.prepare('UPDATE verify_only_runs SET state=?,review_json=?,result_json=?,error=? WHERE id=?').run(state,review?canonicalContractJson(review):null,result?canonicalContractJson(result):null,error,id);
 const launch=(id:string,job:(signal:AbortSignal)=>Promise<void>)=>{const controller=new AbortController();const promise=Promise.resolve().then(()=>job(controller.signal)).catch(e=>{const current=view(id);update(id,'ERROR',current.review,null,e instanceof SpecError?e.message:'Verification could not complete. Inspect the retained evidence.');logger({event:'verify_only.failed',code:e instanceof SpecError?e.code:'VERIFY_FAILED'});}).finally(()=>operations.delete(id));operations.set(id,{controller,promise});};
 const resolve=async(root:string,ref:unknown)=>{if(typeof ref!=='string'||!ref||ref.length>200||ref.startsWith('-')||/[\x00-\x20]/.test(ref))throw new SpecError('INVALID_REF','Supply a local commit ref.',400);try{return (await safeBuildGit(root,['rev-parse','--verify',ref+'^{commit}'],1000)).toString().trim();}catch{throw new SpecError('INVALID_REF','That local commit is unavailable.',422);}};
 const materialize=async(input:VerifyBinding,which:'base'|'candidate',path:string)=>{const commit=which==='base'?input.baseCommit:input.candidateCommit;const tree=input.runnerDirectory!=='sdk/python'?commit:(await safeBuildGit(input.repoRoot,['rev-parse',commit+':'+input.runnerDirectory],1000)).toString().trim();await materializeOracleTree(input.repoRoot,tree,path);return tree;};
 const create=async(body:unknown):Promise<VerifyView>=>{
  if(closed)throw new SpecError('VERIFY_UNAVAILABLE','Verifier is closed.');
  if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='baseRef,candidateRef,intent,repoPath')throw new SpecError('INVALID_VERIFY_INPUT','Provide repo, BASE, Candidate ref and intent.',400);
  const b=body as VerifyInput;if(typeof b.intent!=='string'||!b.intent.trim()||Buffer.byteLength(b.intent)>16000)throw new SpecError('INVALID_VERIFY_INPUT','Supply bounded original intent.',400);
  const repo=await validateRepository(b.repoPath,config.projectRoots,logger),baseCommit=await resolve(repo.repoRoot,b.baseRef),candidateCommit=await resolve(repo.repoRoot,b.candidateRef),id=randomUUID();
  const input:VerifyBinding={...b,repoRoot:repo.repoRoot,baseCommit,candidateCommit,baseTree:(await safeBuildGit(repo.repoRoot,['rev-parse',baseCommit+'^{tree}'],1000)).toString().trim(),candidateTree:(await safeBuildGit(repo.repoRoot,['rev-parse',candidateCommit+'^{tree}'],1000)).toString().trim(),runnerDirectory:'.'};
  db.prepare("INSERT INTO verify_only_runs(id,input_json,state,created_at) VALUES(?,?,'AUTHORING',?)").run(id,canonicalContractJson(input),new Date().toISOString());mkdirSync(directory(id),{recursive:true,mode:0o700});
  launch(id,async signal=>{
   const proposal=await author(input,id,directory(id),signal);if(signal.aborted)throw Error('Interrupted');input.runnerDirectory=proposal.runnerDirectory;
   db.prepare('UPDATE verify_only_runs SET input_json=? WHERE id=?').run(canonicalContractJson(input),id);
   const base=join(directory(id),'base');if(proposal.manifest)await materialize(input,'base',base);
   for(const c of proposal.claims){if(!c.test)continue;const result=await execute(proposal.manifest!,c.test,base,directory(id),signal);writeFileSync(join(directory(id),'base-'+c.id+'.json'),canonicalContractJson(result),{flag:'wx',mode:0o600});c.baseResult=result.status;c.admission=clean(result)&&result.status===(c.classification==='CHANGE'?'FAIL':'PASS')?'ADMITTED':'REJECTED';c.reason=c.admission==='ADMITTED'?null:'Red-on-base admission did not establish the required result.';if(!result.cleanup.verified)throw Error('Owned cleanup not certified');}
   const review={hash:'',evaluatorHash:evaluatorBundle().hash,claims:proposal.claims,manifest:proposal.manifest};review.hash=hash({input,claims:review.claims,manifest:review.manifest,evaluatorHash:review.evaluatorHash});writeFileSync(join(directory(id),'review.json'),canonicalContractJson(review),{flag:'wx',mode:0o400});update(id,'REVIEW',review,null);
  });return view(id);
 };
 const approve=(id:string,reviewHash:unknown):VerifyView=>{
  if(closed)throw new SpecError('VERIFY_UNAVAILABLE','Verifier is closed.');const request=view(id);if(typeof reviewHash!=='string'||request.review?.hash!==reviewHash)throw new SpecError('STALE_VERIFY_REVIEW','Approve the exact oracle review.');
  if(request.approvedAt)return request;if(request.state!=='REVIEW')throw new SpecError('VERIFY_NOT_REVIEWABLE','Oracle review is not ready.');
  if(request.review.evaluatorHash!==evaluatorBundle().hash||hash({input:request.input,claims:request.review.claims,manifest:request.review.manifest,evaluatorHash:request.review.evaluatorHash})!==reviewHash)throw new SpecError('VERIFY_IDENTITY_CHANGED','Oracle content changed.');
  db.prepare("UPDATE verify_only_runs SET state='VERIFYING',approved_at=? WHERE id=? AND state='REVIEW' AND approved_at IS NULL").run(new Date().toISOString(),id);
  launch(id,async signal=>{
   const input=request.input,review=request.review!;const canonical=await validateRepository(input.repoRoot,config.projectRoots,logger);if(canonical.repoRoot!==input.repoRoot)throw Error('Source identity changed');
   if(!review.manifest){update(id,'RESULT',review,scoreVerifyOnly(review.claims.map(c=>({id:c.id,status:'HUMAN / NOT CHECKED',reason:c.reason}))));return;}
   const workspace=join(directory(id),'candidate');await materialize(input,'candidate',workspace);
   const baseline=input.runnerDirectory!=='sdk/python'?input.baseCommit:(await safeBuildGit(input.repoRoot,['rev-parse',input.baseCommit+':'+input.runnerDirectory],1000)).toString().trim();await restoreBaseTests(input.repoRoot,baseline,workspace);
   const warnings=[...await dependencyChanges(input.repoRoot,input.baseCommit,input.candidateTree),...await reviewTripwire(input.repoRoot,input.baseCommit,input.candidateTree)];
   const results:VerifyResult['claims']=[];
   for(const c of review.claims){if(c.mode==='HUMAN'){results.push({id:c.id,status:'HUMAN / NOT CHECKED',reason:c.reason});continue;}if(c.admission!=='ADMITTED'||!c.test){results.push({id:c.id,status:'REJECTED',reason:c.reason});continue;}if(warnings.length){results.push({id:c.id,status:'INCONCLUSIVE',reason:'Dependency change or security review flag needs human review.'});continue;}
    const result=await execute(review.manifest!,c.test,workspace,directory(id),signal);writeFileSync(join(directory(id),'candidate-'+c.id+'.json'),canonicalContractJson(result),{flag:'wx',mode:0o600});results.push({id:c.id,status:clean(result)?result.status:'INCONCLUSIVE',reason:clean(result)?null:'Uncertain cleanup or truncated evidence.'});if(!result.cleanup.verified)throw Error('Owned cleanup not certified');
   }
   update(id,'RESULT',review,scoreVerifyOnly(results));
  });return view(id);
 };
 const close=async()=>{closed=true;for(const o of operations.values())o.controller.abort();await Promise.all([...operations.values()].map(o=>o.promise));};
 // An interrupted author or verifier never auto-replays or asserts PASS on restart.
 db.prepare("UPDATE verify_only_runs SET state='ERROR',error='Coordinator restarted; no authoring or execution was replayed.' WHERE state IN('AUTHORING','VERIFYING')").run();
 return {create,view,approve,close,list:()=>db.prepare('SELECT id FROM verify_only_runs ORDER BY created_at DESC,id').all().map(row=>view(String(row.id))),wait:async(id:string)=>{await operations.get(id)?.promise;return view(id);}};
}
