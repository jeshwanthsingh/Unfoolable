import {DebugPanel} from './DebugPanel.tsx';
import {useMissionDebug} from './useMissionDebug.ts';
import {VerificationPanel} from './VerificationPanel.tsx';
import {useMissionVerification} from './useMissionVerification.ts';
import {BuildPanel} from './BuildPanel.tsx';
import {useMissionBuild} from './useMissionBuild.ts';
import {SpecPanel} from './SpecPanel.tsx';
import {useMissionSpec} from './useMissionSpec.ts';
import {specLabel} from './spec-presentation.ts';
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
export function MissionDetail({id,projectId,onBack,onChanged,questionId,specReview=false,buildFocus=false,verificationFocus=false,debugFocus=false}:{id:string;projectId:string;onBack:()=>void;onChanged?:()=>void;questionId?:string|undefined;specReview?:boolean;buildFocus?:boolean;verificationFocus?:boolean;debugFocus?:boolean}){
 function changed(){onChanged?.();}
 const spec=useMissionSpec(id,changed);
 const phaseRevision=spec.state.kind==='loaded'?spec.state.data.phase:'loading-spec';
 const context=useProjectContext(id,phaseRevision);
 const analysis=useMissionAnalysis(id,changed,(context.state.kind==='loaded'?context.state.data.latest?.id??'no-context':'loading-context')+':'+phaseRevision);
 const build=useMissionBuild(id,onChanged,spec.state.kind==='loaded'?spec.state.data.phase:'loading-spec');
 const verification=useMissionVerification(id,onChanged,phaseRevision+':'+(build.state.kind==='loaded'?build.state.data.candidate?.id??'no-candidate':'loading-candidate'));
 const debug=useMissionDebug(id,()=>{build.refresh();verification.refresh();onChanged?.();},phaseRevision+':'+(verification.state.kind==='loaded'?verification.state.data.runs[0]?.id+':'+verification.state.data.runs[0]?.status:'loading-verification'));
 const [state,setState]=useState<State>({kind:'loading'});
 useEffect(()=>{if(debugFocus&&state.kind==='loaded'){document.getElementById('mission-debug')?.focus();document.getElementById('mission-debug')?.scrollIntoView({block:'start'});}},[debugFocus,state.kind]);
 useEffect(()=>{if(verificationFocus&&state.kind==='loaded'){document.getElementById('mission-verification')?.focus();document.getElementById('mission-verification')?.scrollIntoView({block:'start'});}},[verificationFocus,state.kind]);
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
   <header className="mission-header" data-mission-id={state.mission.id}><div className="mission-meta"><span className="draft-badge">{spec.state.kind==='loaded'?specLabel(spec.state.data):spec.state.kind==='failed'?'Spec unavailable':'Loading Spec'}</span><time dateTime={state.mission.createdAt}>{new Date(state.mission.createdAt).toLocaleString()}</time></div><p className="mission-intent-summary">{intentPreview(state.mission.originalIntent)}</p><p className="draft-note">Review the goal and native claims, inspect evidence, then Land or Abandon after checks pass.</p></header>
   <Journey mission={state.mission} spec={spec.state.kind==='loaded'?spec.state.data:null}/>
   <SpecPanel control={spec} focusReview={specReview}/>
   <BuildPanel control={build}/>
   <VerificationPanel control={verification}/>
   <DebugPanel control={debug}/>
   <details open={!!questionId||phaseRevision==='NEEDS_CLARIFICATION'}><summary>Preparation evidence · repository context and analysis</summary><ProjectContextPanel control={context}/><AnalysisPanel control={analysis} contextCaptured={context.fact==='captured'} questionId={questionId}/></details>
   <details className="original-disclosure"><summary>Original Request · exact submitted text</summary><p className="mission-intent original-request">{state.mission.originalIntent}</p></details>
  </>}
 </div>;
}
