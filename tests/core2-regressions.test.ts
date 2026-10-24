import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreVerdict,type VerdictFacts} from '../packages/shared/verdict-core.ts';
const row={exitCode:0,tests:[{id:'old',status:'PASS' as const}]};
const mismatch="Candidate ran a different set of commands than BASE; results can't be compared.";
for(const [name,base,candidate] of [
 ['candidate longer',[row],[row,row]],['BASE longer',[row,row],[row]],
 ['missing BASE index',Array(1),[row]],['missing candidate index',[row],Array(1)]
] as const)test('CORE-2 command mismatch: '+name,()=>{
 const result=scoreVerdict({path:'project-tests',base:[...base],candidate:[...candidate]});
 assert.equal(result.verdict,'ERROR');assert.deepEqual(result.reasons,[mismatch]);assert.equal(result.executionError,true);
});
test('CORE-2 equal commands retain regression and gap behavior',()=>{
 assert.equal(scoreVerdict({path:'project-tests',base:[row],candidate:[row]}).verdict,'PASSED WITH GAPS');
 assert.equal(scoreVerdict({path:'project-tests',base:[row],candidate:[{exitCode:1,tests:[{id:'old',status:'FAIL'}]}]}).verdict,'FAILED');
});
test('CORE-2 combined ERROR trace never claims passing',()=>{
 const result=scoreVerdict({path:'combined',native:{verdict:'ERROR',gaps:[],failures:[]},project:{verdict:'VERIFIED',gaps:[],failures:[]}});
 assert.equal(result.verdict,'ERROR');assert.equal(result.trace.find(s=>s.rule==='combined-checks')?.passed,false);
});
test('CORE-2 unknown runtime fact discriminator returns ERROR',()=>{
 const result=scoreVerdict({path:'future'} as unknown as VerdictFacts);
 assert.equal(result.verdict,'ERROR');assert.deepEqual(result.reasons,['Unknown fact type']);
});

import {budgetExceeded} from '../apps/server/ticket-budget.ts';
test('CORE-2 shell supplies the legacy writer default and explicit limits win',()=>{
 const budget={activeMilliseconds:0,extended:false,commands:0,reportedCodexTokens:null,reportedWriterTokens:40000,limits:{maxCommands:80,maxMinutes:15,maxCodexTokens:120000}};
 assert.equal(budgetExceeded(budget),null);
 assert.equal(budgetExceeded({...budget,reportedWriterTokens:40001}),'Stopped because Test Writer used its full token budget.');
 assert.equal(budgetExceeded({...budget,reportedWriterTokens:40001,limits:{...budget.limits,maxWriterTokens:60000}}),null);
 const scored=scoreVerdict({path:'budget',commands:0,reportedCodexTokens:null,reportedWriterTokens:21,limits:{maxCommands:80,maxCodexTokens:120000,maxWriterTokens:20}});
 assert.equal(scored.budgetReason,'Stopped because Test Writer used its full token budget.');
});
