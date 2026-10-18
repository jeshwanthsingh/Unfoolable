import {useEffect,useRef,useState} from 'react';
import {bootstrapTicketOperator} from './TicketPanel.tsx';
import {confirmedDecision} from './human-confirmation-client.ts';
import {useUnfoolableData,localRequest} from './useUnfoolableData.ts';
import {awaySummary,latestCheckEvent,mayAccept,taskPresentation,words} from './unfoolable-model.ts';
import {Hallmark} from './Hallmark.tsx';
import {UnfoolableProof} from './UnfoolableProof.tsx';
import {UnfoolableDraft} from './UnfoolableDraft.tsx';
import type {Detail} from './TicketPanel.tsx';
import './unfoolable.css';
type Look='assay'|'compact'|'spacious';
function saved(key:string,fallback:string){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
export function UnfoolableApp(){
 const [key]=useState(bootstrapTicketOperator),[revision,setRevision]=useState(0),[text,setText]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState<string|null>(null),[settings,setSettings]=useState(false),[proof,setProof]=useState<string|null>(()=>new URLSearchParams(location.search).has('confirm')?'confirmation':new URLSearchParams(location.search).get('ticket'));
 const [theme,setTheme]=useState<'light'|'dark'>(()=>saved('unfool-theme','light')==='dark'?'dark':'light'),[look,setLook]=useState<Look>(()=>{const v=saved('unfool-look','assay');return v==='compact'||v==='spacious'?v:'assay';}),[sound,setSound]=useState(false),[clock,setClock]=useState(Date.now());
 const data=useUnfoolableData(key,revision),ask=useRef<HTMLTextAreaElement>(null);
 const hasWorking=data.tickets.some(t=>['building','fixing'].includes(t.status));
 useEffect(()=>{document.documentElement.dataset.unfoolTheme=theme;document.documentElement.style.colorScheme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#E8EBED':'#1A1E22');try{localStorage.setItem('unfool-theme',theme);localStorage.setItem('unfool-look',look);}catch{/* Preferences are optional. */}},[theme,look]);
 useEffect(()=>{if(!hasWorking)return;setClock(Date.now());const timer=setInterval(()=>{if(!document.hidden)setClock(Date.now());},60000);return()=>clearInterval(timer);},[hasWorking]);
 function showProof(id:string){setProof(id);const url=new URL(location.href);if(id!=='conversation'&&id!=='confirmation')url.searchParams.set('ticket',id);history.replaceState(history.state,'',url.pathname+url.search);}
 function closeProof(){setProof(null);const url=new URL(location.href);url.searchParams.delete('ticket');history.replaceState(history.state,'',url.pathname+url.search);}
 async function mutate(path:string,body:unknown,decision:boolean,success:string){if(!key||busy)return;setBusy(true);setError(null);setNotice('');try{await(decision?confirmedDecision(key,path,body):localRequest(key,path,body));setNotice(success);setRevision(v=>v+1);return true;}catch(cause){setError((cause as Error).message);return false;}finally{setBusy(false);}}
 function ticketAction(detail:Detail,kind:'keep'|'discard'|'recheck'|'retry'){
  if(kind==='keep'&&(!mayAccept(detail)||data.error))return;
  void mutate('/api/tickets/'+encodeURIComponent(detail.ticket.id)+'/'+kind,kind==='keep'||kind==='recheck'?{candidateCommit:detail.ticket.candidateCommits.at(-1)}:{},true,kind==='keep'?'Accepted':kind==='discard'?'Rejected':kind==='recheck'?'Checking again.':'Starting again.');
 }
 const selected=proof?data.details[proof]:undefined;
 const drafts=data.chat?.drafts.filter(d=>['DRAFT','QUESTION','ERROR'].includes(d.status))??[];
 const otherCards=data.chat?.cards.filter(c=>c.status==='PENDING'&&c.kind!=='ticket')??[];
 const offline=Boolean(data.error);
 return <div className="unfoolable" data-look={look} data-theme={theme}>
 <a className="unfool-skip" href="#unfool-main">Skip to work</a><main id="unfool-main" className="unfool-column">
 <header className="unfool-header"><div><h1>Unfoolable</h1><p>AI does the work. Nothing fools the check.</p></div><button aria-expanded={settings} onClick={()=>setSettings(v=>!v)}>Settings</button></header>
 {settings&&<section className="unfool-settings" aria-label="Settings"><h2>Settings</h2><label>Appearance<select value={theme} onChange={e=>setTheme(e.target.value==='dark'?'dark':'light')}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Look<select value={look} onChange={e=>setLook(e.target.value as Look)}><option value="assay">Assay</option><option value="compact">Compact</option><option value="spacious">Spacious</option></select></label><label className="unfool-toggle"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Sound when a result arrives</label><button onClick={()=>showProof('confirmation')}>Touch ID settings</button><details><summary>Labs: watch it work</summary><p>Technical views and historical replays.</p><a href="/?labs=1">Original working screens</a><a href="/?labs=1&craft=instrument">Instrument replay</a><a href="/?labs=1&craft=glass">Glass Studio replay</a><a href="/?labs=1&craft=night">Night Workshop replay</a></details></section>}
 <form className="unfool-ask" onSubmit={event=>{event.preventDefault();if(!text.trim()){setNotice('Describe what you want to work on.');ask.current?.focus();return;}const submitted=text;void mutate('/api/chat/messages',{text:submitted},false,'Your request was sent.').then(ok=>{if(ok)setText(current=>current===submitted?'':current);});}}><label htmlFor="unfool-request">What should we work on?</label><div><textarea ref={ask} id="unfool-request" name="request" autoComplete="off" rows={2} maxLength={16000} value={text} onChange={e=>setText(e.target.value)} placeholder="Describe a change, or ask what's happening…"/><button disabled={busy||!key||offline}>Ask</button></div></form>
 <p className="unfool-summary">{offline?'Your saved work will return when the connection recovers.':data.loading?'Opening your saved work…':awaySummary(data.tickets)}</p><div className="unfool-notice" role="status">{notice}</div>
 {!key&&<p>Open Unfoolable from your terminal to connect this private screen.</p>}
 {offline&&<p role="alert" className="unfool-error">{words.offline}<button onClick={()=>setRevision(v=>v+1)}>Try again</button></p>}
 {error&&<p role="alert" className="unfool-error">Your choice wasn't saved. Open Proof and try again.<button onClick={()=>showProof(proof??'conversation')}>See the proof</button></p>}
 {drafts.map(draft=><UnfoolableDraft key={draft.id+':'+draft.version} draft={draft} busy={busy||offline} onAction={(action,fields)=>void mutate('/api/chat/drafts/'+encodeURIComponent(draft.id)+'/'+action,{version:draft.version,...fields},true,action==='start'?'Started':action==='edit'?'Saved':'Cancelled')}/>)}
 {otherCards.length>0&&<section className="unfool-attention"><h2>Needs you</h2><p>Needs your OK before continuing.</p><button onClick={()=>showProof('conversation')}>See the proof</button></section>}
 {data.loading?<p role="status">Opening your work…</p>:!offline&&key&&!data.tickets.length&&!drafts.length?<section className="unfool-empty"><Hallmark mark="waiting"/><h2>{words.empty}</h2></section>:null}
 <ol className="unfool-tasks" aria-label="Your work">{data.tickets.map(ticket=>{const detail=data.details[ticket.id],state=taskPresentation(ticket,detail,clock),review=ticket.status==='ready_for_review',stuck=['needs_you','interrupted','harness_error','cancelled'].includes(ticket.status),canRetry=stuck&&!(ticket.status==='needs_you'&&detail?.playbook?.approval?.hash!==detail?.playbook?.hash);
 return <li key={ticket.id} className="unfool-task" data-status={state.mark}><Hallmark mark={state.mark} event={detail?latestCheckEvent(detail.events):0} sound={sound} ready={detail!==undefined} progress={detail?.events.at(-1)?.sequence??0}/><div className="unfool-task-body"><h2>{ticket.title}</h2><p className="unfool-status">{state.sentence}</p>
 {detail&&<div className="unfool-actions">{review&&(detail.evidenceStale&&detail.recheckAvailable?<button disabled={busy||offline} onClick={()=>ticketAction(detail,'recheck')}>Try again</button>:mayAccept(detail)?<button disabled={busy||offline} onClick={()=>ticketAction(detail,'keep')}>Accept</button>:<button onClick={()=>showProof(ticket.id)}>Look at the changes</button>)}{canRetry&&<button disabled={busy||offline} onClick={()=>ticketAction(detail,'retry')}>Try again</button>}{(review||stuck)&&<button disabled={busy||offline} onClick={()=>ticketAction(detail,'discard')}>Reject</button>}</div>}
 <button className="unfool-proof-link" onClick={()=>showProof(ticket.id)}>See the proof</button></div></li>;})}</ol>
 <footer className="unfool-footer"><button onClick={()=>showProof('conversation')}>Conversation</button><button className="unfool-stop" disabled={!key||busy} onClick={()=>void mutate('/api/stop-all',{},false,'Stopped. Starting again needs your OK.')}>Stop all</button></footer>
 </main>{proof&&key&&(selected||['conversation','confirmation'].includes(proof))&&<UnfoolableProof key={proof} {...(selected?{detail:selected}:{})} operatorKey={key} theme={theme} onClose={closeProof} onRefresh={()=>setRevision(v=>v+1)} confirmation={proof==='confirmation'} requestError={error}/>}
 </div>;
}
