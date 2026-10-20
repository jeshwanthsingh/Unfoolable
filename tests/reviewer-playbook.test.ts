import test from 'node:test';import assert from 'node:assert/strict';
import {validatePlaybookDefinition} from '../apps/server/project-playbooks.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
const definition={version:'project-playbook-v1',setup:null,tests:[{argv:['python3','-m','unittest','discover'],cwd:'.'}],env:{},runner:'unittest',timeoutSeconds:180,knownFailingTests:[],knownFlakyTests:[],notes:[]};
test('omitting the reviewer switch preserves exact existing playbook content and identity',()=>{assert.equal(canonicalContractJson(validatePlaybookDefinition(definition)),canonicalContractJson(definition));for(const skipReviewers of [true,false]){const changed=validatePlaybookDefinition({...definition,skipReviewers});assert.equal(changed.skipReviewers,skipReviewers);assert.notEqual(canonicalContractJson(changed),canonicalContractJson(definition));}assert.throws(()=>validatePlaybookDefinition({...definition,skipReviewers:'true'}),/boolean/);});
