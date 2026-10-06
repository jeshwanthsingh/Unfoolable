import type {WorkspaceState} from './useWorkspace.ts';
import type {Project} from '../../../packages/shared/projects.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
import {intentPreview,recentMission} from './presentation.ts';
import {Journey} from './Journey.tsx';
import {useProjectContext} from './useProjectContext.ts';
function RecentMission({mission,kind,project,onOpen}:{mission:Mission;kind:'viewed'|'recorded';project:Project;onOpen:()=>void}){
 const context=useProjectContext(mission.id);
 return <section className="recent-mission bench"><div className="bench-heading"><p className="eyebrow">{kind==='viewed'?'LAST VIEWED MISSION':'RECENTLY RECORDED MISSION'}</p><span className="draft-badge">DRAFT</span></div><p className="recent-project">{project.displayName}</p><h3 className="intent-preview">{intentPreview(mission.originalIntent)}</h3><Journey compact mission={mission} context={context.fact}/><button className="primary-button" onClick={onOpen}>Open Mission <span aria-hidden="true">↗</span></button></section>;
}
export function Home({state,viewedId,onProject,onMission,onProjects,onRetry}:{state:WorkspaceState;viewedId:string|null;onProject:(p:Project)=>void;onMission:(p:Project,m:Mission)=>void;onProjects:()=>void;onRetry:()=>void}){
 const data=state.kind==='loaded'?state.data:null;
 const incomplete=data?Object.values(data.missions).some(x=>x===null):false;
 const recent=data?recentMission(Object.values(data.missions).flatMap(x=>x??[]),viewedId):null;
 const project=recent?data?.projects.find(p=>p.id===recent.mission.projectId):null;
 return <div className="home-view"><header className="view-heading"><p className="eyebrow">THE WORKBENCH</p><h2>What are we building?</h2><p>Projects, recorded intent, and the facts behind them.</p></header>
  {state.kind==='loading'&&<p role="status" className="projects-feedback">Loading your workspace…</p>}
  {state.kind==='failed'&&<div className="projects-feedback"><p role="alert">Projects could not be loaded. Check the coordinator.</p><button className="secondary-button" onClick={onRetry}>Try again</button></div>}
  {data&&<><section className="workspace-ledger"><div className="bench-heading"><div><p className="eyebrow">REGISTERED LOCALLY</p><h3>Workspaces <span className="ledger-count">{data.projects.length}</span></h3></div><button className="text-button" onClick={onProjects}>All projects ↗</button></div>
   {data.projects.length?<ul>{data.projects.slice(0,4).map((p,index)=><li key={p.id}><button className="workspace-link" onClick={()=>onProject(p)}><span className="workspace-index">0{index+1}</span><span className="workspace-name">{p.displayName}<small>{p.registeredBranch??'Detached HEAD'} · {p.registeredHead.slice(0,7)}</small></span><span className="workspace-count">{data.missions[p.id]==null?'Missions unavailable':`${data.missions[p.id]?.length??0} missions`} <span aria-hidden="true">↗</span></span></button></li>)}</ul>:<div className="empty-state"><h3>No projects yet.</h3><p>Register an existing local Git repository to begin.</p><button className="primary-button" onClick={onProjects}>Add a Project</button></div>}
  </section>
  {recent&&project?<RecentMission key={recent.mission.id} mission={recent.mission} kind={recent.kind} project={project} onOpen={()=>onMission(project,recent.mission)}/>:<section className="empty-bench"><span className="bench-cross" aria-hidden="true">+</span><h3>{incomplete?'Missions unavailable.':'No missions yet.'}</h3><p>{incomplete?'Restore the connection to load recent Mission records.':'Open a project to record what you want to work on.'}</p></section>}
  {incomplete&&<div className="projects-feedback"><p role="alert" className="form-error">Some Mission lists are unavailable. Counts and recent records may be incomplete.</p><button className="secondary-button" onClick={onRetry}>Reload workspaces</button></div>}
  </>}
 </div>;
}
