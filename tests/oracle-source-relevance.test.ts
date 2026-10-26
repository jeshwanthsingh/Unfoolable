import {oracleDependencies,uiDependencySkip} from './helpers/portable-dependencies.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {oracleSource} from '../apps/server/oracle-source.ts';
test('hyphenated nonvisual intent retains its real module within the bounded source packet',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-source-relevance-'));mkdirSync(join(root,'frontend/src/store'),{recursive:true});mkdirSync(join(root,'frontend/node_modules'));
 writeFileSync(join(root,'frontend/package.json'),JSON.stringify({devDependencies:{vitest:'4.0.0'}}));writeFileSync(join(root,'frontend/src/store/appointmentStore.ts'),'export function appointmentStore() { return []; }\n');
 for(let n=0;n<16;n++)writeFileSync(join(root,'frontend/src/noise-'+n+'.ts'),'// latest request\nexport const value='+n+';\n');
 const git=(...args:string[])=>execFileSync('git',['-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8'}).trim();git('init','-q');git('add','frontend/package.json','frontend/src');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','-c','commit.gpgsign=false','commit','-qm','source fixture');
 const source=await oracleSource(root,git('rev-parse','HEAD'),'Ensure the latest appointment-list request wins.');assert.ok(Object.hasOwn(source.source,'frontend/src/store/appointmentStore.ts'));assert.ok(Object.keys(source.source).length<=14);assert.ok(Buffer.byteLength(JSON.stringify(source.source))<100000);
});
test('native Vitest collection preserves generated Unicode and quoted titles',{skip:uiDependencySkip},async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-source-titles-'));mkdirSync(join(root,'frontend/src/__tests__'),{recursive:true});
 const {symlinkSync}=await import('node:fs');symlinkSync(oracleDependencies,join(root,'frontend/node_modules'));
 writeFileSync(join(root,'frontend/package.json'),JSON.stringify({type:'module',devDependencies:{vitest:'4.0.18'}}));writeFileSync(join(root,'frontend/tsconfig.json'),'{}');
 writeFileSync(join(root,'frontend/src/__tests__/quoted.test.ts'),`import {test,expect,describe} from 'vitest';describe('Unicode',()=>{test.each(['Hindi हिन्दी','emoji 😀','CJK 中文'])('round-trips %s',value=>expect(value).toBe(value));test("patient's identity survives",()=>expect(1).toBe(1));test.skip('not run',()=>{throw Error('skip');});});`);
 const git=(...args:string[])=>execFileSync('git',['-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8'}).trim();git('init','-q');git('add','frontend/package.json','frontend/tsconfig.json','frontend/src');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','-c','commit.gpgsign=false','commit','-qm','native fixture');
 const source=await oracleSource(root,git('rev-parse','HEAD'),'Check names',{directory:join(root,'inventory'),signal:new AbortController().signal});
 assert.deepEqual(source.expectedTests,['Unicode round-trips Hindi हिन्दी','Unicode round-trips emoji 😀','Unicode round-trips CJK 中文',"Unicode patient's identity survives",'Unicode not run'].map(name=>JSON.stringify(['src/__tests__/quoted.test.ts',name])).sort());
 assert.ok(source.inventory?.observationPath);
});
