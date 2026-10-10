import {isVerifyView,type VerifyView} from '../../../packages/shared/verify-only.ts';
import {VerifyOnlyPanel} from './VerifyOnlyPanel.tsx';
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
import './projects.css';
import './missions.css';
type View={kind:'verify-only';requestId?:string|undefined}|{kind:'home'}|{kind:'projects'}|{kind:'project';project:Project}|{kind:'mission';project:Project;mission:Mission;questionId?:string|undefined;specReview?:boolean;buildFocus?:boolean;verificationFocus?:boolean;debugFocus?:boolean};
const preference='command-center.last-viewed-mission';
function readViewed(){try{return localStorage.getItem(preference);}catch{return null;}}
export function App(){
 const [verifyRequests,setVerifyRequests]=useState<VerifyView[]>([]);
 useEffect(()=>{let gone=false;const refresh=async()=>{try{const r=await fetch('/api/verify-only',{cache:'no-store'}),d=await r.json();if(!gone&&r.ok&&Array.isArray(d.requests)&&d.requests.every(isVerifyView))setVerifyRequests(d.requests);}catch{/* The focused verifier view reports request errors. */}};void refresh();const t=setInterval(()=>void refresh(),1500);return()=>{gone=true;clearInterval(t);};},[]);
 const verifyPending=verifyRequests.filter(r=>r.result?.v1?.canLand&&!r.result.v1.landed&&!r.abandonedAt);
 const {state,reload}=useWorkspace();const [revision,setRevision]=useState(0);const attention=useAttention(revision);const [navigationError,setNavigationError]=useState<string|null>(null);function changed(){reload();setRevision(x=>x+1);}const [view,setView]=useState<View>({kind:'verify-only'});const [viewedId,setViewedId]=useState<string|null>(readViewed);const main=useRef<HTMLElement>(null);
 useEffect(()=>{main.current?.focus();},[view.kind,'mission'in view?view.mission.id:'project'in view?view.project.id:'']);
 const projects=state.kind==='loaded'?state.data.projects:[];
 const last=state.kind==='loaded'?Object.values(state.data.missions).flatMap(m=>m??[]).find(m=>m.id===viewedId):undefined;
 function openMission(project:Project,mission:Mission,questionId?:string|undefined,specReview=false,buildFocus=false,verificationFocus=false,debugFocus=false){setNavigationError(null);setViewedId(mission.id);try{localStorage.setItem(preference,mission.id);}catch{/* Browser preferences are optional, never domain persistence. */}setView({kind:'mission',project,mission,questionId,specReview,buildFocus,verificationFocus,debugFocus});}
 return <div className="command-shell"><a className="skip-link" href="#workspace">Skip to workspace</a><aside className="control-rail"><div className="brand"><img src="/mark.svg" alt="" width="36" height="36"/><div><h1>Command Center</h1><span>LOCAL ENGINEERING WORKSHOP</span></div></div>
  <nav aria-label="Workspace navigation"><button aria-current={view.kind==='home'?'page':undefined} onClick={()=>setView({kind:'home'})}><span aria-hidden="true">⌘</span>Workbench</button><button aria-current={view.kind==='projects'||view.kind==='project'?'page':undefined} onClick={()=>setView({kind:'projects'})}><span aria-hidden="true">▱</span>Projects</button><button aria-current={view.kind==='mission'?'page':undefined} disabled={!last} onClick={()=>{const p=projects.find(p=>p.id===last?.projectId);if(p&&last)openMission(p,last);}}><span aria-hidden="true">◇</span>Current Mission · Experimental</button><button aria-current={view.kind==='verify-only'?'page':undefined} onClick={()=>setView({kind:'verify-only'})}>Verify a Candidate</button><a href="#needs-you"><span aria-hidden="true">!</span>Needs You</a></nav>
  <div className="rail-system"><SystemStatus/></div><p className="rail-foot">ON THIS MACHINE<br/>v{APP_VERSION} · Verify-only</p>
 </aside><main id="workspace" className="workspace-main" ref={main} tabIndex={-1} aria-label="Workspace"><div className="workspace-topline"><span>CC / {view.kind==='home'?'WORKBENCH':view.kind==='projects'?'PROJECTS':view.kind==='verify-only'?'VERIFY ONLY':view.project.displayName}</span><span>LOCAL FIRST <i aria-hidden="true"/></span></div><div className="view-entry" key={view.kind+('project'in view?view.project.id:'')+('mission'in view?view.mission.id:'')}>
  {view.kind==='home'&&<Home state={state} viewedId={viewedId} onProject={project=>setView({kind:'project',project})} onMission={openMission} onProjects={()=>setView({kind:'projects'})} onRetry={reload} revision={revision}/>}
  {view.kind==='verify-only'&&<VerifyOnlyPanel initialRequestId={view.requestId}/>}
  {view.kind==='projects'&&<ProjectsPanel state={state} onProject={project=>setView({kind:'project',project})} onReload={reload}/>}
  {view.kind==='project'&&<ProjectMissions project={view.project} onBack={()=>setView({kind:'projects'})} onMission={mission=>openMission(view.project,mission)} onChanged={reload}/>}
  {view.kind==='mission'&&<><p className="mission-project-label">{view.project.displayName} / MISSION</p><MissionDetail id={view.mission.id} projectId={view.project.id} onBack={()=>setView({kind:'project',project:view.project})} onChanged={changed} questionId={view.questionId} specReview={view.specReview??false} buildFocus={view.buildFocus??false} verificationFocus={view.verificationFocus??false} debugFocus={view.debugFocus??false}/></>}
 </div></main><aside className="human-rail"><NeedsYou additionalCount={verifyPending.length} state={attention} onRetry={()=>setRevision(x=>x+1)} onOpen={item=>{const p=projects.find(p=>p.id===item.projectId);const m=state.kind==='loaded'?state.data.missions[item.projectId]?.find(m=>m.id===item.missionId):undefined;if(p&&m)openMission(p,m,item.kind==='clarification'?item.questionId:undefined,item.kind==='spec_review'||item.kind==='mission_decision'||item.kind==='workflow_exception',item.kind==='runtime_permission'||item.kind==='reconciliation',item.kind==='manual_evaluation'||item.kind==='verification_inspection',item.kind==='debug_escalation');else{setNavigationError('This Mission is unavailable. Reload the workspace to open its review.');reload();}}}/>{verifyPending.map(r=><button key={r.id} className="attention-link" onClick={()=>setView({kind:'verify-only',requestId:r.id})}><strong>Review candidate landing</strong><span>{r.input.intent.slice(0,80)}</span></button>)}{navigationError&&<p role="alert" className="form-error">{navigationError}</p>}<div className="operation-note"><span className="eyebrow">CURRENT CAPABILITIES</span><p>Verify committed code.<br/>Inspect integrity checks and project recipes.<br/>Review optional task-check gaps.<br/>Land with current evidence or abandon.</p><span>Mission orchestration is experimental.</span></div></aside></div>;
}
