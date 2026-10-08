import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,realpathSync,lstatSync,unlinkSync,chmodSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createBuildWorkspace,captureBuildCandidate,sourceIndexHash} from '../apps/server/build-workspace.ts';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {createCorrectionWorkspace} from '../apps/server/correction-workspace.ts';
import type {BuildInput,BuildAttempt} from '../packages/shared/build.ts';
import type {OracleManifest,OracleReference} from '../packages/shared/oracle.ts';
const git=(root:string,...args:string[])=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
async function fixture(native=true){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'managed-deps-'))),source=join(root,'source'),deps=join(root,'installed-deps'),data=join(root,'data');mkdirSync(source);mkdirSync(deps);mkdirSync(join(source,'frontend'));
 git(source,'init','-q');git(source,'config','user.name','Managed Fixture');git(source,'config','user.email','managed@example.invalid');writeFileSync(join(source,'frontend/.gitignore'),'/node_modules\n');writeFileSync(join(source,'app.ts'),'export const value=1;\n');git(source,'add','.');git(source,'commit','-qm','base');const base=git(source,'rev-parse','HEAD');symlinkSync(deps,join(source,'frontend/node_modules'),'dir');
 const id='managed-fixture',directory=join(root,'oracles',id);mkdirSync(directory,{recursive:true});const test={claimId:'E1',classification:'GUARD' as const,testId:'guard',summary:'Guard existing behavior',code:'test("guard",()=>{});',requests:[],assurance:'INTERFACE' as const};
 const manifest:OracleManifest={version:'process-oracle-v1',id,sourceRoot:source,baseHead:base,evaluationSignature:'a'.repeat(64),runner:'vitest',runnerDirectory:'frontend',dependencyRoot:deps,componentPath:'frontend/component.tsx',tests:[test],assurance:'INTERFACE'};
 const path=join(directory,'manifest.json');writeFileSync(path,canonicalContractJson(manifest),{mode:0o400});
 const ref:OracleReference={path,hash:createHash('sha256').update(canonicalContractJson(manifest)).digest('hex'),runner:'vitest',claimId:test.claimId,testId:test.testId,classification:test.classification,summary:test.summary,admission:'ADMITTED',reason:null,assurance:'INTERFACE'};
 const input={evaluationClaims:native?[{oracle:ref}]:[]} as unknown as BuildInput;
 const admission={sourceRoot:source,baseHead:base,gitCommonDir:git(source,'rev-parse','--path-format=absolute','--git-common-dir'),sourceIndexHash:await sourceIndexHash(source),input,admissionMs:0};
 const unseal=(dir:string)=>{chmodSync(dir,0o700);for(const entry of readdirSync(dir,{withFileTypes:true}))if(entry.isDirectory())unseal(join(dir,entry.name));};
 return {root,source,deps,data,base,admission,finish:()=>{unseal(root);rmSync(root,{recursive:true,force:true});}};
}
test('only admitted native Vitest receives its ignored managed dependency link; capture skips external caps',async()=>{
 const f=await fixture();try{
  // External dependencies must not enter traversal, secret scans or the object pack.
  writeFileSync(join(f.deps,'oversized-fixture.bin'),Buffer.alloc(9*1024*1024));symlinkSync('/nonexistent-sensitive-fixture',join(f.deps,'external-link'));const sentinel=join(f.deps,'installed-marker');writeFileSync(sentinel,'unchanged installed dependency fixture');
  const sourceIndex=await sourceIndexHash(f.source),w=await createBuildWorkspace(f.admission,'native',f.data),link=join(w.workspacePath,'frontend/node_modules');assert(lstatSync(link).isSymbolicLink());assert.equal(realpathSync(link),f.deps);
  const ownership=JSON.parse(readFileSync(join(w.artifactDir,'ownership.json'),'utf8'));assert.deepEqual(ownership.allowedDependencyLinks,[{path:'frontend/node_modules',target:f.deps}]);
  writeFileSync(join(w.workspacePath,'app.ts'),'export const value=2;\n');const {candidate}=await captureBuildCandidate({id:'native',workspacePath:w.workspacePath,sourceRoot:f.source,baseHead:f.base} as BuildAttempt,f.data);
  assert.deepEqual(candidate.changedPaths.map(p=>p.path),['app.ts']);assert(!git(w.workspacePath,'ls-tree','-r','--name-only',candidate.treeHash).includes('node_modules'));assert.equal(readFileSync(sentinel,'utf8'),'unchanged installed dependency fixture');assert.equal(await sourceIndexHash(f.source),sourceIndex);assert.equal(git(f.source,'status','--porcelain'),'');
 }finally{f.finish();}
});
test('legacy workspace gets no link and still rejects arbitrary dependency symlinks',async()=>{
 const f=await fixture(false);try{const w=await createBuildWorkspace(f.admission,'legacy',f.data);assert.throws(()=>lstatSync(join(w.workspacePath,'frontend/node_modules')));symlinkSync(f.deps,join(w.workspacePath,'frontend/node_modules'),'dir');await assert.rejects(captureBuildCandidate({id:'legacy',workspacePath:w.workspacePath,sourceRoot:f.source,baseHead:f.base} as BuildAttempt,f.data),{code:'UNSAFE_CANDIDATE_PATH'});}finally{f.finish();}
});
test('managed links reject retargeting, replacement, removal, forced tracking and unrelated symlinks',async()=>{
 for(const mode of ['retarget','replacement','removed','tracked','other-link','unignored']){const f=await fixture();try{
  const w=await createBuildWorkspace(f.admission,'native',f.data),link=join(w.workspacePath,'frontend/node_modules');
  if(['retarget','replacement','removed'].includes(mode))unlinkSync(link);
  if(mode==='retarget'){const other=join(f.root,'other-deps');mkdirSync(other);symlinkSync(other,link,'dir');}
  if(mode==='replacement')mkdirSync(link);
  if(mode==='tracked')git(w.workspacePath,'add','-f','frontend/node_modules');
  if(mode==='other-link')symlinkSync(f.deps,join(w.workspacePath,'other-node-modules'),'dir');
  if(mode==='unignored')writeFileSync(join(w.workspacePath,'frontend/.gitignore'),'');
  await assert.rejects(captureBuildCandidate({id:'native',workspacePath:w.workspacePath,sourceRoot:f.source,baseHead:f.base} as BuildAttempt,f.data));
 }finally{f.finish();}}
});
test('correction preserves exact parent tree while retaining the validated ignored dependency link',async()=>{
 const f=await fixture();try{
  const first=await createBuildWorkspace(f.admission,'parent',f.data);writeFileSync(join(first.workspacePath,'app.ts'),'export const value=2;\n');const {candidate}=await captureBuildCandidate({id:'parent',workspacePath:first.workspacePath,sourceRoot:f.source,baseHead:f.base} as BuildAttempt,f.data);
  const correction=await createCorrectionWorkspace(f.admission,'correction',f.data,candidate);assert.equal(git(correction.workspacePath,'write-tree'),candidate.treeHash);assert.equal(git(correction.workspacePath,'rev-parse','HEAD'),f.base);assert.equal(realpathSync(join(correction.workspacePath,'frontend/node_modules')),f.deps);
  writeFileSync(join(correction.workspacePath,'app.ts'),'export const value=3;\n');const output=await captureBuildCandidate({id:'correction',workspacePath:correction.workspacePath,sourceRoot:f.source,baseHead:f.base} as BuildAttempt,f.data);assert.deepEqual(output.candidate.changedPaths.map(path=>path.path),['app.ts']);assert(!git(correction.workspacePath,'ls-tree','-r','--name-only',output.candidate.treeHash).includes('node_modules'));
 }finally{f.finish();}
});
