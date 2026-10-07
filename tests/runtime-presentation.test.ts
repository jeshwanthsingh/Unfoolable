import test from 'node:test';
import assert from 'node:assert/strict';
import type {BuildAttempt,BuildView} from '../packages/shared/build.ts';
import type {RuntimePermissionRequest} from '../packages/shared/permissions.ts';
import {isAttentionResponse} from '../packages/shared/attention.ts';
import {buildActive,executionStation,mergeBuildView} from '../apps/web/src/presentation.ts';
const attempt={id:'attempt',generation:1,status:'RUNNING'} as BuildAttempt;
const permission={id:'permission',attemptId:'attempt',generation:1,status:'PENDING'} as RuntimePermissionRequest;
const view:BuildView={attempt,candidate:null,events:[],nextSequence:0,eventsTruncated:false,workerPresent:true,current:true,eligible:false,phase:'BUILDING',permissions:[permission]};
test('pending permission pauses the real workbench without claiming completion',()=>{
 assert.equal(executionStation(view).status,'WAITING FOR YOU');assert.equal(executionStation(view).state,'attention');assert.equal(buildActive(view),true);
 assert.equal(executionStation({...view,permissions:[{...permission,attemptId:'old'}]}).status,'BUILDING');
 assert.equal(executionStation({...view,permissions:[{...permission,generation:0}]}).status,'BUILDING');
 for(const status of ['ALLOW_DECIDED','DENY_DECIDED','TRANSPORT_WRITTEN','RESOLVED','INVALIDATED','DELIVERY_UNKNOWN'] as const){const next={...view,permissions:[{...permission,status}]};assert.equal(executionStation(next).status,'BUILDING');assert.notEqual(executionStation(next).state,'captured');}
});
test('cancelling remains active until durable cleanup terminates it; ambiguous cleanup blocks',()=>{
 const cancelling={...view,attempt:{...attempt,status:'CANCELLING' as const}};assert.equal(buildActive(cancelling),true);assert.equal(executionStation(cancelling).status,'CANCELLING');assert.equal(executionStation(cancelling).state,'attention');
 const interrupted={...view,attempt:{...attempt,status:'INTERRUPTED' as const},workerPresent:false};assert.equal(buildActive(interrupted),false);assert.equal(executionStation(interrupted).status,'INTERRUPTED');
 const blocked={...interrupted,attempt:{...attempt,status:'RECONCILE_REQUIRED' as const}};assert.equal(buildActive(blocked),false);assert.equal(executionStation(blocked).status,'RECONCILE REQUIRED');assert.equal(executionStation(blocked).state,'failed');
});
test('fresh snapshot replaces permission history and preserves no permission from an old generation',()=>{
 const next=mergeBuildView(view,{...view,attempt:{...attempt,id:'fresh',generation:2},permissions:[],events:[]});assert.deepEqual(next.permissions,[]);
 const invalid=mergeBuildView(view,{...view,permissions:[{...permission,status:'INVALIDATED'}],workerPresent:false,attempt:{...attempt,status:'INTERRUPTED'}});assert.equal(invalid.permissions?.[0]?.status,'INVALIDATED');assert.equal(invalid.workerPresent,false);
});
test('attention strictly accepts runtime and reconciliation alongside preserved planning contracts',()=>{
 const item={kind:'runtime_permission',requestId:'permission',missionId:'mission',projectId:'project',projectName:'Fixture',originalIntent:'Build fixture',sliceId:'S1',path:'/tmp/exact-file',reason:'Write fixture',requestedScope:'turn'};
 assert.equal(isAttentionResponse({items:[item],count:1}),true);assert.equal(isAttentionResponse({items:[{...item,requestedScope:'session'}],count:1}),false);assert.equal(isAttentionResponse({items:[{...item,network:true}],count:1}),false);assert.equal(isAttentionResponse({items:[{...item,reason:'x'.repeat(2001)}],count:1}),false);
 const reconcile={kind:'reconciliation',attemptId:'attempt',missionId:'mission',projectId:'project',projectName:'Fixture',originalIntent:'Build fixture',reason:'Owned process identity is uncertain'};
 assert.equal(isAttentionResponse({items:[reconcile],count:1}),true);assert.equal(isAttentionResponse({items:[reconcile],count:0}),false);assert.equal(isAttentionResponse({items:[{...reconcile,forceClear:true}],count:1}),false);
});
