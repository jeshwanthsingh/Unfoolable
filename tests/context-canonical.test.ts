import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalJson,payloadHash,trackedPathHash,captureStableObservation,parseStatus} from '../apps/server/context-observation.ts';
const state={baseHead:'a'.repeat(40),branch:'main',changes:[],trackedPaths:['README.md','apps/web/package.json','tests/example.test.ts']};
test('canonical object/array ordering and tracked-path set fingerprint are deterministic',()=>{
 assert.equal(canonicalJson({z:1,a:[{b:2,a:1},'z','a']}),canonicalJson({a:['a','z',{a:1,b:2}],z:1}));assert.equal(trackedPathHash(['b','a','a']),trackedPathHash(['a','b']));assert.notEqual(trackedPathHash(['a']),trackedPathHash(['b']));assert.equal(payloadHash({b:2,a:1}),payloadHash({a:1,b:2}));assert.notEqual(payloadHash({a:1}),payloadHash({a:2}));
});
test('bounded observations keep truthful counts and explicit truncation',async()=>{
 const s={...state,trackedPaths:Array.from({length:65},(_,i)=>`area-${i}/package.json`)};const payload=await captureStableObservation(async()=>s);assert.equal(payload.trackedFiles.count,65);assert.equal(payload.structure.total,65);assert.equal(payload.structure.entries.length,40);assert.equal(payload.structure.truncated,true);assert.equal(payload.manifestPaths.total,65);assert.equal(payload.manifestPaths.paths.length,40);assert.equal(payload.manifestPaths.truncated,true);
});
test('consistency rejects changed HEAD, branch, status or tracked-path inventory deterministically',async()=>{
 for(const modified of [{...state,baseHead:'b'.repeat(40)},{...state,branch:null},{...state,changes:[{path:'README.md',category:'modified' as const,status:' M'}]},{...state,trackedPaths:['new']}]){let n=0;await assert.rejects(captureStableObservation(async()=>++n===1?state:modified),{code:'REPOSITORY_CHANGED_DURING_CAPTURE'});}
});
test('porcelain NUL records preserve rename paths and classify conflicts and untracked',()=>{
 assert.deepEqual(parseStatus('R  new name\u0000old name\u0000?? note\u0000UU conflict\u0000'),[{path:'new name',from:'old name',category:'renamed',status:'R '},{path:'note',category:'untracked',status:'??'},{path:'conflict',category:'conflicted',status:'UU'}]);
});
