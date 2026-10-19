import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {ChatDraft} from '../../../packages/shared/chat.ts';
import {oldDraft} from './draft-preferences.ts';
export function UnfoolableDraftList({drafts,renderDraft,archived=[],onArchive}:{drafts:ChatDraft[];renderDraft:(draft:ChatDraft)=>ReactNode;archived?:readonly string[];onArchive?:(action:'archive-old'|'restore',draftId?:string)=>Promise<boolean>}){
 const [earlier,setEarlier]=useState(false),[message,setMessage]=useState(''),[restored,setRestored]=useState(0),summary=useRef<HTMLElement>(null);
 useEffect(()=>{if(restored)summary.current?.focus();},[restored]);
 const hidden=drafts.filter(d=>archived.includes(d.id)),visible=drafts.filter(d=>!archived.includes(d.id));
 const old=visible.filter(d=>oldDraft(d)),recent=visible.filter(d=>!oldDraft(d));
 async function save(action:'archive-old'|'restore',notice:string,id?:string){try{if(!onArchive||!await onArchive(action,id))throw Error('save');setMessage(notice);return true;}catch{setMessage('The drafts could not be saved. Reconnect and try again.');return false;}}
 return <div className="unfool-drafts">
 {recent.map(d=><div key={d.id}>{renderDraft(d)}</div>)}
 {!!old.length&&<div className="unfool-earlier-drafts"><details open={earlier} onToggle={e=>setEarlier(e.currentTarget.open)}><summary ref={summary}>{old.length} earlier {old.length===1?'draft':'drafts'}</summary><p className="unfool-meta">These requests haven’t started.</p>{old.map(d=><div key={d.id}>{renderDraft(d)}</div>)}</details><button disabled={!onArchive} onClick={()=>void save('archive-old','Old drafts archived on all your devices. Nothing was deleted.')}>Archive old drafts</button></div>}
 {!!hidden.length&&<details className="unfool-archived-drafts"><summary>{hidden.length} archived {hidden.length===1?'draft':'drafts'}</summary><p className="unfool-meta">Hidden on your devices. Requests are still stored.</p><ul>{hidden.map(d=><li key={d.id}><span>{d.title||'Untitled request'}</span><button disabled={!onArchive} onClick={()=>{void save('restore','Draft restored above.',d.id).then(ok=>{if(ok){setEarlier(true);setRestored(n=>n+1);}});}}>Restore<span className="unfool-sr-only"> {d.title||'request'}</span></button></li>)}</ul></details>}
 <p className="unfool-meta" role="status">{message}</p>
 </div>;
}
