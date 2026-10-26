import {oracleDependencies,uiDependencySkip} from './helpers/portable-dependencies.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {existsSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bundleOracleCandidate} from '../apps/server/oracle-execution.ts';

const deps=oracleDependencies;
test('native browser compiler reads allowed local JSON and pinned dependencies', {skip:uiDependencySkip},async()=>{
 const root=await mkdtemp(join(tmpdir(),'oracle-bundle-'));try{
  const workspace=join(root,'workspace');await mkdir(workspace);await writeFile(join(workspace,'message.json'),JSON.stringify({message:'allowed local fixture'}));await writeFile(join(workspace,'component.tsx'),'import React from "react";import data from "./message.json";export default function Component(){return <div>{data.message}</div>;}');
  const output=join(root,'candidate.js');await bundleOracleCandidate(workspace,realpathSync(deps),'component.tsx',output);
  assert.match(await readFile(output,'utf8'),/allowed local fixture/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('native browser compiler rejects out-of-root JSON before loading its contents', {skip:uiDependencySkip},async()=>{
 const root=await mkdtemp(join(tmpdir(),'oracle-bundle-'));try{
  const workspace=join(root,'workspace');await mkdir(workspace);const sentinel=join(root,'private.json'),marker='harmless-private-json-sentinel-9a36';await writeFile(sentinel,JSON.stringify({marker}));await symlink(sentinel,join(workspace,'link.json'));
  const imports=[sentinel,'../private.json','./link.json'];
  for(const path of imports){const output=join(root,'candidate-'+imports.indexOf(path)+'.js');await writeFile(join(workspace,'component.tsx'),`import React from "react";import secret from ${JSON.stringify(path)};export default function Component(){return <div>{JSON.stringify(secret)}</div>;}`);
   await assert.rejects(bundleOracleCandidate(workspace,realpathSync(deps),'component.tsx',output),error=>{assert(!String(error).includes(marker));assert.match(String(error),/outside oracle bundle roots/);return true;});
   assert.equal(existsSync(output),false);
  }
  assert.equal(await readFile(sentinel,'utf8'),JSON.stringify({marker}));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('native browser compiler rejects a package entry redirect outside its allowed roots', {skip:uiDependencySkip},async()=>{
 const root=await mkdtemp(join(tmpdir(),'oracle-bundle-'));try{
  const workspace=join(root,'workspace');await mkdir(workspace);await mkdir(join(workspace,'redirect'));await writeFile(join(root,'private.json'),JSON.stringify({marker:'private-package-redirect-marker'}));await writeFile(join(workspace,'redirect/package.json'),JSON.stringify({main:'../../private.json'}));await writeFile(join(workspace,'component.tsx'),'import React from "react";import secret from "./redirect";export default function Component(){return <div>{JSON.stringify(secret)}</div>;}');
  const output=join(root,'candidate.js');await assert.rejects(bundleOracleCandidate(workspace,realpathSync(deps),'component.tsx',output),/outside oracle bundle roots/);assert.equal(existsSync(output),false);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('native browser compiler rejects ancestor browser redirects before outside package metadata reads', {skip:uiDependencySkip},async()=>{
 const root=await mkdtemp(join(tmpdir(),'oracle-bundle-'));try{
  const workspace=join(root,'workspace');await mkdir(workspace);await mkdir(join(root,'private-package'));
  await writeFile(join(root,'private-package/package.json'),'private-metadata-sentinel-invalid-json');
  await writeFile(join(workspace,'package.json'),JSON.stringify({browser:{'./data.json':'../private-package'}}));await writeFile(join(workspace,'data.json'),'{}');
  await writeFile(join(workspace,'component.tsx'),'import React from "react";import data from "./data.json";export default function Component(){return <div>{JSON.stringify(data)}</div>;}');
  await assert.rejects(bundleOracleCandidate(workspace,realpathSync(deps),'component.tsx',join(root,'candidate.js')),error=>{assert.match(String(error),/outside oracle bundle roots/);assert(!String(error).includes('private-metadata-sentinel'));return true;});
 }finally{await rm(root,{recursive:true,force:true});}
});
