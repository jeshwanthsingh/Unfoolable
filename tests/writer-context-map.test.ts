import {nativeToolSkip} from './helpers/portable-dependencies.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {relevantBaseDefinitions,writerContextPack} from '../apps/server/test-writer-context.ts';
import {fixture,git} from './helpers/verify-only-fixture.ts';import {writeFileSync} from 'node:fs';import {join} from 'node:path';
test('tree-sitter selects relevant Python definitions and imports with UTF-8 byte-accurate excerpts',{skip:nativeToolSkip},async()=>{
 const source="import sqlite3\nimport unrelated_library\n# हिन्दी 😀\ndef source_list(topic):\n    return sqlite3.connect(topic)\n\ndef irrelevant():\n    return unrelated_library.run()\n";
 const map=await relevantBaseDefinitions('cli.py',source,'source_list topic',4000);
 assert.match(map.content,/def source_list/);assert.match(map.content,/import sqlite3/);assert.doesNotMatch(map.content,/def irrelevant|import unrelated_library/);assert.equal(map.versions['tree-sitter'],'0.25.2');assert.ok(map.ranges.every(r=>r.startLine<=r.endLine));
});
test('tree-sitter supports TSX exported arrows and classes without evaluating repository code',{skip:nativeToolSkip},async()=>{
 const source="import {client} from './http';\nimport {noise} from './noise';\nexport const cancelAppointment = (id: string) => client.cancel(id);\nexport class Unrelated { run() { return noise(); } }\n";
 const map=await relevantBaseDefinitions('store.tsx',source,'cancelAppointment',4000);
 assert.match(map.content,/cancelAppointment/);assert.match(map.content,/import \{client\}/);assert.doesNotMatch(map.content,/Unrelated|import \{noise\}/);
});
test('syntax errors and definitions larger than the available budget fail closed',{skip:nativeToolSkip},async()=>{
 await assert.rejects(relevantBaseDefinitions('bad.py','def broken(:','broken',1000));
 await assert.rejects(relevantBaseDefinitions('large.py',"def relevant():\n    return '"+'x'.repeat(5000)+"'\n",'relevant',100));
});
test('large immutable BASE files contribute relevant excerpts instead of disappearing from context',{skip:nativeToolSkip},async()=>{
 const f=fixture();try{
 const source='import sqlite3\n'+Array.from({length:500},(_,n)=>`def irrelevant_${n}():\n    return ${n}\n`).join('')+'def source_list(topic):\n    return sqlite3.connect(topic)\n';
 writeFileSync(join(f.repo,'cli.py'),source);git(f.repo,'add','.');git(f.repo,'commit','-qm','large BASE');const base=git(f.repo,'rev-parse','HEAD');writeFileSync(join(f.repo,'cli.py'),'CANDIDATE_ONLY');
 const pack=await writerContextPack(f.repo,base,'source_list topic',join(f.data,'pack'),{changedPaths:['cli.py'],playbookCommand:'python3 -m unittest',tokenBudget:40000});
 assert.match(pack.files['cli.py']??'',/def source_list/);assert.doesNotMatch(JSON.stringify(pack),/CANDIDATE_ONLY|def irrelevant_499/);assert.ok(pack.bytes<=32000);assert.equal((pack.selections['cli.py'] as {mode:string}).mode,'BASE_EXCERPTS');
 }finally{f.db.close();}
});
