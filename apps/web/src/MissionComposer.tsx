import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {isMission,validMissionIntent,MAX_MISSION_INTENT_LENGTH} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
type Props={projectId:string;onClose:()=>void;onCreated:(mission:Mission)=>void};
export function MissionComposer({projectId,onClose,onCreated}:Props){
 const dialog=useRef<HTMLDialogElement>(null);const [intent,setIntent]=useState('');
 const [pending,setPending]=useState(false);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{const current=dialog.current;current?.showModal();return ()=>current?.close();},[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError(null);
  if(!validMissionIntent(intent)){setError('Describe what you want to work on before creating a mission.');return;}
  setPending(true);
  try{
   const response=await fetch(`/api/projects/${encodeURIComponent(projectId)}/missions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({originalIntent:intent}),signal:AbortSignal.timeout(20000)});
   const data:unknown=await response.json();
   if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Mission creation could not be confirmed.');}
   if(!isMission(data)||data.projectId!==projectId)throw new Error('An invalid response was received. Reload to check whether your mission was saved.');
   onCreated(data);
  }catch(problem){setError(problem instanceof Error&&problem.name!=='TypeError'?problem.message:'Could not confirm creation. Reload to check your missions before trying again.');}
  finally{setPending(false);}
 }
 return <dialog ref={dialog} className="project-dialog mission-dialog" aria-labelledby="new-mission-title" onCancel={event=>{if(pending)event.preventDefault();else onClose();}}>
  <div className="dialog-heading"><div><p className="eyebrow">START WITH YOUR WORDS</p><h2 id="new-mission-title">New Mission</h2></div><button className="close-dialog" aria-label="Close new mission" onClick={onClose} disabled={pending}>×</button></div>
  <p className="dialog-intro">A rough request is enough. We’ll keep it exactly as you write it.</p>
  <form onSubmit={event=>{void submit(event);}}>
   <fieldset disabled={pending}><label htmlFor="mission-intent">What are we building?</label><textarea id="mission-intent" autoFocus value={intent} onChange={event=>setIntent(event.target.value)} maxLength={MAX_MISSION_INTENT_LENGTH} rows={7} placeholder="Fix the refresh-token race." aria-describedby="intent-hint"/>
   <p id="intent-hint" className="intent-hint">Recorded as a draft. No analysis or execution. Up to 8,000 characters.</p></fieldset>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={pending}>Cancel</button><button type="submit" className="primary-button" disabled={pending}>{pending?'Saving…':'Create Mission'}</button></div>
  </form>
 </dialog>;
}
