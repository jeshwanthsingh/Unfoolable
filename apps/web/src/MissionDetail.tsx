import {useEffect,useState} from 'react';
import {isMission} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
type State={kind:'loading'}|{kind:'loaded';mission:Mission}|{kind:'failed';message:string};
export function MissionDetail({id,projectId,onBack}:{id:string;projectId:string;onBack:()=>void}){
 const [state,setState]=useState<State>({kind:'loading'});
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  void fetch('/api/missions/'+encodeURIComponent(id),{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const data:unknown=await response.json();
   if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Mission could not be loaded.');}
   if(!isMission(data)||data.projectId!==projectId)throw new Error('Mission could not be loaded.');
   if(active)setState({kind:'loaded',mission:data});
  }).catch(problem=>{if(active)setState({kind:'failed',message:problem instanceof Error?problem.message:'Mission could not be loaded.'});});
  return ()=>{active=false;controller.abort();};
 },[id,projectId]);
 return <div className="mission-detail">
  <button className="secondary-button" onClick={onBack}>Back to Missions</button>
  <h3>Mission</h3>
  {state.kind==='loading'&&<p role="status">Loading the original request…</p>}
  {state.kind==='failed'&&<p className="form-error" role="alert">{state.message}</p>}
  {state.kind==='loaded'&&<article className="mission-card" data-mission-id={state.mission.id}>
   <div className="mission-meta"><span className="draft-badge">DRAFT</span><time dateTime={state.mission.createdAt}>{new Date(state.mission.createdAt).toLocaleString()}</time></div>
   <h4>Original request</h4><p className="mission-intent original-request">{state.mission.originalIntent}</p>
   <p className="draft-note">Your request has been recorded. It has not been analyzed or clarified.</p>
  </article>}
 </div>;
}
