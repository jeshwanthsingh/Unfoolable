import {useEffect,useState} from 'react';
import {isVerifyView,type VerifyView} from '../../../packages/shared/verify-only.ts';
async function api(path:string,body?:unknown){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(!response.ok)throw Error(data.error?.message??'Verification request failed.');return data;}
export function VerifyOnlyPanel({initialRequestId}:{initialRequestId?:string|undefined}){
 const [requests,setRequests]=useState<VerifyView[]>([]),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const load=async()=>{try{const data=await api('/api/verify-only');if(!Array.isArray(data.requests)||!data.requests.every(isVerifyView))throw Error('Verification response could not be confirmed.');setRequests(data.requests);}catch(e){setError((e as Error).message);}};
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),1500);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{if(initialRequestId)setSelected(initialRequestId);},[initialRequestId]);
 const current=requests.find(r=>r.id===selected);
 return <section className="projects-panel verify-only-panel"><header><span className="eyebrow">INDEPENDENT CHECKS</span><h2>Verify a Candidate</h2><p>Committed code, protected acceptance checks. No analysis, planning or Builder.</p></header>
 <form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null);void api('/api/verify-only',{repoPath:data.get('repoPath'),baseRef:data.get('baseRef'),candidateRef:data.get('candidateRef'),intent:data.get('intent')}).then((v:unknown)=>{if(!isVerifyView(v))throw Error('Verification response could not be confirmed.');setSelected(v.id);return load();}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>
 <label>Repository path<input name="repoPath" required placeholder="~/Projects/repository"/></label><label>BASE<input name="baseRef" required placeholder="Commit or local ref"/></label><label>Candidate<input name="candidateRef" required placeholder="Commit or local ref"/></label><label>Original intent<textarea name="intent" required maxLength={16000} rows={5}/></label><button className="primary-button" disabled={busy}>{busy?'Recording…':'Author acceptance checks'}</button></form>
 {error&&<p role="alert" className="form-error">{error}</p>}
 <nav aria-label="Verification requests">{requests.map(r=><button className="secondary-button" key={r.id} onClick={()=>setSelected(r.id)} aria-current={selected===r.id?'page':undefined}>{r.input.intent.slice(0,70)} · {r.state}</button>)}</nav>
 {current&&<article><h3>Oracle review</h3><blockquote className="original-intent">{current.input.intent}</blockquote><p>{current.state}</p><p className="metadata">BASE {current.input.baseCommit.slice(0,12)} → Candidate {current.input.candidateCommit.slice(0,12)}</p>
 {current.error&&<p role="alert">{current.error}</p>}
 {current.review&&<><ul>{current.review.claims.map(c=><li key={c.id}><strong>{c.testName}</strong><p>{c.summary}</p><p>{c.classification} · {c.mode==='HUMAN'?'HUMAN / NOT CHECKED':c.test?.assurance} · BASE {c.baseResult} · {c.admission}</p>{c.reason&&<p>{c.reason}</p>}<details><summary>Authored check</summary><pre>{c.test?.code??'No automated check.'}</pre></details></li>)}</ul>
 {current.state==='REVIEW'&&<button className="primary-button" disabled={busy} onClick={()=>{setBusy(true);void api('/api/verify-only/'+current.id+'/approve',{reviewHash:current.review!.hash}).then(load).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Approve these acceptance checks</button>}</>}
 {current.result&&<><h3>Result: {current.result.status}</h3><p>Automated checks: {current.result.automatedStatus}. Unchecked claims are not passing claims.</p><ul>{current.result.claims.map(c=><li key={c.id}>{c.id}: {c.status}{c.reason&&' — '+c.reason}</li>)}</ul></>}
 </article>}
 </section>;
}
