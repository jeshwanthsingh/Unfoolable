import {useRef,useState} from 'react';
import type {PermissionDecision,RuntimePermissionRequest} from '../../../packages/shared/permissions.ts';
import './permissions.css';
export function PermissionCard({request,onChanged,actionable=false}:{request:RuntimePermissionRequest;onChanged:()=>void;actionable?:boolean}){
 const [pending,setPending]=useState(false),[submitted,setSubmitted]=useState(false),[message,setMessage]=useState<string|null>(null),posting=useRef(false);
 async function decide(decision:PermissionDecision){if(posting.current||submitted||!actionable||request.status!=='PENDING')return;posting.current=true;setPending(true);setMessage(null);
  try{const response=await fetch('/api/runtime-permissions/'+encodeURIComponent(request.id)+'/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,payloadHash:request.payloadHash}),signal:AbortSignal.timeout(20000)});const data=await response.json();
   if(response.ok){setSubmitted(true);setMessage('Decision recorded. Waiting for the current provider state.');}
   else if(response.status===409&&data?.error?.code==='ALREADY_RESOLVED'){setSubmitted(true);setMessage('This request was already resolved. Refreshing its current state.');}
   else{setMessage(typeof data?.error?.message==='string'?data.error.message.slice(0,2000):'Decision outcome could not be confirmed. Refreshing the current state.');}
  }catch{setMessage('Decision outcome could not be confirmed. Refreshing the current state.');}finally{posting.current=false;setPending(false);onChanged();}
 }
 return <article id={actionable?'runtime-permission':undefined} tabIndex={-1} className="permission-card" aria-busy={pending}>
  <p className="eyebrow">{actionable?'NEEDS YOU · RUNTIME PERMISSION':'PERMISSION HISTORY · READ ONLY'}</p><h4>Codex requests filesystem write capability</h4>
  <dl><dt>Requested path</dt><dd><code>{request.path}</code></dd><dt>Reason · provider supplied</dt><dd className="permission-reason">{request.reason.slice(0,2000)||'No reason supplied.'}</dd><dt>Scope</dt><dd>Current Codex turn</dd><dt>Network</dt><dd>Not granted</dd><dt>Status</dt><dd>{request.status.replaceAll('_',' ')}</dd></dl>
  {actionable&&request.status==='PENDING'&&<div className="permission-actions"><button className="secondary-button" disabled={pending||submitted} onClick={()=>void decide('DENY')}>DENY</button><button className="primary-button" disabled={pending||submitted} onClick={()=>void decide('ALLOW')}>ALLOW FOR CURRENT TURN</button></div>}
  {message&&<p role="status">{message}</p>}
  <details><summary>Technical details · exact request binding</summary><dl><dt>Request</dt><dd>{request.id}</dd><dt>Attempt / generation</dt><dd>{request.attemptId} / {request.generation}</dd><dt>Transport</dt><dd>{request.transportId}</dd><dt>Thread / turn</dt><dd>{request.threadId} / {request.turnId}</dd><dt>Method / request ID</dt><dd>{request.providerMethod} / {String(request.providerRequestId)}</dd><dt>Payload SHA-256</dt><dd><code>{request.payloadHash}</code></dd><dt>Decision / recorded</dt><dd>{request.decision??'None'} / {request.decidedAt??'Not recorded'}</dd><dt>Transport written</dt><dd>{request.writtenAt??'Not confirmed'}</dd><dt>Provider resolved</dt><dd>{request.providerResolvedAt??'Not confirmed'}</dd></dl></details>
 </article>;
}
