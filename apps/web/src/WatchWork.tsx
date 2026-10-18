import {useEffect,useRef} from 'react';
import type {DeskTicket} from './useUnfoolableData.ts';
import type {Detail} from './TicketPanel.tsx';
import {projectActivity,type TicketActivity} from '../../../packages/shared/ticket-activity.ts';
import {LiveActivity} from './LiveActivity.tsx';
import {taskPresentation} from './unfoolable-model.ts';
export function WatchWork({ticket,detail,onClose,onProof}:{ticket:DeskTicket;detail?:Detail;onClose:()=>void;onProof:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),last=useRef<TicketActivity|null>(null);
 const fromDetail=detail?projectActivity(detail.events,ticket.status):null;
 const activity=ticket.activity??(fromDetail&&fromDetail.sequence>=(last.current?.sequence??0)?fromDetail:last.current);
 useEffect(()=>{if(activity)last.current=activity;},[activity]);
 useEffect(()=>{const focus=document.activeElement,x=scrollX,y=scrollY,overflow=document.body.style.overflow,node=dialog.current;
  document.body.style.overflow='hidden';node?.showModal();return()=>{node?.close();document.body.style.overflow=overflow;window.scrollTo(x,y);if(focus instanceof HTMLElement)focus.focus({preventScroll:true});};
 },[]);
 const running=['building','fixing','checking'].includes(ticket.status);
 return <dialog ref={dialog} className="unfool-watch" aria-labelledby="watch-title" onCancel={e=>{e.preventDefault();onClose();}}>
 <div className="watch-column"><header className="watch-header"><h2 id="watch-title">Watch it work</h2><button onClick={onClose}>Close</button></header>
 <h3>{ticket.plainTitle??ticket.title}</h3>
 {running&&activity?<LiveActivity ticket={{...ticket,activity}}/>:<p role="status">{taskPresentation(ticket,detail).sentence}</p>}
 <div className="watch-body"><section aria-labelledby="watch-steps"><h3 id="watch-steps">Steps so far</h3><p className="unfool-muted">Recorded steps, not a prediction. Quiet means no new step.</p><ol className="watch-timeline">{activity?.steps.map(step=><li key={step.sequence} data-event-sequence={step.sequence}><time dateTime={step.at}>{new Date(step.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><span>{step.line}</span></li>)}</ol>{!activity?.steps.length&&<p>Waiting for the first recorded step.</p>}<p className="unfool-muted">Up to 40 recent steps. The full record stays in the proof.</p></section>
 <section aria-labelledby="watch-files"><h3 id="watch-files">Files changed</h3>{activity?.files.length?<ul className="watch-files">{activity.files.map(file=><li key={file.path} data-event-sequence={file.sequence}><span>{file.path}</span><span className="unfool-muted">Change recorded</span></li>)}</ul>:<p>No file changes recorded yet.</p>}</section></div>
 <button className="unfool-proof-link" onClick={onProof}>See the proof</button></div></dialog>;
}
