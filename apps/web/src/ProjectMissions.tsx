import {useEffect,useState} from 'react';
import type {Project} from '../../../packages/shared/projects.ts';
import {isMissionsResponse} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
import {MissionComposer} from './MissionComposer.tsx';
import {MissionCard} from './MissionCard.tsx';
import {shortPath} from './ProjectCard.tsx';
import './missions.css';
type State={kind:'loading'}|{kind:'loaded';missions:Mission[]}|{kind:'failed';message:string};
export function ProjectMissions({project,onBack,onMission,onChanged}:{project:Project;onBack:()=>void;onMission:(mission:Mission)=>void;onChanged:()=>void}){
 const [state,setState]=useState<State>({kind:'loading'});const [open,setOpen]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  void fetch(`/api/projects/${encodeURIComponent(project.id)}/missions`,{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const data:unknown=await response.json();
   if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Missions could not be loaded.');}
   if(!isMissionsResponse(data)||data.missions.some(m=>m.projectId!==project.id))throw new Error('Missions could not be loaded.');
   if(active)setState({kind:'loaded',missions:data.missions});
  }).catch(problem=>{if(active)setState({kind:'failed',message:problem instanceof Error?problem.message:'Missions could not be loaded.'});});
  return ()=>{active=false;controller.abort();};
 },[project.id,revision]);
 function created(mission:Mission){
  setState(previous=>previous.kind==='loaded'?{kind:'loaded',missions:[mission,...previous.missions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))}:previous);
  setOpen(false);onChanged();
 }
 return <section className="projects-section" aria-labelledby="project-missions-title">
  <button className="secondary-button" onClick={onBack}>Back to Projects</button>
  <div className="project-context"><p className="eyebrow">PROJECT</p><h2 id="project-missions-title">{project.displayName}</h2><p title={project.repoRoot}>{shortPath(project.repoRoot)}</p><span className="registration-meta">{project.registeredBranch??'Detached HEAD'} · <code title={project.registeredHead}>{project.registeredHead.slice(0,7)}</code> · Registration-time metadata</span></div>
  <>
   <div className="projects-heading"><div><h3 className="missions-title">Missions</h3><p className="missions-subtitle">Start rough. Keep your original intent.</p></div><button className="primary-button" disabled={state.kind!=='loaded'} onClick={()=>setOpen(true)}>New Mission <span aria-hidden="true">+</span></button></div>
   {state.kind==='loading'&&<p className="projects-feedback" role="status">Loading missions…</p>}
   {state.kind==='failed'&&<div className="projects-feedback"><p role="alert">{state.message}</p><button className="secondary-button" onClick={()=>setRevision(x=>x+1)}>Try again</button></div>}
   {state.kind==='loaded'&&(state.missions.length?<div className="mission-list">{state.missions.map(mission=><MissionCard key={mission.id} mission={mission} onOpen={()=>onMission(mission)}/>)}</div>:<div className="empty-state project-empty"><div className="empty-mark" aria-hidden="true">↗</div><div><h3>No missions yet.</h3><p>What would you like to work on? A sentence is a good beginning.</p></div></div>)}
  </>
  {open&&<MissionComposer projectId={project.id} onClose={()=>setOpen(false)} onCreated={created}/>}
 </section>;
}
