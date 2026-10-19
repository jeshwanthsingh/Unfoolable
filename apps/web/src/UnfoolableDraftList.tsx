import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {ChatDraft} from '../../../packages/shared/chat.ts';
import {archiveDrafts,oldDraft,readArchivedDrafts} from './draft-preferences.ts';
const archiveKey='unfool-archived-drafts';
export function UnfoolableDraftList({drafts,renderDraft}:{drafts:ChatDraft[];renderDraft:(draft:ChatDraft)=>ReactNode}){
 const [archived,setArchived]=useState<string[]>(()=>{try{return readArchivedDrafts(localStorage.getItem(archiveKey));}catch{return [];}});
 const [earlier,setEarlier]=useState(false),[message,setMessage]=useState(''),[restored,setRestored]=useState(0),summary=useRef<HTMLElement>(null);
 useEffect(()=>{if(restored)summary.current?.focus();},[restored]);
 const hidden=drafts.filter(d=>archived.includes(d.id)),visible=drafts.filter(d=>!archived.includes(d.id));
 const old=visible.filter(d=>oldDraft(d)),recent=visible.filter(d=>!oldDraft(d));
 function save(ids:string[],notice:string){try{localStorage.setItem(archiveKey,JSON.stringify(ids));setArchived(ids);setMessage(notice);return true;}catch{setMessage('The drafts couldn’t be hidden. Check browser storage and try again.');return false;}}
 return <div className="unfool-drafts">
 {recent.map(d=><div key={d.id}>{renderDraft(d)}</div>)}
 {!!old.length&&<div className="unfool-earlier-drafts"><details open={earlier} onToggle={e=>setEarlier(e.currentTarget.open)}><summary ref={summary}>{old.length} earlier {old.length===1?'draft':'drafts'}</summary><p className="unfool-meta">These requests haven’t started.</p>{old.map(d=><div key={d.id}>{renderDraft(d)}</div>)}</details><button onClick={()=>save(archiveDrafts(archived,drafts),'Old drafts archived on this browser. Nothing was deleted.')}>Archive old drafts</button></div>}
 {!!hidden.length&&<details className="unfool-archived-drafts"><summary>{hidden.length} archived {hidden.length===1?'draft':'drafts'}</summary><p className="unfool-meta">Hidden on this browser. Requests are still stored.</p><ul>{hidden.map(d=><li key={d.id}><span>{d.title||'Untitled request'}</span><button onClick={()=>{if(save(archived.filter(id=>id!==d.id),'Draft restored above.')){setEarlier(true);setRestored(n=>n+1);}}}>Restore<span className="unfool-sr-only"> {d.title||'request'}</span></button></li>)}</ul></details>}
 <p className="unfool-meta" role="status">{message}</p>
 </div>;
}
