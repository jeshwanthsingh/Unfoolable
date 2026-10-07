import {BuildPanel} from './BuildPanel.tsx';
import {useMissionBuild} from './useMissionBuild.ts';
import {PlanningPanel} from './PlanningPanel.tsx';
import {useMissionPlanning} from './useMissionPlanning.ts';
import {useMissionContract} from './useMissionContract.ts';
import {ContractPanel} from './ContractPanel.tsx';
import {useEffect,useState} from 'react';
import {AnalysisPanel} from './AnalysisPanel.tsx';
import {useMissionAnalysis} from './useMissionAnalysis.ts';
import {Journey} from './Journey.tsx';
import {useProjectContext} from './useProjectContext.ts';
import {intentPreview} from './presentation.ts';
import {ProjectContextPanel} from './ProjectContextPanel.tsx';
import {isMission} from '../../../packages/shared/missions.ts';
import type {Mission} from '../../../packages/shared/missions.ts';
type State={kind:'loading'}|{kind:'loaded';mission:Mission}|{kind:'failed';message:string};
export function MissionDetail({id,projectId,onBack,onChanged,questionId,contractReview=false,planReview=false,buildFocus=false}:{id:string;projectId:string;onBack:()=>void;onChanged?:()=>void;questionId?:string|undefined;contractReview?:boolean;planReview?:boolean;buildFocus?:boolean}){
 const [contractRevision,setContractRevision]=useState(0);
 function changed(){setContractRevision(value=>value+1);onChanged?.();}
 const context=useProjectContext(id);
 const analysis=useMissionAnalysis(id,changed,context.state.kind==='loaded'?context.state.data.latest?.id??'no-context':'loading-context');
 const contract=useMissionContract(id,changed,String(contractRevision)+':'+(context.state.kind==='loaded'?context.state.data.latest?.id??'no-context':'loading-context')+':'+(analysis.state.kind==='loaded'?analysis.state.data.analysis?.id??'no-analysis':'loading-analysis'));
 const planning=useMissionPlanning(id,onChanged,String(contractRevision)+':'+(context.state.kind==='loaded'?context.state.data.latest?.id??'no-context':'loading-context')+':'+(contract.state.kind==='loaded'?contract.state.data.accepted?.id??'no-contract':'loading-contract'));
 const build=useMissionBuild(id,onChanged,planning.state.kind==='loaded'?planning.state.data.accepted?.plan.pairId??'no-plan':'loading-plan');
 const [state,setState]=useState<State>({kind:'loading'});
 useEffect(()=>{if(buildFocus&&state.kind==='loaded'){document.getElementById('mission-build')?.focus();document.getElementById('mission-build')?.scrollIntoView({block:'start'});}},[buildFocus,state.kind]);
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
   <header className="mission-header" data-mission-id={state.mission.id}><div className="mission-meta"><span className="draft-badge">{build.state.kind==='failed'?'Build state unavailable':build.state.kind==='loaded'?build.state.data.phase:planning.state.kind==='loaded'?planning.state.data.phase:contract.state.kind==='loaded'?contract.state.data.phase:analysis.state.kind==='loaded'?analysis.state.data.phase:state.mission.phase}</span><time dateTime={state.mission.createdAt}>{new Date(state.mission.createdAt).toLocaleString()}</time></div><p className="mission-intent-summary">{intentPreview(state.mission.originalIntent)}</p><p className="draft-note">Intent, evidence, decisions, agreed scope, and one bounded Build. Candidate changes await verification.</p></header>
   <Journey mission={state.mission} context={context.fact} clarification={analysis.state.kind==='loaded'?analysis.state.data:null} contract={contract.state.kind==='loaded'?contract.state.data:null} planning={planning.state.kind==='loaded'?planning.state.data:null} build={build.state.kind==='loaded'?build.state.data:null}/>
   <BuildPanel control={build} planning={planning.state.kind==='loaded'?planning.state.data:null}/>
   <ProjectContextPanel control={context}/><AnalysisPanel control={analysis} contextCaptured={context.fact==='captured'} questionId={questionId}/>
   <ContractPanel control={contract} focusReview={contractReview}/><PlanningPanel control={planning} focusReview={planReview}/><details className="original-disclosure"><summary>Original Request · exact submitted text</summary><p className="mission-intent original-request">{state.mission.originalIntent}</p></details>
  </>}
 </div>;
}
