import type {DebugView,DebugSession} from '../../../packages/shared/debug.ts';
import type {VerificationView} from '../../../packages/shared/verification.ts';
export function debugActive(session:DebugSession|null|undefined){return !!session&&['CREATED','DIAGNOSING','CORRECTING','VERIFYING'].includes(session.status);}
export function attemptFixAllowed(debug:DebugView|null,verification:VerificationView|null){const run=verification?.runs[0];return !!(debug?.eligible&&verification?.current&&run?.status==='FAILED'&&run.results.some(r=>r.status==='FAIL')&&run.results.every(r=>['PASS','FAIL'].includes(r.status))&&!debugActive(debug.session));}
export function debugLabel(view:DebugView|null){if(!view)return 'DEBUG UNAVAILABLE';if(!view.session)return 'AWAITING FAILED CANDIDATE';if(!view.current)return 'HISTORICAL · '+view.session.status;return view.session.status==='NEEDS_HUMAN'?'NEEDS YOU · DEBUG':debugActive(view.session)?'DEBUGGING · '+view.session.status:view.session.status;}
export function hypothesisStatus(result:string,repeatedFailure=false){return result==='RESOLVED'?'RESOLVED':result==='INEFFECTIVE'||repeatedFailure?'INEFFECTIVE':result==='PENDING'?'PROPOSED':'CORRECTION ATTEMPTED';}

export function correctionLabel(input:import('../../../packages/shared/build.ts').BuildInput){return input.correction?'CORRECTION CYCLE '+input.correction.cycle:null;}

export function visibleDebugReason(view:DebugView|null){return view?.current&&view.session?.status==='RESOLVED'?null:view?.reason??null;}
