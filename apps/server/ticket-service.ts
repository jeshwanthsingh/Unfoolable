import {randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
import type {AppConfig} from './config.ts';
import type {createVerifyOnly} from './verify-only.ts';
import {createTicketLoop,type TicketLoopDependencies} from './ticket-loop.ts';
import {createTicketQueue} from './ticket-queue.ts';
import {createTicketChecker} from './ticket-checker.ts';
import {createTicket,getTicket,listTickets,listTicketEvents,decideTicket} from './ticket-store.ts';
import {ticketStats,ticketStatsSummary} from './ticket-stats.ts';
import {validateRepository} from './repository.ts';
import {safeBuildGit} from './build-workspace.ts';
import {SpecError} from './spec-errors.ts';
export function createTicketService(db:DatabaseSync,config:AppConfig,verifier:ReturnType<typeof createVerifyOnly>,dependencies?:TicketLoopDependencies){
 mkdirSync(config.dataDir,{recursive:true,mode:0o700});const keyPath=join(config.dataDir,'ticket-operator.key');
 try{writeFileSync(keyPath,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
 chmodSync(keyPath,0o600);const key=readFileSync(keyPath,'utf8');if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid local operator capability');
 const loop=createTicketLoop(db,config.dataDir,dependencies??{check:createTicketChecker(db,verifier,config.projectRoots)}),queue=createTicketQueue(db,loop),deciding=new Set<string>();
 const ticket=(id:string)=>{const t=getTicket(db,id);if(!t)throw new SpecError('TICKET_NOT_FOUND','That ticket does not exist.',404);return t;};
 const candidate=(id:string)=>{const e=listTicketEvents(db,id).filter(e=>e.kind==='candidate_frozen').at(-1);return e?.data.candidate as {repo:string;commit:string;diffPath:string}|undefined;};
 function show(id:string){const t=ticket(id),events=listTicketEvents(db,id),check=events.filter(e=>e.kind==='check_result').at(-1)?.data;return {ticket:t,events,stats:ticketStats(db,id),...(check?{check}:{}),diffAvailable:!!candidate(id)};}
 async function create(body:Record<string,unknown>){if(Object.keys(body).some(k=>!['title','requestText','repoPath'].includes(k))||typeof body.requestText!=='string'||!body.requestText.trim()||body.requestText.length>65536||body.requestText.includes('\0')||body.title!==undefined&&(typeof body.title!=='string'||!body.title.trim()||body.title.length>200))throw new SpecError('INVALID_TICKET','Enter a request of 1–65,536 characters and a repository path.',400);
  const repo=await validateRepository(body.repoPath,config.projectRoots,()=>{});const t=createTicket(db,{title:typeof body.title==='string'?body.title:body.requestText.trim().split('\n')[0]!.slice(0,120),requestText:body.requestText,repoPath:repo.repoRoot,baseCommit:repo.registeredHead});queue.wake();return t;}
 async function decide(id:string,action:'keep'|'discard',expected?:unknown){if(deciding.has(id))throw new SpecError('DECISION_PENDING','A decision is already in progress.');deciding.add(id);try{const t=ticket(id);
  if(action==='discard'){if(!['queued','ready_for_review','needs_you','interrupted','harness_error'].includes(t.status))throw new SpecError('DECISION_UNAVAILABLE','Discard is unavailable while running or after a final decision.');return decideTicket(db,id,'discard');}
  const c=candidate(id);if(t.status!=='ready_for_review'||!c||expected!==t.candidateCommits.at(-1)||c.commit!==expected)throw new SpecError('STALE_CANDIDATE','Confirm the current review Candidate.');
  const check=listTicketEvents(db,id).filter(e=>e.kind==='check_result').at(-1)?.data;if(typeof check?.verificationId==='string'){const v=verifier.view(check.verificationId);if(v.result?.evidence?.hash!==check.evidenceHash||v.result?.status==='STALE')throw new SpecError('STALE_EVIDENCE','Check evidence changed; Keep is unavailable.');}
  const ref='refs/heads/cc/'+id;let existing='';try{existing=(await safeBuildGit(t.repoPath,['rev-parse','--verify',ref])).toString().trim();}catch{}
  if(existing&&existing!==c.commit)throw new SpecError('BRANCH_CONFLICT','The ticket branch already contains another commit.');
  if(!existing){await safeBuildGit(t.repoPath,['-c','protocol.file.allow=always','fetch','--no-tags','--no-write-fetch-head','--',c.repo,c.commit],1048576);await safeBuildGit(t.repoPath,['update-ref',ref,c.commit,'0'.repeat(c.commit.length)]);}
  return decideTicket(db,id,'keep',c.commit);
 }finally{deciding.delete(id);}}
 return {create,show,list:()=>({tickets:listTickets(db)}),stats:()=>ticketStatsSummary(db),decide,retry:queue.retry,recover:queue.recover,close:queue.close,idle:queue.idle,
  authorized:(value:unknown)=>typeof value==='string'&&value.length===key.length&&timingSafeEqual(Buffer.from(value),Buffer.from(key)),
  diff:(id:string)=>{ticket(id);const c=candidate(id);if(!c)throw new SpecError('NO_DIFF','No frozen Candidate exists.',404);return readFileSync(c.diffPath,'utf8');}};
}
