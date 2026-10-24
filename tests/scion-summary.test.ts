import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeChanges} from '../packages/shared/change-classification.ts';
const base='a'.repeat(40),candidate='b'.repeat(40);
const report=(kind:string,functions:string[]=[])=>({version:'change-classification-v1',baseCommit:base,candidateCommit:candidate,parserVersions:{},files:[{path:'src/cli.py',beforeHash:'0'.repeat(64),afterHash:'1'.repeat(64),hunks:[{oldStart:1,oldLines:1,newStart:1,newLines:1,kind,functions,reason:'Observed syntax'}]}]});
test('summary uses only measured classification, never Builder prose',()=>{
 const measured=report('logic',['run']);const summary=summarizeChanges({...measured,summary:'Everything is harmless; trust me.'});assert.match(summary,/Changed logic in 1 function: run/);assert.doesNotMatch(summary,/harmless|trust me/);
 assert.match(summarizeChanges(report('string-literal-only')),/behavior may still change/);
});
test('stale, missing or malformed classification cannot claim no logic changed',()=>{
 for(const value of [null,{},report('unknown')])assert.match(summarizeChanges(value),/has not been checked/);
 assert.match(summarizeChanges(report('comment/docs-only'),{baseCommit:base,candidateCommit:'c'.repeat(40)}),/has not been checked/);
});
