import {homedir} from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {oracleSandbox} from '../apps/server/oracle-execution.ts';
import {ownedProcessSnapshot,reconcileOwnedProcesses} from '../apps/server/build-processes.ts';
import type {ProcessRecord} from '../packages/shared/build.ts';

const deps=join(homedir(),'Projects/Therapy2/frontend/node_modules');
test('native Vitest judge collects exactly one oracle beneath a denied ancestor package', {skip:process.platform!=='darwin'||!existsSync(join(deps,'vitest/vitest.mjs')),timeout:45000},async()=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'oracle-judge-location-'))),parent=join(root,'parent'),scratch=join(parent,'judge');mkdirSync(scratch,{recursive:true});
 const observations=join(root,'observations.json'),oracle=join(root,'oracle.ts'),judge=fileURLToPath(new URL('../scripts/protected-verification/ui-judge.mjs',import.meta.url));
 writeFileSync(join(parent,'package.json'),'{"type":"module","private":true}\n');
 writeFileSync(join(parent,'tsconfig.json'),'{"extends":"unavailable-ancestor-config"}\n');
 writeFileSync(observations,JSON.stringify({version:'observations-v1',observations:[{id:'sample',value:7}]}));
 writeFileSync(oracle,`import {test,expect} from 'vitest';import fs from 'node:fs';import {observations} from './observations.mjs';test('judge package boundary',()=>{expect(observations[0].value).toBe(7);expect(()=>fs.readFileSync('../package.json')).toThrow();expect(()=>fs.readFileSync('../tsconfig.json')).toThrow();});\n`);
 let records:ProcessRecord[]=[],stdout='',stderr='',timer:ReturnType<typeof setInterval>|undefined,deadline:ReturnType<typeof setTimeout>|undefined;
 try{
  const profile=oracleSandbox([judge,observations,oracle,dirname(process.execPath),deps],scratch,true);
  const child=spawn('/usr/bin/sandbox-exec',['-p',profile,process.execPath,judge,observations,oracle,'judge package boundary',deps,scratch],{cwd:scratch,env:{PATH:dirname(process.execPath),HOME:scratch,TMPDIR:scratch},detached:true,stdio:['pipe','pipe','pipe']});
  child.stdout.on('data',b=>stdout=(stdout+b).slice(0,1048576));child.stderr.on('data',b=>stderr=(stderr+b).slice(0,1048576));
  const closed=new Promise<number|null>((resolve,reject)=>{child.once('close',resolve);child.once('error',reject);});
  await new Promise(resolve=>setTimeout(resolve,100));records=ownedProcessSnapshot(child.pid!);assert.ok(records.length);
  timer=setInterval(()=>{try{for(const row of ownedProcessSnapshot(child.pid!))if(!records.some(p=>p.pid===row.pid&&p.birth===row.birth))records.push(row);}catch{/* Exit race: final exact cleanup verifies ownership. */}},100);
  deadline=setTimeout(()=>void reconcileOwnedProcesses(records),38000);child.stdin.end(' ');const code=await closed;clearInterval(timer);clearTimeout(deadline);
  const cleanup=await reconcileOwnedProcesses(records);assert.equal(cleanup.verified,true);assert.equal(cleanup.ambiguous,false);assert.deepEqual(cleanup.remaining,[]);
  assert.equal(code,0,stdout+'\n'+stderr);const result=JSON.parse(stdout);assert.equal(result.status,'PASS');assert.equal(result.testsRun,1);assert.deepEqual(result.tests,[{id:'judge package boundary',status:'passed'}]);assert.equal(result.nativeReport.numTotalTestSuites,1);assert.equal(result.nativeReport.testResults.length,1);
  assert.deepEqual(JSON.parse(readFileSync(join(scratch,'package.json'),'utf8')),{type:'module'});
 }finally{clearInterval(timer);clearTimeout(deadline);if(records.length)await reconcileOwnedProcesses(records);rmSync(root,{recursive:true,force:true});}
});
