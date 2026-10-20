import {nightMorning} from './night-morning.ts';
import {NightPanel,NightSettings} from './NightPanel.tsx';
import {nextNightWindow} from '../../../packages/shared/night.ts';
import {bugWords} from '../../../packages/shared/bug.ts';
import {ReviewerNotes} from './ReviewerNotes.tsx';
import './office.css';
import {lazy,Suspense} from 'react';
const WorkshopView=lazy(()=>import('./WorkshopView.tsx').then(m=>({default:m.WorkshopView})));
import {readArchivedDrafts} from './draft-preferences.ts';
import {PhoneAlerts} from './PhoneAlerts.tsx';
import {phoneMode} from './phone-client.ts';
import {PhoneSettings} from './PhoneSettings.tsx';
import {reviewSentence} from './review-copy.ts';
import {deskGreeting} from './desk-greeting.ts';
import {UnfoolableDraftList} from './UnfoolableDraftList.tsx';
import {WatchWork} from './WatchWork.tsx';
import {LiveActivity} from './LiveActivity.tsx';
import {UnfoolableTasks} from './UnfoolableTasks.tsx';
import {wordPreview} from '../../../packages/shared/display-title.ts';
import {sendsRequest} from './request-input.ts';
import {connectionWords} from './connection-words.ts';
import {plainError} from './plain-error.ts';
import {useEffect,useRef,useState} from 'react';
import {bootstrapTicketOperator} from './TicketPanel.tsx';
import {confirmedDecision} from './human-confirmation-client.ts';
import {useUnfoolableData,localRequest} from './useUnfoolableData.ts';
import {awaySummary,currentResultDetail,latestCheckEvent,mayAccept,taskPresentation,words} from './unfoolable-model.ts';
import {Hallmark} from './Hallmark.tsx';
import {UnfoolableProof} from './UnfoolableProof.tsx';
import {UnfoolableDraft} from './UnfoolableDraft.tsx';
import type {Detail} from './TicketPanel.tsx';
import './unfoolable.css';
type Look='assay'|'compact'|'spacious';
function saved(key:string,fallback:string){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
export function UnfoolableApp({initialView='list'}:{initialView?:'list'|'workshop'}={}){
 const [screen,setScreen]=useState<'list'|'workshop'>(()=>new URLSearchParams(location.search).get('view')==='workshop'?'workshop':initialView);
 const [nightWindow,setNightWindow]=useState(nextNightWindow);
 const [pendingCancels,setPendingCancels]=useState<string[]>([]);
 const [key]=useState(bootstrapTicketOperator),[revision,setRevision]=useState(0),[text,setText]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState<string|null>(null),[settings,setSettings]=useState(false),[proof,setProof]=useState<string|null>(()=>new URLSearchParams(location.search).has('confirm')?'confirmation':new URLSearchParams(location.search).get('ticket'));
 const [appearance,setAppearance]=useState<'system'|'light'|'dark'>(()=>{const v=saved('unfool-theme','system');return v==='light'||v==='dark'?v:'system';}),[systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches),[look,setLook]=useState<Look>(()=>{const v=saved('unfool-look','assay');return v==='compact'||v==='spacious'?v:'assay';}),[sound,setSound]=useState(false),[clock,setClock]=useState(Date.now());
 const theme=appearance==='system'?(systemDark?'dark':'light'):appearance;
 const [watch,setWatch]=useState<string|null>(null);
 const pendingRequest=useRef(false);
 useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const change=()=>setSystemDark(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const data=useUnfoolableData(key,revision),ask=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const input=ask.current;if(input){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,240)+'px';}},[text]);
 const hasWorking=data.tickets.some(t=>['building','fixing'].includes(t.status));
 useEffect(()=>{document.documentElement.dataset.unfoolTheme=theme;document.documentElement.style.colorScheme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#FAFBFC':'#151719');try{localStorage.setItem('unfool-theme',appearance);localStorage.setItem('unfool-look',look);}catch{/* Preferences are optional. */}},[theme,look,appearance]);
 useEffect(()=>{if(!hasWorking)return;setClock(Date.now());const timer=setInterval(()=>{if(!document.hidden)setClock(Date.now());},60000);return()=>clearInterval(timer);},[hasWorking]);
 function showProof(id:string){setProof(id);const url=new URL(location.href);if(id!=='conversation'&&id!=='confirmation')url.searchParams.set('ticket',id);history.replaceState(history.state,'',url.pathname+url.search);}
 function closeProof(){setProof(null);const url=new URL(location.href);url.searchParams.delete('ticket');history.replaceState(history.state,'',url.pathname+url.search);}
 async function mutate(path:string,body:unknown,decision:boolean,success:string){if(!key||pendingRequest.current)return;pendingRequest.current=true;setBusy(true);setError(null);setNotice(decision?'Waiting for your confirmation...':'Sending...');try{await(decision?confirmedDecision(key,path,body):localRequest(key,path,body));setNotice(success);setRevision(v=>v+1);return true;}catch(cause){setNotice('');setError((cause as Error).message===plainError('OPERATOR_REQUIRED')?plainError('OPERATOR_REQUIRED'):decision?'Your choice could not be saved. Confirm it again.':"Your request couldn't be sent. Try again.");return false;}finally{pendingRequest.current=false;setBusy(false);}}
 function ticketAction(detail:Detail,kind:'keep'|'discard'|'recheck'|'retry'|'continue'){
  if(kind==='keep'&&(!mayAccept(detail)||data.error))return;
  void mutate('/api/tickets/'+encodeURIComponent(detail.ticket.id)+'/'+kind,kind==='keep'||kind==='recheck'?{candidateCommit:detail.ticket.candidateCommits.at(-1)}:{},true,kind==='keep'?'Accepted':kind==='discard'?'Rejected':kind==='recheck'?'Checking again.':'Starting again.');
 }
 useEffect(()=>{if(proof&&!['conversation','confirmation'].includes(proof))void data.loadDetail(proof).catch(()=>setError('The details could not open. Try again.'));},[proof,data.loadDetail,data.tickets.find(t=>t.id===proof)?.detailRevision??data.tickets.find(t=>t.id===proof)?.revision]);
 useEffect(()=>{if(!key||!data.chat)return;const ids=readArchivedDrafts(saved('unfool-archived-drafts','[]'));if(!ids.length)return;void (async()=>{for(let i=0;i<ids.length;i+=150)await localRequest(key,'/api/chat/archive',{action:'import-local',draftIds:ids.slice(i,i+150)});})().then(()=>{try{localStorage.removeItem('unfool-archived-drafts');}catch{/* The append-only server import is idempotent. */}}).catch(()=>{/* Retain the old preference for a later connection. */});},[key,data.chat]);
 const watched=data.tickets.find(t=>t.id===watch);
 useEffect(()=>{if(watch)void data.loadDetail(watch).catch(()=>setError('The steps could not open. Try again.'));},[watch,data.loadDetail,watched?.detailRevision]);
 const selected=proof?data.details[proof]:undefined;
 const drafts=data.chat?.drafts.filter(d=>['DRAFT','QUESTION','ERROR'].includes(d.status)&&!pendingCancels.includes(d.id)&&!data.chat?.night?.entries.some(e=>e.draftId===d.id&&['queued','running'].includes(e.status)))??[];
 const otherCards=data.chat?.cards.filter(c=>c.status==='PENDING'&&c.kind!=='ticket')??[];
 const offline=Boolean(data.error),greeting=nightMorning(data.chat?.night)??deskGreeting(data.tickets,drafts);
 return <div className="unfoolable" data-look={look} data-theme={theme} data-view={screen} data-offline={offline}>
 <a className="unfool-skip" href="#unfool-main">Skip to work</a><main id="unfool-main" className="unfool-column">
 {(!key||offline||data.backOnline)&&<aside className="unfool-connection" role="status"><p>{phoneMode()?(offline?"Can't reach your Mac right now.":'Back online.'):!key||data.error===plainError('OPERATOR_REQUIRED')?"Unfoolable can't start tasks right now. Run: unfool":connectionWords(offline,data.observedAt,data.backOnline)}</p>{(!key||offline)&&!phoneMode()&&<button onClick={()=>void navigator.clipboard.writeText('unfool').then(()=>setNotice('Copied')).catch(()=>setNotice('Type unfool in your terminal.'))}>Copy</button>}</aside>}
 <header className="unfool-header"><h1 className="unfool-wordmark"><span aria-hidden="true"><Hallmark mark="checked"/></span>Unfoolable</h1><button aria-expanded={settings} onClick={()=>setSettings(v=>!v)}>Settings</button></header>
 {settings&&<section className="unfool-settings" aria-label="Settings"><h2>Settings</h2><NightSettings window={nightWindow} onChange={setNightWindow}/><label><input type="checkbox" checked={data.chat?.night?.notifications??false} onChange={e=>{void mutate('/api/night/notifications',{enabled:e.target.checked},false,'Notification preference saved.');}}/>Notify me on this Mac when the shift ends</label><label>Appearance<select value={appearance} onChange={e=>setAppearance(e.target.value as 'system'|'light'|'dark')}><option value="system">Match my system</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Look<select value={look} onChange={e=>setLook(e.target.value as Look)}><option value="assay">Style 1</option><option value="compact">Style 2</option><option value="spacious">Style 3</option></select></label><label className="unfool-toggle"><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>Sound when a result arrives</label><button onClick={()=>showProof('confirmation')}>{phoneMode()?'Face ID settings':'Touch ID settings'}</button>{key&&<PhoneSettings operatorKey={key} revision={data.chat?.phoneRevision??0}/>}<PhoneAlerts/>{!phoneMode()&&<details><summary>More tools</summary><p>Other screens and past recordings.</p><a href="/?labs=1">All project tools</a><a href="/?labs=1&craft=instrument">Past recording 1</a><a href="/?labs=1&craft=glass">Past recording 2</a><a href="/?labs=1&craft=night">Past recording 3</a></details>}</section>}
 <nav className="office-tabs" aria-label="Views"><button aria-pressed={screen==='list'} onClick={()=>setScreen('list')}>List</button><button aria-pressed={screen==='workshop'} onClick={()=>setScreen('workshop')}>Workshop</button></nav>
 {screen==='workshop'&&<Suspense fallback={<p>Opening the Workshop…</p>}><WorkshopView tickets={data.tickets} details={data.details} loadDetail={data.loadDetail} onProof={showProof} onStop={()=>document.querySelector<HTMLButtonElement>('.unfool-stop')?.focus()} theme={theme} offline={offline}/></Suspense>}
 <div hidden={screen!=='list'}>
 <section className="unfool-greeting" aria-label="Your work now"><h2>{greeting.greeting}</h2><p role="status">{offline?"Offline. Showing your saved work.":data.loading?"Opening your work…":greeting.summary}</p></section>
 <form className="unfool-ask" onSubmit={event=>{event.preventDefault();if(!text.trim()){setNotice('Describe what you want to work on.');ask.current?.focus();return;}const submitted=text;void mutate('/api/chat/messages',{text:submitted},false,'Your request was sent.').then(ok=>{if(ok)setText(current=>current===submitted?'':current);});}}><label htmlFor="unfool-request">What should we work on?</label><div><textarea ref={ask} id="unfool-request" name="request" autoComplete="off" onKeyDown={event=>{if(sendsRequest(event.key,event.shiftKey,event.nativeEvent.isComposing)){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} rows={1} maxLength={16000} value={text} onChange={e=>setText(e.target.value)} placeholder="Describe a change..."/><button disabled={busy||!key||offline} aria-busy={busy}>{busy?'Sending...':'Ask'}</button></div></form>
 <p className="unfool-summary" hidden={!offline&&!data.loading}>{offline?'Your saved work will return when the connection recovers.':data.loading?'Opening your saved work…':awaySummary(data.tickets)}</p><div className="unfool-notice" role="status">{notice}</div>
 
 
 {data.chat?.notice&&<p className="unfool-error" role="alert">{data.chat.notice}</p>}
 {error&&<p role="alert" className="unfool-error">{error}<button onClick={()=>showProof(proof??'conversation')}>See the proof</button></p>}

 {otherCards.length>0&&<section className="unfool-attention"><h2>Needs you</h2><p>Needs your OK before continuing.</p><button onClick={()=>showProof('conversation')}>See the proof</button></section>}
 {proof&&!selected&&!['conversation','confirmation'].includes(proof)&&<p role="status">Opening the proof…</p>}
 {data.loading?<p role="status">Opening your work…</p>:!offline&&key&&!data.tickets.length&&!drafts.length?<section className="unfool-empty"><Hallmark mark="waiting"/><h2>{words.empty}</h2></section>:null}
 <NightPanel view={data.chat?.night} onProof={showProof}/><UnfoolableTasks tickets={data.tickets} afterNeedsYou={<UnfoolableDraftList drafts={drafts} archived={data.chat?.archivedDraftIds??[]} onArchive={(action,draftId)=>mutate('/api/chat/archive',{action,...(draftId?{draftId}:{})},false,action==='restore'?'Draft restored.':'Old drafts archived.').then(Boolean)} renderDraft={draft=><UnfoolableDraft key={draft.id} draft={draft} onTonight={()=>{void mutate('/api/night/drafts/'+draft.id+'/queue',nightWindow,true,'Queued for tonight.');}} onOpenExisting={showProof} busy={busy||offline} onAction={(action,fields)=>{if(action==='cancel'){setPendingCancels(v=>[...v,draft.id]);setNotice('Confirm cancellation with Touch ID.');}void mutate('/api/chat/drafts/'+encodeURIComponent(draft.id)+'/'+action,{version:draft.version,...fields},true,action==='start'?'Started':action==='edit'?'Saved':'Cancelled').then(ok=>{if(action==='cancel'&&!ok)setPendingCancels(v=>v.filter(id=>id!==draft.id));});}}/>}/>} renderTicket={(ticket,primary)=>{const detail=currentResultDetail(ticket,data.details[ticket.id]),state=taskPresentation(ticket,detail,clock),displayTitle=ticket.plainTitle??ticket.title,review=ticket.status==='ready_for_review',stuck=['needs_you','interrupted','harness_error'].includes(ticket.status),canRetry=stuck&&!(ticket.status==='needs_you'&&detail?.playbook?.approval?.hash!==detail?.playbook?.hash);
 return <li key={ticket.id} className="unfool-task" data-ticket-id={ticket.id} data-status={state.mark} data-attention={review||stuck} data-primary={primary}><span className="unfool-accept-flash" aria-hidden="true"/><Hallmark mark={state.mark} {...(state.tone?{tone:state.tone}:{})} event={Math.max(detail?latestCheckEvent(detail.events):0,ticket.checkSequence??0)} sound={sound} ready={!data.loading} progress={ticket.activity?.sequence??detail?.events.at(-1)?.sequence??ticket.revision}/><div className="unfool-task-body"><h2 tabIndex={0} title={displayTitle} aria-label={displayTitle}><span aria-hidden="true">{wordPreview(displayTitle)}</span><span aria-hidden="true" className="unfool-full-title">{displayTitle}</span></h2>{ticket.activity?<LiveActivity ticket={ticket}/>:<p className="unfool-status">{reviewSentence(state,review||stuck)}</p>}
 <>{ticket.summary.bug&&<p className="unfool-status" role="status">{bugWords[ticket.summary.bug]}</p>}</><ReviewerNotes compact panel={ticket.summary.reviewers??detail?.reviewers}/>{!detail&&ticket.summary?.budgetCanContinue&&<div className="unfool-actions"><button className="uf-primary" disabled={busy||offline} onClick={()=>void mutate('/api/tickets/'+encodeURIComponent(ticket.id)+'/continue',{},true,'Continuing with approved extra budget.')}>Give it more time</button><small>Uses a bit more of your Codex allowance. Needs {phoneMode()?'Face ID':'Touch ID'}.</small></div>}{!detail&&review&&<div className="unfool-actions"><button className="uf-primary" onClick={()=>showProof(ticket.id)}>Look at the changes</button></div>}{detail&&<div className="unfool-actions">{review&&(detail.evidenceStale&&detail.recheckAvailable?<button className="uf-primary" disabled={busy||offline} onClick={()=>ticketAction(detail,'recheck')}>Check again</button>:mayAccept(detail)?<button className="uf-primary" disabled={busy||offline} onClick={()=>ticketAction(detail,'keep')}>Accept</button>:<button className="uf-primary" onClick={()=>showProof(ticket.id)}>Look at the changes</button>)}{detail.budgetContinueAvailable&&<small>Uses a bit more of your Codex allowance. Needs {phoneMode()?'Face ID':'Touch ID'}.</small>}{detail.budgetContinueAvailable&&<button className="uf-primary" disabled={busy||offline} onClick={()=>ticketAction(detail,'continue')}>Give it more time</button>}{canRetry&&!detail.events.some(e=>e.kind==='needs_you'&&e.data.kind==='ACTION_BUDGET')&&<button className="uf-primary" disabled={busy||offline} onClick={()=>ticketAction(detail,'retry')}>Try again</button>}{(review||stuck)&&<button disabled={busy||offline} onClick={()=>ticketAction(detail,'discard')}>Reject</button>}</div>}
 {['building','fixing','checking'].includes(ticket.status)&&<button className="unfool-watch-link" onClick={()=>setWatch(ticket.id)}>Watch it work</button>}<button className="unfool-proof-link" onClick={()=>showProof(ticket.id)}>See the proof</button></div></li>;}}/>
 </div><footer className="unfool-footer"><button onClick={()=>showProof('conversation')}>Conversation</button><button className="unfool-stop" disabled={!key||busy} onClick={()=>void mutate('/api/stop-all',{},phoneMode(),'Stopped. Starting again needs your OK.')}>Stop all</button></footer>
 </main>{watched&&<WatchWork ticket={watched} {...(data.details[watched.id]?{detail:data.details[watched.id]}:{})} onClose={()=>setWatch(null)} onProof={()=>{setWatch(null);showProof(watched.id);}}/>}{proof&&key&&(selected||['conversation','confirmation'].includes(proof))&&<UnfoolableProof key={proof} {...(selected?{detail:selected}:{})} operatorKey={key} decisionPending={busy} {...(selected?{onDecision:(kind:'keep'|'discard'|'recheck'|'retry'|'continue')=>ticketAction(selected,kind)}:{})} {...(data.chat?{chatView:data.chat}:{})} theme={theme} onClose={closeProof} onRefresh={()=>{if(proof)void data.loadDetail(proof,true);}} confirmation={proof==='confirmation'} requestError={error}/>}
 </div>;
}
