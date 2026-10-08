import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SpecView} from '../packages/shared/spec.ts';
import {canAcceptSpec,canLandMission,specLabel} from '../apps/web/src/spec-presentation.ts';
const view:SpecView={missionId:'m',phase:'SPEC_REVIEW',specId:'s',accepted:false,goal:'Fix the behavior',nonGoals:[],claims:[{claimId:'c',testName:'native.test.ts',summary:'Behavior',assurance:'INTERFACE',classification:'CHANGE',redOnBase:'FAIL',admitted:true}],reason:null,runId:null,landing:null,decisionEvents:[]};
test('approval is available only for a complete admitted unaccepted review',()=>{assert.equal(canAcceptSpec(view),true);for(const changed of [{phase:'PREPARING' as const},{accepted:true},{specId:null},{goal:null},{claims:[]},{claims:[{...view.claims[0]!,admitted:false}]}])assert.equal(canAcceptSpec({...view,...changed}),false);});
test('landing requires the protected passed phase and current run identity',()=>{const passed:SpecView={...view,phase:'CHECKS_PASSED',accepted:true,runId:'r'};assert.equal(canLandMission(passed),true);for(const changed of [{phase:'VERIFYING' as const},{phase:'LANDED' as const},{accepted:false},{runId:null},{specId:null},{claims:[]}])assert.equal(canLandMission({...passed,...changed}),false);});
test('passed checks and terminal outcomes remain distinct labels',()=>{assert.equal(specLabel({...view,phase:'CHECKS_PASSED'}),'CHECKS PASSED');assert.equal(specLabel({...view,phase:'LANDED'}),'LANDED');assert.equal(specLabel(null),'Spec unavailable');});
