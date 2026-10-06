import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planningDrafterArguments,PLANNING_PROMPT,PLANNING_TIMEOUT_MS} from '../apps/server/planning-drafter.ts';
import {PLANNING_OUTPUT_SCHEMA} from '../apps/server/planning-validation.ts';
import {PLANNING_PROMPT_VERSION} from '../packages/shared/planning.ts';
test('planning reuses the readonly structured tool-free boundary and never starts a builder',()=>{
 const args=planningDrafterArguments('/private/tmp/owned-plan');assert.equal(args[args.indexOf('--sandbox')+1],'read-only');
 for(const option of ['--output-schema','--output-last-message','--ephemeral','--ignore-user-config','--ignore-rules'])assert.ok(args.includes(option));
 for(const feature of ['shell_tool','apps','plugins','multi_agent','image_generation','browser_use','view_image'])assert.ok(args.some((a,i)=>a==='--disable'&&args[i+1]===feature));
 assert.ok(!args.some(a=>a.includes('dangerously')||a==='--worktree'||a==='--add-dir'));assert.equal(PLANNING_TIMEOUT_MS,90000);
 assert.ok(PLANNING_PROMPT.startsWith(PLANNING_PROMPT_VERSION));assert.ok(PLANNING_PROMPT.length<3500);assert.match(PLANNING_PROMPT,/end-to-end/);assert.match(PLANNING_PROMPT,/never accept/i);
});
test('the provider schema excludes unsupported uniqueItems while server validation remains authoritative',()=>{
 assert.ok(!JSON.stringify(PLANNING_OUTPUT_SCHEMA).includes('uniqueItems'));
});
