import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {oracleSource} from '../apps/server/oracle-source.ts';
test('hyphenated nonvisual intent retains its real module within the bounded source packet',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-source-relevance-'));mkdirSync(join(root,'frontend/src/store'),{recursive:true});mkdirSync(join(root,'frontend/node_modules'));
 writeFileSync(join(root,'frontend/package.json'),JSON.stringify({devDependencies:{vitest:'4.0.0'}}));writeFileSync(join(root,'frontend/src/store/appointmentStore.ts'),'export function appointmentStore() { return []; }\n');
 for(let n=0;n<16;n++)writeFileSync(join(root,'frontend/src/noise-'+n+'.ts'),'// latest request\nexport const value='+n+';\n');
 const git=(...args:string[])=>execFileSync('/opt/homebrew/bin/git',['-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8'}).trim();git('init','-q');git('add','frontend');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','-c','commit.gpgsign=false','commit','-qm','source fixture');
 const source=await oracleSource(root,git('rev-parse','HEAD'),'Ensure the latest appointment-list request wins.');assert.ok(Object.hasOwn(source.source,'frontend/src/store/appointmentStore.ts'));assert.ok(Object.keys(source.source).length<=14);assert.ok(Buffer.byteLength(JSON.stringify(source.source))<100000);
});
test('frozen Vitest titles preserve opposite quotes and escaped delimiters',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-source-titles-'));mkdirSync(join(root,'frontend/src/__tests__'),{recursive:true});mkdirSync(join(root,'frontend/node_modules'));
 writeFileSync(join(root,'frontend/package.json'),JSON.stringify({devDependencies:{vitest:'4.0.0'}}));
 writeFileSync(join(root,'frontend/src/__tests__/quoted.test.ts'),String.raw`test('should set user.type to "doctor" after login',()=>{});it("patient's identity survives",()=>{});test('escaped \'quote\' survives',()=>{});test("escaped \"double\" survives",()=>{});`);
 const git=(...args:string[])=>execFileSync('/opt/homebrew/bin/git',['-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8'}).trim();git('init','-q');git('add','frontend');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','-c','commit.gpgsign=false','commit','-qm','quoted test fixture');
 const source=await oracleSource(root,git('rev-parse','HEAD'),'Check names');assert.deepEqual(source.expectedTests,[`escaped "double" survives`,`escaped 'quote' survives`,`patient's identity survives`,`should set user.type to "doctor" after login`].sort());
});
