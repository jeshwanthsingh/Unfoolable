import test from 'node:test';
import assert from 'node:assert/strict';
import type {DebugSession,DebugView} from '../packages/shared/debug.ts';
import {isDebugView} from '../packages/shared/debug-validation.ts';
import {isAttentionResponse} from '../packages/shared/attention.ts';
import {debugActive,debugLabel,hypothesisStatus,correctionLabel,visibleDebugReason} from '../apps/web/src/debug-presentation.ts';
const debug:DebugView={session:null,history:[],current:false,eligible:true,reason:null};
test('diagnosis cannot render acceptance; terminal history is not an active worker',()=>{
 for(const status of ['CREATED','DIAGNOSING','CORRECTING','VERIFYING'] as const){const session={status} as DebugSession;assert.equal(debugActive(session),true);assert.match(debugLabel({...debug,current:true,session}),/^DEBUGGING/);}
 for(const status of ['RESOLVED','NEEDS_HUMAN','FAILED','INTERRUPTED'] as const){const session={status} as DebugSession;assert.equal(debugActive(session),false);assert.doesNotMatch(debugLabel({...debug,current:true,session}),/ACCEPTANCE|COMPLETE|PASSED/);assert.match(debugLabel({...debug,session}),/^HISTORICAL/);}
 assert.equal(hypothesisStatus('PENDING'),'PROPOSED');assert.equal(hypothesisStatus('RUNNING'),'CORRECTION ATTEMPTED');assert.equal(hypothesisStatus('FAILED'),'CORRECTION ATTEMPTED');assert.equal(hypothesisStatus('FAILED',true),'INEFFECTIVE');assert.equal(hypothesisStatus('INEFFECTIVE'),'INEFFECTIVE');assert.equal(hypothesisStatus('RESOLVED'),'RESOLVED');
});
test('Debug boundary is browser-safe, rejects malformed nested history and extra transcript fields',()=>{
 assert.equal(isDebugView(debug),true);assert.equal(isDebugView({...debug,reason:42}),false);assert.equal(isDebugView({...debug,session:{status:'CORRECTING'}}),false);assert.equal(isDebugView({...debug,history:[{status:'RESOLVED'}]}),false);assert.equal(isDebugView({...debug,transcript:'hidden reasoning'}),false);assert.equal(isDebugView({...debug,eligible:'yes'}),false);
});
test('Debug Needs You accepts only the explicit bounded escalation contract',()=>{
 const item={kind:'debug_escalation',sessionId:'session',missionId:'mission',projectId:'project',projectName:'Fixture',originalIntent:'Correct denial behavior',reason:'Correction limit reached',corrections:2,failedClaimIds:['E2']};
 assert.equal(isAttentionResponse({items:[item],count:1}),true);
 for(const change of [{corrections:3},{kind:'debugging'},{reason:''},{failedClaimIds:[null]},{autoPermission:true}])assert.equal(isAttentionResponse({items:[{...item,...change}],count:1}),false);
});

test('correction worker label is bound to the actual correction input',()=>{const base={} as import('../packages/shared/build.ts').BuildInput;assert.equal(correctionLabel(base),null);assert.equal(correctionLabel({...base,correction:{cycle:2} as import('../packages/shared/debug.ts').CorrectionContext}),'CORRECTION CYCLE 2');});

test('resolved records require protected pass rather than a session verdict alone',()=>{
 const session={id:'session',missionId:'mission',initialCandidateId:'candidate',initialVerificationRunId:'run',evaluationRevisionId:'evaluation',recipeId:'recipe',contractRevisionId:'contract',planRevisionId:'plan',sliceId:'S1',evaluationHash:'a'.repeat(64),recipeHash:'b'.repeat(64),evaluatorHash:'c'.repeat(64),contractHash:'d'.repeat(64),planHash:'e'.repeat(64),status:'INTERRUPTED',maxCorrections:2,createdAt:'2026-10-06T00:00:00Z',endedAt:null,failureCode:null,message:null,cycles:[]};
 assert.equal(isDebugView({...debug,session}),true);
 assert.equal(isDebugView({...debug,session:{...session,status:'RESOLVED'}}),false);
 assert.equal(isDebugView({...debug,session:{...session,cycles:[{id:'c',sessionId:'other',number:1}]}}),false);
});

test('native diagnosis ownership accepts bounded processes, cleanup and launchPending without accepting transcripts',()=>{
 const process={pid:123,ppid:1,pgid:123,sid:1,birth:'native-identity',executable:'codex',observedAt:'2026-10-06T00:00:00Z',exitedAt:null};
 const cleanup={verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null};
 const packet={id:'packet',sessionId:'session',cycle:1,canonical:'{}',hash:'f'.repeat(64),data:{version:'failure-packet-v1',missionId:'mission',binding:{candidateId:'candidate',verificationRunId:'run'},failedClaims:[],evidence:[],sources:[],diffExcerpt:'',diffTruncated:false,environment:{identity:'environment'},builderChecks:{authoritative:false,checks:[]},previousCycles:[]}};
 const diagnosis={id:'diagnosis',packetId:'packet',packetHash:packet.hash,promptVersion:'mission-debug-diagnosis-v1',status:'RUNNING',output:null,processes:[process],createdAt:'2026-10-06T00:00:00Z',endedAt:null,elapsedMs:null,error:null,cleanup:null,launchPending:true};
 const cycle={id:'cycle',sessionId:'session',number:1,inputCandidateId:'candidate',inputVerificationRunId:'run',failurePacket:packet,diagnosis,correctionAttemptId:null,outputCandidate:null,outputVerificationRun:null,result:'RUNNING',repeatedFailure:false,timings:{}};
 const session={id:'session',missionId:'mission',initialCandidateId:'candidate',initialVerificationRunId:'run',evaluationRevisionId:'evaluation',recipeId:'recipe',contractRevisionId:'contract',planRevisionId:'plan',sliceId:'S1',evaluationHash:'a'.repeat(64),recipeHash:'b'.repeat(64),evaluatorHash:'c'.repeat(64),contractHash:'d'.repeat(64),planHash:'e'.repeat(64),status:'DIAGNOSING',maxCorrections:2,createdAt:'2026-10-06T00:00:00Z',endedAt:null,failureCode:null,message:null,cycles:[cycle]};
 const view={...debug,session};assert.equal(isDebugView(view),true);
 function withDiagnosis(change:Record<string,unknown>){return {...view,session:{...session,cycles:[{...cycle,diagnosis:{...diagnosis,...change}}]}};}
 assert.equal(isDebugView(withDiagnosis({status:'FAILED',cleanup,launchPending:false})),true);
 assert.equal(isDebugView(withDiagnosis({cleanup:{...cleanup,verified:'yes'}})),false);
 assert.equal(isDebugView(withDiagnosis({launchPending:'yes'})),false);
 assert.equal(isDebugView(withDiagnosis({processes:[{...process,pid:'123'}]})),false);
 assert.equal(isDebugView(withDiagnosis({reasoning:'hidden transcript'})),false);
});

test('resolved current sessions suppress start admission reasons, while stale and interrupted history retain inspection reasons',()=>{const reason='Only a current definitive FAILED verification can be corrected.';const resolved={...debug,current:true,reason,session:{status:'RESOLVED'} as DebugSession};assert.equal(visibleDebugReason(resolved),null);assert.equal(visibleDebugReason({...resolved,current:false}),reason);assert.equal(visibleDebugReason({...resolved,session:{status:'INTERRUPTED'} as DebugSession}),reason);});
