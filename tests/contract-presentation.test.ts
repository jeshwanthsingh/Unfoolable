import test from 'node:test';
import assert from 'node:assert/strict';
import {journey} from '../apps/web/src/presentation.ts';
import type {ContractView} from '../packages/shared/contracts.ts';
const base:ContractView={draft:null,operation:null,accepted:null,current:false,draftStale:false,acceptedStale:false,eligible:true,phase:'CLARIFIED'};
function define(data:ContractView){return journey('captured',null,null,data).find(s=>s.label==='Define')!;}
test('Define derives preparing and drafting only from durable operation status',()=>{
 assert.equal(define(base).status,'Ready to draft');
 assert.equal(define({...base,operation:{status:'PREPARING'} as ContractView['operation']}).status,'Preparing contract');
 assert.equal(define({...base,operation:{status:'RUNNING'} as ContractView['operation']}).status,'DRAFTING');
});
test('Define distinguishes review, accepted current and stale records',()=>{
 assert.equal(define({...base,phase:'CONTRACT_REVIEW',draft:{status:'SUCCEEDED'} as ContractView['draft']}).state,'attention');
 assert.equal(define({...base,phase:'CONTRACT_READY',current:true,accepted:{revision:1} as ContractView['accepted']}).status,'CONTRACT READY');
 assert.equal(define({...base,phase:'CONTRACT_READY',current:false,acceptedStale:true,accepted:{revision:1} as ContractView['accepted']}).status,'Contract historical');
 assert.equal(define({...base,draftStale:true,draft:{status:'SUCCEEDED'} as ContractView['draft']}).status,'Draft stale');
});
test('Build Verify Proof stay locked through all contract phases',()=>{
 for(const phase of ['CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY'] as const){const stages=journey('captured',null,null,{...base,phase});for(const label of ['Build','Verify','Proof'])assert.equal(stages.find(s=>s.label===label)?.state,'locked');}
});

test('Accepted source draft changing is historical, never a new draft',()=>{
 const state={...base,phase:'CLARIFIED' as const,draftStale:true,acceptedStale:true,draft:{id:'d1',status:'SUCCEEDED'} as NonNullable<ContractView['draft']>,accepted:{revision:1,draftId:'d1'} as NonNullable<ContractView['accepted']>};
 assert.equal(define(state).status,'Contract historical');
});
test('Unavailable and ineligible contract reads cannot activate Define',()=>{
 assert.equal(journey('captured',null,null,null).find(s=>s.label==='Define')?.state,'unknown');
 assert.equal(define({...base,eligible:false}).status,'Clarification required');
});
