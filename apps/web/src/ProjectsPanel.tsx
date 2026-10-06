import {useState} from 'react';
import type {Project} from '../../../packages/shared/projects.ts';
import {ProjectCard} from './ProjectCard.tsx';
import {ProjectDialog} from './ProjectDialog.tsx';
import type {WorkspaceState} from './useWorkspace.ts';
export function ProjectsPanel({state,onProject,onReload}:{state:WorkspaceState;onProject:(project:Project)=>void;onReload:()=>void}){
 const [open,setOpen]=useState(false);
 return <section className="projects-section" aria-labelledby="projects-title"><div className="projects-heading view-heading"><div><p className="eyebrow">PERSISTENT WORKSPACES</p><h2 id="projects-title">Projects</h2><p>Local repositories. Registration facts, not analysis.</p></div><button className="primary-button" disabled={state.kind!=='loaded'} onClick={()=>setOpen(true)}>Add Project <span aria-hidden="true">+</span></button></div>
 {state.kind==='loading'&&<p role="status" className="projects-feedback">Loading your registered projects…</p>}
 {state.kind==='failed'&&<div className="projects-feedback"><p role="alert">Projects could not be loaded. Check the local coordinator.</p><button className="secondary-button" onClick={onReload}>Try again</button></div>}
 {state.kind==='loaded'&&(state.data.projects.length?<div className="project-grid">{state.data.projects.map((p,index)=><ProjectCard key={p.id} project={p} index={index+1} missionCount={state.data.missions[p.id]?.length??null} onOpen={()=>onProject(p)}/>)}</div>:<div className="empty-state"><h3>No projects yet.</h3><p>Register a local Git repository to begin.</p></div>)}
 {state.kind==='loaded'&&Object.values(state.data.missions).some(x=>x===null)&&<div className="projects-feedback"><p role="alert">Some Mission counts are unavailable.</p><button className="secondary-button" onClick={onReload}>Reload workspaces</button></div>}
 {open&&state.kind==='loaded'&&<ProjectDialog allowedRoots={state.data.allowedRoots} onClose={()=>setOpen(false)} onRegistered={()=>{setOpen(false);onReload();}}/>}
 </section>;
}
