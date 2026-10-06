import {useEffect,useState} from 'react';
import {Journey} from './Journey.tsx';
import {useProjectContext} from './useProjectContext.ts';
import {intentPreview} from './presentation.ts';
import {ProjectContextPanel} from './ProjectContextPanel.tsx';
import {isMission} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
type State={kind:'loading'}|{kind:'loaded';mission:Mission}|{kind:'failed';message:string};
export function MissionDetail({id,projectId,onBack}:{id:string;projectId:string;onBack:()=>void}){
 const context=useProjectContext(id);
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
  {state.kind==='loaded'&&<>
   <header className="mission-header" data-mission-id={state.mission.id}><div className="mission-meta"><span className="draft-badge">DRAFT</span><time dateTime={state.mission.createdAt}>{new Date(state.mission.createdAt).toLocaleString()}</time></div><p className="mission-intent-summary">{intentPreview(state.mission.originalIntent)}</p><p className="draft-note">Intent recorded. No analysis or execution.</p></header>
   <Journey mission={state.mission} context={context.fact}/>
   <ProjectContextPanel control={context}/>
   <details className="original-disclosure"><summary>Original Request · exact submitted text</summary><p className="mission-intent original-request">{state.mission.originalIntent}</p></details>
  </>}
 </div>;
}
