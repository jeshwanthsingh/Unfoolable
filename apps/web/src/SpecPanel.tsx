import {useEffect} from 'react';
import type {SpecControl} from './useMissionSpec.ts';
import {canAcceptSpec,canLandMission,specLabel} from './spec-presentation.ts';
export function SpecPanel({control,focusReview=false}:{control:SpecControl;focusReview?:boolean}){
 const {state,pending,error}=control,view=state.kind==='loaded'?state.data:null;
 useEffect(()=>{if(focusReview&&state.kind==='loaded'){document.getElementById('mission-spec')?.focus();document.getElementById('mission-spec')?.scrollIntoView({block:'start'});}},[focusReview,state.kind]);
 return <section id="mission-spec" className="spec-panel bench" style={{overflowWrap:'anywhere'}} tabIndex={-1} aria-labelledby="spec-title" aria-busy={pending}>
 <header className="bench-heading"><h3 id="spec-title">Spec review</h3><span role="status">{state.kind==='loading'?'LOADING':specLabel(view)}</span></header>
 {state.kind==='loading'&&<p role="status">Preparing mission specification…</p>}{state.kind==='failed'&&<p role="alert">Spec unavailable. Refresh to confirm current scope and decisions.</p>}{error&&<p role="alert" className="form-error">{error}</p>}{(error||state.kind==='failed')&&<button className="secondary-button" onClick={control.refresh}>Refresh Spec</button>}
 {view&&<><h4>Goal</h4><p>{view.goal??'Preparation has not recorded a goal yet.'}</p><h4>Non-goals</h4>{view.nonGoals.length?<ul>{view.nonGoals.map((goal,index)=><li key={index}>{goal}</li>)}</ul>:<p>No non-goals recorded.</p>}
 <h4>Claims and native tests</h4>{view.claims.length?<ul className="spec-claims">{view.claims.map(claim=><li key={claim.claimId}><strong>{claim.claimId} · {claim.summary}</strong><p>Native test: <code>{claim.testName}</code></p><p>Assurance: {claim.assurance} · {claim.classification} · red on base: {claim.redOnBase} · {claim.admitted?'Admitted':'Rejected'}</p></li>)}</ul>:<p>Native claims are being prepared.</p>}
 {view.reason&&<p className="form-error">{view.reason}</p>}{view.phase==='NEEDS_YOU'&&<button className="secondary-button" disabled={pending} onClick={()=>void control.retry()}>Retry Mission</button>}{view.phase==='SPEC_REVIEW'&&<button className="primary-button" disabled={pending||!canAcceptSpec(view)} onClick={()=>void control.accept()}>Approve Spec</button>}
 {view.phase==='CHECKS_PASSED'&&<><p>Protected checks passed. The mission awaits your Land or Abandon decision.</p><div className="permission-actions"><button className="primary-button" disabled={pending||!canLandMission(view)} onClick={()=>void control.land()}>Land</button><button className="secondary-button" disabled={pending} onClick={()=>void control.abandon()}>Abandon</button></div></>}
 {view.phase==='LANDED'&&view.landing&&<p>Mission landed on <code>{view.landing.branch}</code> at <code>{view.landing.commit}</code>.</p>}{view.phase==='ABANDONED'&&<p>Mission abandoned.</p>}
 {!!view.decisionEvents.length&&<details><summary>Recorded human decisions</summary><ol>{view.decisionEvents.map((event,index)=><li key={index}>{event.kind.replaceAll('_',' ')} · <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>{event.specId&&<> · Spec <code>{event.specId}</code></>}{event.runId&&<> · Run <code>{event.runId}</code></>}</li>)}</ol></details>}</>}
 </section>;
}
