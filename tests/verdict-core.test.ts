import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScanner,ScriptTarget,SyntaxKind} from 'typescript/unstable/ast';
import {scoreVerdict} from '../packages/shared/verdict-core.ts';
const raw=readFileSync(new URL('../artifacts/core1/golden.json',import.meta.url),'utf8');
const golden=JSON.parse(raw);
test('CORE-1 frozen golden hash and all historical replay verdicts remain unchanged',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),readFileSync(new URL('../artifacts/core1/golden.json.sha256',import.meta.url),'utf8').trim());
 assert.equal(golden.study.length,19);assert.equal(golden.negativeControls.length,12);
 for(const row of golden.replay){const result=scoreVerdict(row.facts);assert.deepEqual({verdict:result.verdict,canLand:result.canLand},row.expected,row.id);}
});
test('CORE-1 core has no runtime imports, ambient authorities or dynamic evaluation',()=>{
 const source=readFileSync(new URL('../packages/shared/verdict-core.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:import|require|process|globalThis|fetch|Date|performance|eval|Function)\s*(?:\(|\.|\{|["'])/);
 assert.doesNotMatch(source,/Math\.random|setTimeout|setInterval|node:|from\s+["']/);
});

function lintCore(source:string){
 const scanner=createScanner(ScriptTarget.Latest,true,undefined,source);
 const forbidden=new Set(['require','Date','Math','process','fetch','fs','setTimeout','setInterval','setImmediate','clearTimeout','clearInterval','clearImmediate','queueMicrotask','globalThis','eval','Function','performance','XMLHttpRequest','WebSocket']);
 for(let token=scanner.scan();token!==SyntaxKind.EndOfFile;token=scanner.scan()){
  assert.notEqual(token,SyntaxKind.ImportKeyword,'Core imports a module');
  if(token===SyntaxKind.Identifier)assert.equal(forbidden.has(scanner.getTokenValue()),false,'Core uses ambient authority: '+scanner.getTokenValue());
 }
}
test('CORE-1 pinned TypeScript authority lint rejects imports and ambient side effects',()=>{
 lintCore(readFileSync(new URL('../packages/shared/verdict-core.ts',import.meta.url),'utf8'));
 for(const source of ["import 'node:fs';","import type {X} from 'x';","require('fs')","Date.now()","new Date()","Math.random()","process.pid","fetch('/')","fs.readFileSync('x')","setTimeout(()=>{},1)","setInterval(()=>{},1)","globalThis.Date.now()","const clock=Da\\u0074e;"]){assert.throws(()=>lintCore(source),undefined,source);}
 lintCore('const message="Date process import"; // import Date\n');
});
