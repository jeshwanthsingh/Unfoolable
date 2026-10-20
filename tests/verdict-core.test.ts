import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
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

test('CORE-1 authority lint rejects imports, exports from modules and ambient side effects',()=>{
 const source=ts.createSourceFile('verdict-core.ts',readFileSync(new URL('../packages/shared/verdict-core.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const forbidden=new Set(['require','process','globalThis','fetch','Date','performance','eval','Function','setTimeout','setInterval','XMLHttpRequest','WebSocket']);
 const visit=(node:ts.Node)=>{
  assert.equal(ts.isImportDeclaration(node)||ts.isImportEqualsDeclaration(node)||(ts.isExportDeclaration(node)&&!!node.moduleSpecifier),false,'Core imports a module');
  if(ts.isIdentifier(node))assert.equal(forbidden.has(node.text),false,'Core uses ambient authority: '+node.text);
  if(ts.isPropertyAccessExpression(node))assert.notEqual(node.getText(source),'Math.random');
  ts.forEachChild(node,visit);
 };visit(source);
});
