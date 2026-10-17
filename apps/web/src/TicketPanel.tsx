import {IndependentTestWarnings} from './WriterWarning.tsx';
import {writerWarnings} from '../../../packages/shared/test-writer.ts';
import {isTestWriterEvidence,type TestWriterEvidence} from '../../../packages/shared/test-writer.ts';
import {TICKET_LIMITS} from '../../../packages/shared/ticket-budget.ts';
import {useEffect,useState} from 'react';
import {ticketStatuses,ticketCheckVerdicts,ticketEventKinds,type Ticket,type TicketEvent,type TicketCheckVerdict} from '../../../packages/shared/tickets.ts';
import type {ProjectPlaybook} from '../../../packages/shared/playbooks.ts';
import './ticket-panel.css';
import {confirmedDecision} from './human-confirmation-client.ts';
import {PasskeyPanel} from './PasskeyPanel.tsx';

const storageKey='cc-ticket-key';
export function bootstrapTicketOperator():string|null{
 const hash=new URLSearchParams(window.location.hash.slice(1));
 const supplied=hash.get('operator');
 if(hash.has('operator')){
  // Remove the capability before rendering or starting a request.
  window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
  if(supplied&&/^[a-f0-9]+$/i.test(supplied)){try{sessionStorage.setItem(storageKey,supplied);}catch{/* Keep the capability in memory when storage is unavailable. */}return supplied;}
  try{sessionStorage.removeItem(storageKey);}catch{/* Invalid input never grants access. */}
  return null;
 }
 try{const stored=sessionStorage.getItem(storageKey);return stored&&/^[a-f0-9]+$/i.test(stored)?stored:null;}catch{return null;}
}
type TicketStats={submitToReviewMs:number|null;agentWorkingMs:number;agentTimeIncomplete:boolean;needsYouStops:number;fixAttempts:number;finalVerdict:TicketCheckVerdict|null;decision:unknown};
type Summary={tickets:number;readyForReview:number;kept:number;discarded:number;agentWorkingMs:number;needsYouStops:number;fixAttempts:number};
type Detail={budget?:{limits:{maxCommands:number;maxMinutes:number;maxCodexTokens:number};commands:number;reportedCodexTokens:number|null};watchman?:{limit:number;blocked:{category:string;command:string;reason:string}[]};evidenceStale?:boolean;staleReason?:string|null;recheckAvailable?:boolean;keepAvailable?:boolean;ticket:Ticket;events:TicketEvent[];stats:TicketStats;check?:{testWriter?:TestWriterEvidence;verdict:TicketCheckVerdict;gaps:string[];failures:string[]};diffAvailable:boolean;playbook?:ProjectPlaybook};
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null;}
function strings(value:unknown):value is string[]{return Array.isArray(value)&&value.every(v=>typeof v==='string');}
function isTicket(value:unknown):value is Ticket{return record(value)&&typeof value.id==='string'&&typeof value.title==='string'&&typeof value.requestText==='string'&&typeof value.repoPath==='string'&&typeof value.baseCommit==='string'&&ticketStatuses.some(s=>s===value.status)&&typeof value.attemptCount==='number'&&strings(value.candidateCommits)&&(value.checkVerdict===null||ticketCheckVerdicts.some(v=>v===value.checkVerdict))&&typeof value.createdAt==='string'&&typeof value.updatedAt==='string';}
function isPlaybook(value:unknown):value is ProjectPlaybook{
 if(!record(value)||typeof value.repoRoot!=='string'||typeof value.baseCommit!=='string'||typeof value.hash!=='string'||typeof value.updatedAt!=='string'||!record(value.definition))return false;
 const definition=value.definition;
 const command=(input:unknown)=>record(input)&&strings(input.argv)&&typeof input.cwd==='string';
 return definition.version==='project-playbook-v1'&&(definition.setup===null||command(definition.setup))&&Array.isArray(definition.tests)&&definition.tests.every(command)&&record(definition.env)&&Object.values(definition.env).every(v=>typeof v==='string')&&['unittest','vitest','node-script'].some(v=>v===definition.runner)&&typeof definition.timeoutSeconds==='number'&&strings(definition.knownFailingTests)&&strings(definition.knownFlakyTests)&&strings(definition.notes)&&(value.approval===null||(record(value.approval)&&typeof value.approval.hash==='string'&&typeof value.approval.at==='string'));
}
function PlaybookProposal({playbook,busy,onApprove}:{playbook:ProjectPlaybook;busy:boolean;onApprove?:()=>void}){
 const approved=playbook.approval?.hash===playbook.hash;
 return <section aria-label="Project playbook"><h4>Project playbook · {approved?'Approved':'Approval required'}</h4>
 <p>{approved?'This exact playbook is approved. Checks still require BASE admission.':'Review these commands before allowing Command Center to use them. Approval resumes waiting tickets for this repository.'}</p>
 {playbook.definition.notes.map((note,index)=><p key={index}>{note}</p>)}
 <dl><dt>Runner</dt><dd>{playbook.definition.runner}</dd><dt>Timeout per command</dt><dd>{playbook.definition.timeoutSeconds} seconds</dd><dt>Setup</dt><dd>{playbook.definition.setup?<code>{JSON.stringify(playbook.definition.setup)}</code>:'None'}</dd><dt>Test commands</dt><dd><ul>{playbook.definition.tests.map((command,index)=><li key={index}><code>{command.report?command.argv[0]+' -e (protected check script; exact code in definition below)':JSON.stringify(command)}</code>{command.report&&<span> · Requires exactly {command.report.expectedTestIds.length} named checks.</span>}</li>)}</ul></dd><dt>Environment</dt><dd><pre>{JSON.stringify(playbook.definition.env,null,2)}</pre></dd><dt>Known failing tests</dt><dd>{playbook.definition.knownFailingTests.length?playbook.definition.knownFailingTests.join(', '):'None'}</dd><dt>Known flaky tests</dt><dd>{playbook.definition.knownFlakyTests.length?playbook.definition.knownFlakyTests.join(', '):'None'}</dd></dl>
 <details><summary>Playbook identity and definition</summary><p>Hash: <code>{playbook.hash}</code></p><p>BASE: <code>{playbook.baseCommit}</code></p><pre>{JSON.stringify(playbook.definition,null,2)}</pre></details>
 {!approved&&onApprove&&<button className="primary-button" disabled={busy} onClick={onApprove}>Approve project playbook</button>}</section>;
}
function validGuards(v:Record<string,unknown>){const b=v.budget,w=v.watchman;return (b===undefined||(record(b)&&record(b.limits)&&['maxCommands','maxMinutes','maxCodexTokens'].every(k=>typeof (b.limits as Record<string,unknown>)[k]==='number'&&Number.isFinite((b.limits as Record<string,unknown>)[k]))&&typeof b.commands==='number'&&(b.reportedCodexTokens===null||typeof b.reportedCodexTokens==='number')))&&(w===undefined||(record(w)&&typeof w.limit==='number'&&Array.isArray(w.blocked)&&w.blocked.every(a=>record(a)&&typeof a.category==='string'&&typeof a.command==='string'&&typeof a.reason==='string')));}
function isDetail(value:unknown):value is Detail{const check=record(value)?value.check:undefined;return record(value)&&validGuards(value)&&isTicket(value.ticket)&&Array.isArray(value.events)&&value.events.every(e=>record(e)&&typeof e.sequence==='number'&&typeof e.ticketId==='string'&&ticketEventKinds.some(k=>k===e.kind)&&record(e.data)&&typeof e.createdAt==='string')&&record(value.stats)&&typeof value.stats.agentWorkingMs==='number'&&typeof value.stats.agentTimeIncomplete==='boolean'&&(value.stats.submitToReviewMs===null||typeof value.stats.submitToReviewMs==='number')&&typeof value.stats.needsYouStops==='number'&&typeof value.stats.fixAttempts==='number'&&typeof value.diffAvailable==='boolean'&&(value.playbook===undefined||isPlaybook(value.playbook))&&(check===undefined||(record(check)&&ticketCheckVerdicts.some(v=>v===check.verdict)&&strings(check.gaps)&&strings(check.failures)&&(check.testWriter===undefined||isTestWriterEvidence(check.testWriter))));}
function isSummary(value:unknown):value is Summary{return record(value)&&['tickets','readyForReview','kept','discarded','agentWorkingMs','needsYouStops','fixAttempts'].every(k=>typeof value[k]==='number');}
async function request(key:string,path:string,signal?:AbortSignal,body?:unknown){
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'X-CC-Operator':key,...(body===undefined?{}:{'Content-Type':'application/json'})},cache:'no-store',...(signal?{signal}:{}),...(body===undefined?{}:{body:JSON.stringify(body)})});
 const value:unknown=await response.json();
 if(!response.ok)throw Error(record(value)&&record(value.error)&&typeof value.error.message==='string'?value.error.message:'Ticket request failed ('+response.status+').');
 return value;
}
function elapsed(ms:number|null){return ms===null?'Not recorded':(ms/1000).toFixed(1)+' s';}
export function TicketPanel(){
 const [key]=useState(bootstrapTicketOperator);
 const [selected,setSelected]=useState<string|null>(()=>new URLSearchParams(window.location.search).get('ticket'));
 const [tickets,setTickets]=useState<Ticket[]>([]),[summary,setSummary]=useState<Summary|null>(null),[detail,setDetail]=useState<Detail|null>(null);
 const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
 const candidateCommit=detail?.ticket.candidateCommits.at(-1);
 const diffAvailable=detail?.diffAvailable??false;
 const [diffRequested,setDiffRequested]=useState(false),[diff,setDiff]=useState<{text:string;url:string}|null>(null),[diffError,setDiffError]=useState<string|null>(null);
 useEffect(()=>{
  if(!key)return;
  const controller=new AbortController();let running=false;
  async function refresh(){if(running)return;running=true;try{
   const [list,stats]=await Promise.all([request(key!,'/api/tickets',controller.signal),request(key!,'/api/tickets/stats',controller.signal)]);
   if(!record(list)||!Array.isArray(list.tickets)||!list.tickets.every(isTicket)||!isSummary(stats))throw Error('Ticket list or summary response could not be confirmed.');
   if(!controller.signal.aborted){setTickets(list.tickets);setSummary(stats);}
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{running=false;if(!controller.signal.aborted)setLoading(false);}}
  void refresh();const timer=setInterval(()=>void refresh(),2000);return()=>{controller.abort();clearInterval(timer);};
 },[key,revision]);
 useEffect(()=>{
  setDetail(null);if(!key||!selected)return;
  const controller=new AbortController();let running=false;
  async function refresh(){if(running)return;running=true;try{const value=await request(key!,'/api/tickets/'+encodeURIComponent(selected!),controller.signal);if(!isDetail(value))throw Error('Ticket detail response could not be confirmed.');if(!controller.signal.aborted)setDetail(value);}catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{running=false;}}
  void refresh();const timer=setInterval(()=>void refresh(),2000);return()=>{controller.abort();clearInterval(timer);};
 },[key,selected,revision]);
 useEffect(()=>{
  setDiff(null);setDiffError(null);if(!key||!selected||!diffRequested||!diffAvailable||!candidateCommit)return;
  const controller=new AbortController();let url:string|undefined;
  void fetch('/api/tickets/'+encodeURIComponent(selected)+'/diff',{headers:{'X-CC-Operator':key},cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('Diff request failed ('+response.status+').');const text=await response.text();if(controller.signal.aborted)return;
   url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));setDiff({text,url});
  }).catch(e=>{if(!controller.signal.aborted)setDiffError((e as Error).message);});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[key,selected,diffRequested,revision,diffAvailable,candidateCommit]);
 function choose(id:string){setSelected(id);setDiffRequested(false);setError(null);const url=new URL(window.location.href);url.searchParams.set('ticket',id);window.history.replaceState(window.history.state,'',url.pathname+url.search);}
 async function action(kind:'keep'|'discard'|'retry'|'recheck'){
  if(!key||!detail||busy)return;setBusy(true);setError(null);
  try{await confirmedDecision(key,'/api/tickets/'+encodeURIComponent(detail.ticket.id)+'/'+kind,kind==='keep'||kind==='recheck'?{candidateCommit:detail.ticket.candidateCommits.at(-1)}:{});setRevision(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function approvePlaybook(){
  if(!key||!detail?.playbook||busy)return;setBusy(true);setError(null);
  try{await confirmedDecision(key,'/api/playbooks/approve',{repoPath:detail.playbook.repoRoot,expectedHash:detail.playbook.hash});setRevision(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!key)return <section className="ticket-panel"><h2>Tickets</h2><p>Open this view with <code>./cc ticket show &lt;id&gt; --open</code>.</p></section>;
 return <section className="ticket-panel"><header><h2>Tickets</h2><p>Submit a local engineering request. Review the recorded candidate, checks, and decisions.</p></header>
 <PasskeyPanel operatorKey={key}/>{error&&<p role="alert" className="form-error">{error}</p>}
 {summary&&<section aria-label="Ticket summary" className="ticket-stats"><span>Tickets: {summary.tickets}</span><span>Reached review: {summary.readyForReview}</span><span>Kept: {summary.kept}</span><span>Discarded: {summary.discarded}</span><span>Agent work: {elapsed(summary.agentWorkingMs)}</span><span>Needs-you stops: {summary.needsYouStops}</span><span>Fix attempts: {summary.fixAttempts}</span></section>}
 <details><summary>New ticket</summary><form onSubmit={event=>{
  event.preventDefault();if(busy)return;const form=event.currentTarget,data=new FormData(form);setBusy(true);setError(null);
  void request(key,'/api/tickets',undefined,{requestText:data.get('requestText'),repoPath:data.get('repoPath'),...(data.get('title')?{title:data.get('title')}:{})}).then(value=>{
   const ticket=isTicket(value)?value:record(value)&&isTicket(value.ticket)?value.ticket:null;if(!ticket)throw Error('Created ticket response could not be confirmed.');choose(ticket.id);form.reset();setRevision(n=>n+1);
  }).catch(e=>setError(e.message)).finally(()=>setBusy(false));
 }}><label>Title (optional)<input name="title" maxLength={200}/></label><label>Repository path<input name="repoPath" required/></label><label>Request<textarea name="requestText" required maxLength={16000} rows={5}/></label><button className="primary-button" disabled={busy}>Submit ticket</button></form></details>
 <div className="ticket-columns"><nav aria-label="Ticket list">{loading&&<p>Loading tickets…</p>}{!loading&&!tickets.length&&<p>No tickets recorded.</p>}{tickets.map(ticket=><button key={ticket.id} onClick={()=>choose(ticket.id)} aria-current={selected===ticket.id?'page':undefined}><strong>{ticket.title}</strong><span>{ticket.status}</span><small>Limits: {TICKET_LIMITS.maxCommands} commands · {TICKET_LIMITS.maxMinutes} min · {TICKET_LIMITS.maxCodexTokens.toLocaleString()} tokens</small><time dateTime={ticket.updatedAt}>{ticket.updatedAt}</time></button>)}</nav>
 <article aria-label="Ticket detail">{!selected&&<p>Select a ticket to inspect its recorded evidence.</p>}{selected&&!detail&&<p>Loading ticket detail…</p>}{detail&&<>
 <h3>{detail.ticket.title}</h3><p><strong>{detail.ticket.status}</strong> · Attempt {detail.ticket.attemptCount}</p><blockquote className="original-intent">{detail.ticket.requestText}</blockquote><p>Repository: <code>{detail.ticket.repoPath}</code></p><p>BASE: <code>{detail.ticket.baseCommit}</code></p><p>Candidate: <code>{detail.ticket.candidateCommits.at(-1)??'Not recorded'}</code></p>
 {detail.ticket.status==='needs_you'&&detail.events.filter(e=>e.kind==='needs_you').at(-1)?.data.kind==='TRIPWIRE'&&<p role="alert"><strong>TRIPWIRE — stopped</strong> · {String(detail.events.filter(e=>e.kind==='needs_you').at(-1)?.data.reason)}</p>}
 {detail.budget&&<section aria-label="Action budget"><p>Budget: {detail.budget.commands}/{detail.budget.limits.maxCommands} commands · {detail.budget.limits.maxMinutes} active minutes · {detail.budget.reportedCodexTokens??'usage unknown'}/{detail.budget.limits.maxCodexTokens} reported Codex tokens</p></section>}
 {detail.check?.testWriter&&<section aria-label="Independent Test Writer"><h4>Independent Test Writer</h4>{detail.check.testWriter.advisoryOnly&&<p>Advisory only — these tests never change the verdict.</p>}<p>{detail.check.testWriter.checks.filter(c=>c.status==='ADMITTED').length}/{detail.check.testWriter.checks.length} focused tests admitted · {detail.check.testWriter.coverage==='FULL'?'Admitted checks executed all measured changed lines':'Coverage incomplete'}</p><p>Changed lines covered: {detail.check.testWriter.lineCoverage?.percent!==null&&detail.check.testWriter.lineCoverage?.percent!==undefined?detail.check.testWriter.lineCoverage.percent.toFixed(1)+'% ('+detail.check.testWriter.lineCoverage.coveredLines+'/'+detail.check.testWriter.lineCoverage.changedLines+')':'unknown — no complete measurement'}</p>{detail.check.testWriter.mutation&&<p>Mutation score: {detail.check.testWriter.mutation.score===null?'unknown':detail.check.testWriter.mutation.score.toFixed(1)+'%'} · {detail.check.testWriter.mutation.killed}/{detail.check.testWriter.mutation.tested} killed{detail.check.testWriter.mutation.sampled?' (sampled; advisory only)':' (advisory only)'}{detail.check.testWriter.mutation.reason?' · '+detail.check.testWriter.mutation.reason:''}</p>}<p>Codex cost: {detail.check.testWriter.usage?detail.check.testWriter.usage.totalTokens.toLocaleString()+' reported tokens':detail.check.testWriter.started?'usage unknown':'no session started'}</p>{detail.check.testWriter.reason&&<p>{detail.check.testWriter.reason}</p>}<ul>{detail.check.testWriter.checks.map(c=><li key={c.id}><strong>{c.testName||c.id}</strong> · {c.summary}<p>{c.status==='ADMITTED'?'Admitted: assertion failure on BASE and passing checks on this Candidate.':c.reason??'Not admitted.'}</p></li>)}</ul></section>}
 {detail.watchman&&<section aria-label="Watchman"><p>Watchman: {detail.watchman.blocked.length} blocked tool commands · pause above {detail.watchman.limit}</p>{detail.watchman.blocked.length>0&&<details><summary>What was blocked</summary><ol>{detail.watchman.blocked.map((a,i)=><li key={i}>{a.reason} <code>{a.command}</code></li>)}</ol></details>}</section>}
 {detail.playbook&&<PlaybookProposal playbook={detail.playbook} busy={busy} {...(detail.ticket.status==='needs_you'?{onApprove:()=>void approvePlaybook()}:{})}/>}
 <h4>{detail.check?.verdict??detail.ticket.checkVerdict??'NOT CHECKED'}</h4>{detail.check?.gaps.map((gap,i)=><p key={i}>GAP: {gap}</p>)}{detail.check?.failures.map((failure,i)=><p key={i}>FAILURE: {failure}</p>)}
 <dl className="ticket-stats"><div><dt>Submit to review</dt><dd>{elapsed(detail.stats.submitToReviewMs)}</dd></div><div><dt>Agent work</dt><dd>{elapsed(detail.stats.agentWorkingMs)}{detail.stats.agentTimeIncomplete?' (incomplete)':''}</dd></div><div><dt>Needs-you stops</dt><dd>{detail.stats.needsYouStops}</dd></div><div><dt>Fix attempts</dt><dd>{detail.stats.fixAttempts}</dd></div></dl>
 {detail.diffAvailable&&<button className="secondary-button" disabled={diffRequested} onClick={()=>setDiffRequested(true)}>{diffRequested&&!diff?'Loading diff…':'Inspect diff'}</button>}{diffError&&<p role="alert">{diffError}</p>}{diff&&<details open><summary>Candidate diff</summary><a href={diff.url} download={detail.ticket.id+'.diff'}>Download diff</a><pre>{diff.text}</pre></details>}
 {detail.evidenceStale&&<p role="status">Checks are stale: {detail.staleReason}</p>}{detail.recheckAvailable&&<button className="secondary-button" disabled={busy} onClick={()=>void action('recheck')}>Recheck</button>}
 <IndependentTestWarnings warnings={writerWarnings(detail.check?.testWriter)}/>{detail.ticket.status==='ready_for_review'&&<div className="ticket-actions"><button className="primary-button" disabled={busy||detail.evidenceStale||detail.keepAvailable===false||!detail.ticket.candidateCommits.length} onClick={()=>void action('keep')}>Keep candidate</button><button className="secondary-button" disabled={busy} onClick={()=>void action('discard')}>Discard candidate</button></div>}
 {['needs_you','interrupted','harness_error'].includes(detail.ticket.status)&&!(detail.ticket.status==='needs_you'&&detail.playbook?.approval?.hash!==detail.playbook?.hash)&&<button className="secondary-button" disabled={busy} onClick={()=>void action('retry')}>Retry ticket</button>}
 <h4>Events</h4><ol className="ticket-events">{detail.events.map(event=><li key={event.sequence}><time dateTime={event.createdAt}>{event.createdAt}</time> <strong>{event.kind}</strong><details><summary>Event details</summary><pre>{JSON.stringify(event.data,null,2)}</pre></details></li>)}</ol>
 </>}</article></div></section>;
}
