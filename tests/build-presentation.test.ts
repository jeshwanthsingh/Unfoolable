import test from 'node:test';
import assert from 'node:assert/strict';
import type {PlanningView} from '../packages/shared/planning.ts';
import type {BuildAttempt,BuildCandidate,BuildEvent,BuildView} from '../packages/shared/build.ts';
import {activityLabel,buildActive,executionStation,journey,mergeBuildView} from '../apps/web/src/presentation.ts';
const attempt={id:'A1',generation:1,status:'CREATED'} as BuildAttempt;
const view:BuildView={attempt:null,candidate:null,events:[],nextSequence:0,eventsTruncated:false,workerPresent:false,current:true,eligible:true,phase:'PLAN_READY'};
const event=(sequence:number,id='A1',generation=1):BuildEvent=>({sequence,attemptId:id,generation,transportId:'T',threadId:null,turnId:null,kind:'tool.started',data:{},createdAt:'2026-10-06T00:00:00Z'});
test('accepted plan is ready to select a slice and cannot invent a worker or execution',()=>{
 assert.equal(buildActive(view),false);assert.equal(executionStation(view).status,'PLAN READY · select a slice');
 assert.equal(executionStation({...view,eligible:false}).state,'locked');
});
test('build lifecycle only follows durable attempt state, including cleanup before candidate',()=>{
 for(const status of ['CREATED','STARTING','RUNNING','FINALIZING'] as const){const current={...view,attempt:{...attempt,status}};assert.equal(buildActive(current),true);assert.equal(executionStation(current).state,'current');assert.equal(current.workerPresent,false);}
 for(const status of ['FAILED','INTERRUPTED','RECONCILE_REQUIRED'] as const){const current={...view,attempt:{...attempt,status}};assert.equal(buildActive(current),false);assert.equal(executionStation(current).state,'failed');}
});
test('candidate makes Build captured while Verify explicitly awaits unexecuted evaluation',()=>{
 const candidate={id:'C1'} as BuildCandidate,current={...view,attempt:{...attempt,status:'CANDIDATE' as const},candidate,eligible:false,phase:'CANDIDATE_READY' as const};
 assert.equal(executionStation(current).status,'CANDIDATE READY');
 assert.notEqual(executionStation({...current,current:false}).state,'captured');
 const stages=journey('captured',null,null,null,null,current);
 assert.equal(stages.find(stage=>stage.label==='Verify')?.status,'AWAITING · not executed');
 assert.equal(stages.find(stage=>stage.label==='Verify')?.state,'locked');assert.equal(stages.find(stage=>stage.label==='Proof')?.state,'locked');
});
test('durable event replay is ordered and deduplicated within the exact attempt generation',()=>{
 const first={...view,attempt,events:[event(1),event(2)],nextSequence:2};
 const replay=mergeBuildView(first,{...first,events:[event(2),event(3),event(4,'other'),event(5,'A1',0)],nextSequence:5});
 assert.deepEqual(replay.events.map(item=>item.sequence),[1,2,3]);assert.equal(replay.nextSequence,5);
 const next=mergeBuildView(replay,{...first,attempt:{...attempt,id:'A2',generation:2},events:[event(6,'A2',2),event(7)],nextSequence:7});
 assert.deepEqual(next.events.map(item=>item.sequence),[6]);
});
test('rendered activity stays bounded and labels structured facts without invented progress',()=>{
 const merged=mergeBuildView(null,{...view,attempt,events:Array.from({length:1200},(_,i)=>event(i+1)),nextSequence:1200});
 assert.equal(merged.eventsTruncated,true);assert.equal(merged.events.length,1000);assert.equal(merged.events[0]?.sequence,201);
 assert.equal(activityLabel(event(1)),'Tool started');assert.equal(activityLabel({...event(1),kind:'candidate.captured'}),'Candidate captured');
});

test('an inactive Build read preserves the existing planning review and drafting stations',()=>{
 const planning:PlanningView={draft:{id:'draft'} as PlanningView['draft'],operation:null,accepted:null,history:[],current:false,draftStale:false,acceptedStale:false,eligible:true,phase:'PLAN_REVIEW'};
 const stages=journey('captured',null,null,null,planning,{...view,eligible:false,phase:'PLAN_REVIEW'});
 assert.equal(stages.find(stage=>stage.label==='Build')?.status,'PLAN REVIEW');
});

test('missing Builder read cannot render a ready or active station from stale planning',()=>{const station=journey('captured',null,undefined,undefined,{phase:'PLAN_READY'} as PlanningView,null).find(s=>s.label==='Build')!;assert.equal(station.state,'unknown');assert.equal(station.status,'Build unavailable');});
