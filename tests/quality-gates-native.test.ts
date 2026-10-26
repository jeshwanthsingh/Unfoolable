import {nativeToolSkip} from './helpers/portable-dependencies.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,realpathSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {execFileSync} from 'node:child_process';import {runQualityGates} from '../apps/server/quality-gates.ts';
function fixture(files:Record<string,string>){const root=realpathSync(mkdtempSync(join(tmpdir(),'cc-quality-'))),repo=join(root,'repo');mkdirSync(repo);for(const [p,v]of Object.entries(files)){mkdirSync(join(repo,p,'..'),{recursive:true});writeFileSync(join(repo,p),v);}const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@invalid');git('add','.');git('commit','-qm','BASE');return {root,repo,git,base:git('rev-parse','HEAD')};}
test('offline native Python gates catch new lint/type/secret/security defects and ignore old warnings',{skip:nativeToolSkip},async()=>{
 const f=fixture({'app.py':'import math\ndef value() -> int:\n    return 1\n'});const fake='ghp_'+Array.from({length:36},(_,i)=>'aB9cD2eF7gH4jK8mN3pQ6rS1tU5vW0xYz'[i%34]).join('');
 writeFileSync(join(f.repo,'app.py'),`import math\nimport os\ndef value() -> int:\n    return "wrong"\ndef dangerous(data):\n    return eval(data)\napi_key = "${fake}"\n`);f.git('add','.');f.git('commit','-qm','Candidate');
 const result=await runQualityGates(f.repo,f.base,f.git('rev-parse','HEAD'),['ruff','pyright','bandit','opengrep','gitleaks','detect-secrets'],join(f.root,'checks'),new AbortController().signal);
 for(const gate of result.gates)assert.equal(gate.status,'FAIL',JSON.stringify(gate));assert.ok(!result.gates[0]!.findings.some(x=>x.message.includes('`math`')));assert.ok(result.gates[0]!.baselineCount>0);assert.ok(!JSON.stringify(result).includes(fake));
 if(process.env.CC_GATE_PROOF_DIR)writeFileSync(join(process.env.CC_GATE_PROOF_DIR,'python-plants.json'),JSON.stringify(result,null,2));
});
test('native JS fallback and TypeScript catch new problems; OSV reads the predownloaded database offline',{skip:nativeToolSkip},async()=>{
 const lock=(version:string)=>JSON.stringify({name:'fixture',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'fixture',version:'1.0.0'},'node_modules/lodash':{version,resolved:'https://registry.npmjs.org/lodash/-/lodash-'+version+'.tgz'}}});
 const f=fixture({'src/value.ts':'export const value: number = 1;\n','tsconfig.json':JSON.stringify({compilerOptions:{strict:true,types:[],target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext'},files:['src/value.ts']}),'package-lock.json':lock('4.17.21')});
 writeFileSync(join(f.repo,'src/value.ts'),'export const value: number = "wrong";\nconst unusedThing = 1;\n');writeFileSync(join(f.repo,'package-lock.json'),lock('4.17.15'));f.git('add','.');f.git('commit','-qm','Candidate');
 const result=await runQualityGates(f.repo,f.base,f.git('rev-parse','HEAD'),['oxlint','tsc','osv'],join(f.root,'checks'),new AbortController().signal);for(const gate of result.gates)assert.equal(gate.status,'FAIL',JSON.stringify(gate));
 if(process.env.CC_GATE_PROOF_DIR)writeFileSync(join(process.env.CC_GATE_PROOF_DIR,'js-plants.json'),JSON.stringify(result,null,2));
});
test('a configured ESLint repo uses its BASE rules with the installed TypeScript parser',{skip:nativeToolSkip},async()=>{
 const parser=resolve('.work/quality-tools/js/node_modules/@typescript-eslint/parser/dist/index.js');
 const f=fixture({'src/value.ts':'export const value: number = 1;\n','eslint.config.mjs':`import parser from ${JSON.stringify(parser)};export default [{files:['**/*.ts'],languageOptions:{parser},rules:{'no-unused-vars':'error'}}];\n`});
 writeFileSync(join(f.repo,'src/value.ts'),'export const value: number = 1;\nconst unusedThing = 1;\n');f.git('add','.');f.git('commit','-qm','Candidate');const result=await runQualityGates(f.repo,f.base,f.git('rev-parse','HEAD'),['eslint'],join(f.root,'checks'),new AbortController().signal);assert.equal(result.gates[0]?.status,'FAIL',JSON.stringify(result));
 if(process.env.CC_GATE_PROOF_DIR)writeFileSync(join(process.env.CC_GATE_PROOF_DIR,'eslint-plant.json'),JSON.stringify(result,null,2));
});

import {processRun,oracleSandbox} from '../apps/server/oracle-execution.ts';
test('quality sandbox denies real outbound network attempts with tracked cleanup',{skip:nativeToolSkip},async()=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'cc-quality-network-'))),script=join(root,'probe.py');writeFileSync(script,"import sys,socket,json\nsys.stdin.readline()\ns=socket.socket()\ns.settimeout(2)\ntry:\n s.connect(('1.1.1.1',443))\n print(json.dumps({'blocked':False}))\nexcept PermissionError:\n print(json.dumps({'blocked':True}))\nfinally:s.close()\n");
 const r=await processRun(['/usr/local/bin/python3','-I',script],root,{PATH:'/usr/bin:/bin',HOME:root,TMPDIR:root},oracleSandbox([script],root,true,false,true),'go\n',new AbortController().signal,{},10000);assert.equal(r.cleanup.verified,true);assert.equal(r.code,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{blocked:true});
 if(process.env.CC_GATE_PROOF_DIR)writeFileSync(join(process.env.CC_GATE_PROOF_DIR,'network-denial.json'),JSON.stringify({blocked:true,cleanup:r.cleanup},null,2));
});

test('Pyright resolves new tests from the export root but still catches actual type errors',{skip:nativeToolSkip},async()=>{
 const f=fixture({'bugs.py':'def first(items: list[int]) -> int:\n    return items[0]\n','tests/test_guard.py':'from bugs import first\nassert first([1]) == 1\n'});
 writeFileSync(join(f.repo,'tests/test_first.py'),'import unittest\nfrom bugs import first\nclass TestFirst(unittest.TestCase):\n    def test_first(self):\n        self.assertEqual(first([1]), 1)\n');writeFileSync(join(f.repo,'tests/test_label.py'),'import unittest\nfrom bugs import first\nclass TestLabel(unittest.TestCase):\n    def test_label(self):\n        self.assertEqual(first([2]), 2)\n');writeFileSync(join(f.repo,'tests/test_parse.py'),'import unittest\nfrom bugs import first\nclass TestParse(unittest.TestCase):\n    def test_parse(self):\n        self.assertEqual(first([3]), 3)\n');f.git('add','.');f.git('commit','-qm','Duplicate reproduction tests');
 const ok=await runQualityGates(f.repo,f.base,f.git('rev-parse','HEAD'),['pyright'],join(f.root,'valid'),new AbortController().signal);assert.equal(ok.gates[0]?.status,'PASS',JSON.stringify(ok));
 writeFileSync(join(f.repo,'tests/test_first.py'),'from bugs import first\nvalue: int = "wrong"\n');f.git('add','.');f.git('commit','-qm','Real type error');
 const bad=await runQualityGates(f.repo,f.base,f.git('rev-parse','HEAD'),['pyright'],join(f.root,'invalid'),new AbortController().signal);assert.equal(bad.gates[0]?.status,'FAIL',JSON.stringify(bad));assert.ok(bad.gates[0]?.findings.some(f=>f.message.includes('int')));
});
