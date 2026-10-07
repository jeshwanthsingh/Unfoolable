import {useEffect,useRef,useState} from 'react';
import {APP_VERSION} from '../../../packages/shared/health.ts';
import type {Project} from '../../../packages/shared/projects.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
import {SystemStatus} from './SystemStatus.tsx';
import {ProjectsPanel} from './ProjectsPanel.tsx';
import {ProjectMissions} from './ProjectMissions.tsx';
import {MissionDetail} from './MissionDetail.tsx';
import {Home} from './Home.tsx';
import {NeedsYou} from './NeedsYou.tsx';
import {useWorkspace} from './useWorkspace.ts';
import {useAttention} from './useAttention.ts';
import './analysis.css';
import './contract.css';
import './planning.css';
import './projects.css';
import './missions.css';
type View={kind:'home'}|{kind:'projects'}|{kind:'project';project:Project}|{kind:'mission';project:Project;mission:Mission;questionId?:string|undefined;contractReview?:boolean;planReview?:boolean;buildFocus?:boolean;verificationFocus?:boolean};
const preference='command-center.last-viewed-mission';
function readViewed(){try{return localStorage.getItem(preference);}catch{return null;}}
export function App(){
 const {state,reload}=useWorkspace();const [revision,setRevision]=useState(0);const attention=useAttention(revision);const [navigationError,setNavigationError]=useState<string|null>(null);function changed(){reload();setRevision(x=>x+1);}const [view,setView]=useState<View>({kind:'home'});const [viewedId,setViewedId]=useState<string|null>(readViewed);const main=useRef<HTMLElement>(null);
 useEffect(()=>{main.current?.focus();},[view.kind,'mission'in view?view.mission.id:'project'in view?view.project.id:'']);
 const projects=state.kind==='loaded'?state.data.projects:[];
 const last=state.kind==='loaded'?Object.values(state.data.missions).flatMap(m=>m??[]).find(m=>m.id===viewedId):undefined;
 function openMission(project:Project,mission:Mission,questionId?:string|undefined,contractReview=false,planReview=false,buildFocus=false,verificationFocus=false){setNavigationError(null);setViewedId(mission.id);try{localStorage.setItem(preference,mission.id);}catch{/* Browser preferences are optional, never domain persistence. */}setView({kind:'mission',project,mission,questionId,contractReview,planReview,buildFocus,verificationFocus});}
 return <div className="command-shell"><a className="skip-link" href="#workspace">Skip to workspace</a><aside className="control-rail"><div className="brand"><img src="/mark.svg" alt="" width="36" height="36"/><div><h1>Command Center</h1><span>LOCAL ENGINEERING WORKSHOP</span></div></div>
  <nav aria-label="Workspace navigation"><button aria-current={view.kind==='home'?'page':undefined} onClick={()=>setView({kind:'home'})}><span aria-hidden="true">⌘</span>Workbench</button><button aria-current={view.kind==='projects'||view.kind==='project'?'page':undefined} onClick={()=>setView({kind:'projects'})}><span aria-hidden="true">▱</span>Projects</button><button aria-current={view.kind==='mission'?'page':undefined} disabled={!last} onClick={()=>{const p=projects.find(p=>p.id===last?.projectId);if(p&&last)openMission(p,last);}}><span aria-hidden="true">◇</span>Current Mission</button><a href="#needs-you"><span aria-hidden="true">!</span>Needs You</a></nav>
  <div className="rail-system"><SystemStatus/></div><p className="rail-foot">ON THIS MACHINE<br/>v{APP_VERSION} · Breakout 9</p>
 </aside><main id="workspace" className="workspace-main" ref={main} tabIndex={-1} aria-label="Workspace"><div className="workspace-topline"><span>CC / {view.kind==='home'?'WORKBENCH':view.kind==='projects'?'PROJECTS':view.project.displayName}</span><span>LOCAL FIRST <i aria-hidden="true"/></span></div><div className="view-entry" key={view.kind+('project'in view?view.project.id:'')+('mission'in view?view.mission.id:'')}>
  {view.kind==='home'&&<Home state={state} viewedId={viewedId} onProject={project=>setView({kind:'project',project})} onMission={openMission} onProjects={()=>setView({kind:'projects'})} onRetry={reload} revision={revision}/>}
  {view.kind==='projects'&&<ProjectsPanel state={state} onProject={project=>setView({kind:'project',project})} onReload={reload}/>}
  {view.kind==='project'&&<ProjectMissions project={view.project} onBack={()=>setView({kind:'projects'})} onMission={mission=>openMission(view.project,mission)} onChanged={reload}/>}
  {view.kind==='mission'&&<><p className="mission-project-label">{view.project.displayName} / MISSION</p><MissionDetail id={view.mission.id} projectId={view.project.id} onBack={()=>setView({kind:'project',project:view.project})} onChanged={changed} questionId={view.questionId} contractReview={view.contractReview??false} planReview={view.planReview??false} buildFocus={view.buildFocus??false} verificationFocus={view.verificationFocus??false}/></>}
 </div></main><aside className="human-rail"><NeedsYou state={attention} onRetry={()=>setRevision(x=>x+1)} onOpen={item=>{const p=projects.find(p=>p.id===item.projectId);const m=state.kind==='loaded'?state.data.missions[item.projectId]?.find(m=>m.id===item.missionId):undefined;if(p&&m)openMission(p,m,item.kind==='clarification'?item.questionId:undefined,item.kind==='contract_review',item.kind==='plan_review',item.kind==='runtime_permission'||item.kind==='reconciliation',item.kind==='manual_evaluation');else{setNavigationError('This Mission is unavailable. Reload the workspace to open its review.');reload();}}}/>{navigationError&&<p role="alert" className="form-error">{navigationError}</p>}<div className="operation-note"><span className="eyebrow">CURRENT CAPABILITIES</span><p>Record intent.<br/>Capture repository facts.<br/>Analyze and clarify intent.<br/>Review and accept scope.<br/>Plan vertical slices.<br/>Define evaluation evidence.<br/>Build one isolated candidate.<br/>Run protected acceptance checks.</p><span>Final proof awaits a receipt.</span></div></aside></div>;
}
