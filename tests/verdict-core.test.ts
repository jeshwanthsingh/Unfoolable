import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScanner,SyntaxKind,tokenIsIdentifierOrKeyword} from 'typescript/unstable/ast';
import {scoreVerdict} from '../packages/shared/verdict-core.ts';
const raw=readFileSync(new URL('../artifacts/core1/golden.json',import.meta.url),'utf8');
const golden=JSON.parse(raw);
test('CORE-1 frozen golden hash and all historical replay verdicts remain unchanged',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),readFileSync(new URL('../artifacts/core1/golden.json.sha256',import.meta.url),'utf8').trim());
 assert.equal(golden.study.length,19);assert.equal(golden.negativeControls.length,12);
 for(const row of golden.replay){const result=scoreVerdict(row.facts);assert.deepEqual({verdict:result.verdict,eligibleForReview:result.eligibleForReview},{verdict:row.expected.verdict,eligibleForReview:row.expected.canLand},row.id);}
});
test('CORE-1 core has no runtime imports, ambient authorities or dynamic evaluation',()=>{
 for(const path of ['../packages/shared/verdict-core.ts','../packages/shared/cores/verdict-core-v1.ts']){
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:import|require|process|globalThis|fetch|Date|performance|eval|Function)\s*(?:\(|\.|\{|["'])/);
 assert.doesNotMatch(source,/Math\.random|setTimeout|setInterval|node:|from\s+["']/);
 }
});

function lintCore(source:string){
 const scanner=createScanner(true,undefined,source);
 const forbidden=new Set(['require','Date','Math','process','fetch','fs','setTimeout','setInterval','setImmediate','clearTimeout','clearInterval','clearImmediate','queueMicrotask','globalThis','eval','Function','performance','XMLHttpRequest','WebSocket']);
 for(let token=scanner.scan();token!==SyntaxKind.EndOfFile;token=scanner.scan()){
  assert.notEqual(token,SyntaxKind.ImportKeyword,'Core imports a module');
  if(tokenIsIdentifierOrKeyword(token))assert.equal(forbidden.has(scanner.getTokenValue()),false,'Core uses ambient authority: '+scanner.getTokenValue());
 }
}
test('CORE-1 pinned TypeScript authority lint rejects imports and ambient side effects',()=>{
 for(const path of ['../packages/shared/verdict-core.ts','../packages/shared/cores/verdict-core-v1.ts'])lintCore(readFileSync(new URL(path,import.meta.url),'utf8'));
 for(const source of ["import 'node:fs';","import type {X} from 'x';","require('fs')","Date.now()","new Date()","Math.random()","process.pid","fetch('/')","fs.readFileSync('x')","setTimeout(()=>{},1)","setInterval(()=>{},1)","globalThis.Date.now()","const clock=Da\\u0074e;"]){assert.throws(()=>lintCore(source),source);}
 lintCore('const message="Date process import"; // import Date\n');
});

test('legacy protected aggregate is an explicit provenance-bound fact even with empty layers',()=>{
 const facts={path:'native-ticket' as const,layers:[],gaps:[],supplied:{verdict:'PASSED WITH GAPS' as const,provenance:{source:'protected-verifier' as const,verificationId:'fixture',evidenceHash:'fixture'}}};
 const decision=scoreVerdict(facts);assert.equal(decision.verdict,'PASSED WITH GAPS');assert.deepEqual(decision.facts,facts);assert.match(decision.trace[0]!.explanation,/protected verifier fixture/);
});

test('released v1 source is byte-identical to main 4abc25a and both registry hashes are exact',()=>{
 const versions=JSON.parse(readFileSync(new URL('../docs/CORE_VERSIONS.json',import.meta.url),'utf8'));
 assert.equal(versions.current,'verdict-core-v2');
 for(const core of versions.versions){const bytes=readFileSync(new URL('../'+core.source,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),core.sha256);}
 assert.equal(versions.versions.find((c:{version:string})=>c.version==='verdict-core-v1').sha256,'9e343a112cb4129e2526a695127949095997eeddcd14c643c5908aafdb627d33');
});
