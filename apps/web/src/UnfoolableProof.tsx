import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import type {Detail} from './TicketPanel.tsx';
import {TicketPanel} from './TicketPanel.tsx';
import {ChatPanel} from './ChatPanel.tsx';
import {PasskeyPanel} from './PasskeyPanel.tsx';
import {Hallmark} from './Hallmark.tsx';
import {proofLines} from './unfoolable-model.ts';
import {localRequest} from './useUnfoolableData.ts';
const FileDiff=lazy(()=>import('./FileDiff.tsx').then(m=>({default:m.FileDiff})));
export function UnfoolableProof({detail,operatorKey,theme,onClose,onRefresh,confirmation=false,requestError}:{requestError?:string|null;detail?:Detail;operatorKey:string;theme:'light'|'dark';onClose:()=>void;onRefresh:()=>void;confirmation?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),returnFocus=useRef<Element|null>(null),[file,setFile]=useState<{path:string;diff:string}|null>(null),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{returnFocus.current=document.activeElement;dialog.current?.showModal();return()=>{dialog.current?.close();if(returnFocus.current instanceof HTMLElement)returnFocus.current.focus();};},[]);
 async function openFile(path:string){if(!detail||busy)return;setBusy(true);setError(false);try{const result=await localRequest(operatorKey,'/api/tickets/'+encodeURIComponent(detail.ticket.id)+'/diff-view',{candidateCommit:detail.ticket.candidateCommits.at(-1),reviewBinding:detail.reviewBinding,path});if(!result||typeof result!=='object'||!('path' in result)||typeof result.path!=='string'||!('diff' in result)||typeof result.diff!=='string')throw Error('Invalid file review');setFile({path:result.path,diff:result.diff});onRefresh();}catch{setError(true);}finally{setBusy(false);}}
 return <dialog ref={dialog} className="unfool-proof" aria-labelledby="proof-title" onCancel={event=>{event.preventDefault();onClose();}}><div className="proof-header"><h2 id="proof-title">Proof</h2><button onClick={onClose}>Close</button></div>
 {detail?<><h3>{detail.ticket.title}</h3><ul className="proof-checklist">{proofLines(detail).map(line=><li key={line.text}><Hallmark mark={line.mark}/><span>{line.text}</span></li>)}</ul>
 <section><h3>What the AI says it did</h3><p className="unfool-muted">Written by the AI, not a check result.</p><p className="proof-ai-note">{String(detail.events.filter(e=>e.kind==='agent_stopped'&&typeof e.data.summary==='string').at(-1)?.data.summary??'No separate AI summary was recorded.')}</p></section>
 <section><h3>What changed</h3><p>{detail.diffReviewRequired?'Open each changed file before accepting.':'You can inspect each changed file here.'}</p><ul className="proof-files">{detail.reviewPaths?.map(path=><li key={path}><button disabled={busy} onClick={()=>void openFile(path)}><span>{path}</span><span>{detail.viewedPaths?.includes(path)?'Opened':'Open'}</span></button></li>)}</ul>{!detail.reviewPaths?.length&&<p>No file list is available in this record.</p>}{error&&<p role="alert">That file couldn't open. Refresh the proof and try again.</p>}{file&&<section className="proof-patch" aria-label="Opened changes"><h4>{file.path}</h4><Suspense fallback={<p>Opening the changes…</p>}><FileDiff path={file.path} diff={file.diff} theme={theme}/></Suspense></section>}</section>
 <details className="proof-technical"><summary>Technical details</summary>{requestError&&<p role="alert">{requestError}</p>}<p>Original request</p><blockquote>{detail.ticket.requestText}</blockquote><TicketPanel initialTicketId={detail.ticket.id}/><details><summary>Complete stored response</summary><pre>{JSON.stringify(detail,null,2)}</pre></details></details></>:<><p>{confirmation?'Confirm your choice with Touch ID.':'Your conversation and settings are here.'}</p><details className="proof-technical" open={confirmation}><summary>Technical details</summary>{requestError&&<p role="alert">{requestError}</p>}{confirmation?<PasskeyPanel operatorKey={operatorKey}/>:<ChatPanel/>}</details></>}
 </dialog>;
}
