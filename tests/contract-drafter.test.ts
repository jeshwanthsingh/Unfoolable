import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contractDrafterArguments,CONTRACT_PROMPT,CONTRACT_TIMEOUT_MS} from '../apps/server/contract-drafter.ts';
test('contract drafting reuses the readonly tool-disabled structured boundary without execution capability',()=>{
 const args=contractDrafterArguments('/private/tmp/owned-contract');
 assert.equal(args[args.indexOf('--sandbox')+1],'read-only');
 for(const option of ['--output-schema','--output-last-message','--ephemeral','--ignore-user-config','--ignore-rules'])assert.ok(args.includes(option));
 for(const feature of ['shell_tool','apps','plugins','multi_agent','image_generation','browser_use','view_image'])assert.ok(args.some((a,i)=>a==='--disable'&&args[i+1]===feature));
 assert.ok(!args.some(a=>a.includes('dangerously')||a==='--worktree'||a==='--add-dir'));
 assert.equal(CONTRACT_TIMEOUT_MS,90000);assert.ok(CONTRACT_PROMPT.startsWith('mission-contract-v1'));assert.ok(CONTRACT_PROMPT.length<3000);
 assert.match(CONTRACT_PROMPT,/WHAT/);assert.match(CONTRACT_PROMPT,/USER_EDIT/);assert.match(CONTRACT_PROMPT,/never accept/i);
});
