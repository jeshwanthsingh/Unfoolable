import test from 'node:test';
import assert from 'node:assert/strict';
import {journey} from '../apps/web/src/presentation.ts';
import type {PlanningView} from '../packages/shared/planning.ts';
const base:PlanningView={draft:null,operation:null,accepted:null,history:[],current:false,draftStale:false,acceptedStale:false,eligible:true,phase:'CONTRACT_READY'};
const stations=(planning:PlanningView)=>journey('captured',null,null,null,planning);
test('Build preparation follows persisted planning operation only',()=>{
 assert.equal(stations(base).find(s=>s.label==='Build')?.status,'READY TO PLAN');
 assert.equal(stations({...base,operation:{status:'PREPARING'} as PlanningView['operation']}).find(s=>s.label==='Build')?.status,'PREPARING PLAN');
 assert.equal(stations({...base,operation:{status:'RUNNING'} as PlanningView['operation']}).find(s=>s.label==='Build')?.status,'DRAFTING PLAN');
});
test('Plan review is attention and Plan Ready does not start a worker',()=>{
 assert.equal(stations({...base,phase:'PLAN_REVIEW',draft:{id:'d1'} as PlanningView['draft']}).find(s=>s.label==='Build')?.state,'attention');
 const ready=stations({...base,phase:'PLAN_READY',current:true,accepted:{} as PlanningView['accepted']});
 assert.equal(ready.find(s=>s.label==='Build')?.status,'PLAN READY');
 assert.equal(ready.find(s=>s.label==='Build')?.state,'current');
 for(const label of ['Verify','Proof'])assert.equal(ready.find(s=>s.label===label)?.state,'locked');
});
test('Stale plans cannot present current readiness; blueprint is never observed proof',()=>{
 const stale=stations({...base,phase:'CONTRACT_READY',acceptedStale:true,accepted:{} as PlanningView['accepted']});
 assert.notEqual(stale.find(s=>s.label==='Build')?.status,'PLAN READY');
 assert.equal(stale.find(s=>s.label==='Verify')?.status,'Execution unavailable');
});
test('a current review candidate takes precedence over a historical accepted pair',()=>{
 const fresh=stations({...base,phase:'PLAN_REVIEW',draft:{id:'fresh'} as PlanningView['draft'],acceptedStale:true,accepted:{} as PlanningView['accepted']});
 assert.equal(fresh.find(s=>s.label==='Build')?.status,'PLAN REVIEW');
});
