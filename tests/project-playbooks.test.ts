import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createProjectPlaybookStore, validatePlaybookDefinition} from '../apps/server/project-playbooks.ts';
import type {ProjectPlaybookDefinition} from '../packages/shared/playbooks.ts';
function fixture(files: Record<string, string> = {'tests/test_example.py': ''}) {
 const root=mkdtempSync(join(tmpdir(),'cc-playbook-')),repo=join(root,'repo'),data=join(root,'data');mkdirSync(repo);mkdirSync(data);
 for(const [name,content] of Object.entries(files)){const parts=name.split('/');parts.pop();mkdirSync(join(repo,...parts),{recursive:true});writeFileSync(join(repo,name),content);}
 const git=(args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
 git(['init','-q']);git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','BASE']);
 return {root,repo,data,git,base:git(['rev-parse','HEAD']),store:createProjectPlaybookStore(data)};
}
const definition=():ProjectPlaybookDefinition=>({version:'project-playbook-v1',setup:null,tests:[{argv:['python3','-m','unittest','discover','-s','tests','-v'],cwd:'.'}],runner:'unittest',env:{CI:'1'},timeoutSeconds:180,knownFailingTests:[],knownFlakyTests:[],notes:[]});
test('missing, proposed and edited playbooks cannot count as approved; explicit approval persists',async()=>{
 const f=fixture();try{
  assert.equal(f.store.show(f.repo),null);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});
  const draft=await f.store.propose(f.repo,f.base);assert.equal(draft.approval,null);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});
  assert.throws(()=>f.store.approve(f.repo,'0'.repeat(64)),{code:'PLAYBOOK_CHANGED'});
  const approved=f.store.approve(f.repo,draft.hash);assert.equal(approved.approval?.hash,draft.hash);assert.equal(approved.approval?.actor,'test-fixture');assert.equal(approved.approval?.source,'node:test');assert.equal(approved.approval?.dataMode,'TEST');
  assert.deepEqual(createProjectPlaybookStore(f.data).requireApproved(f.repo),approved);
  const edited=f.store.edit(f.repo,{...draft.definition,timeoutSeconds:181});assert.notEqual(edited.hash,draft.hash);assert.equal(edited.approval,null);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('canonical aliases share one playbook and identical explicit reapproval reuses its hash',async()=>{
 const f=fixture();try{symlinkSync(f.repo,join(f.root,'alias'));const draft=await f.store.propose(f.repo,f.base),approved=f.store.approve(f.repo,draft.hash);assert.deepEqual(f.store.show(join(f.root,'alias')),approved);f.store.edit(f.repo,draft.definition);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});assert.deepEqual(f.store.approve(f.repo,draft.hash),approved);}finally{rmSync(f.root,{recursive:true,force:true});}
});
test('proposal reads BASE metadata, ignores dirty package and never changes the repository',async()=>{
 const f=fixture({'frontend/package.json':'{"scripts":{"test":"vitest"}}'});try{writeFileSync(join(f.repo,'frontend/package.json'),'DIRTY');const before=f.git(['status','--porcelain']);const record=await f.store.propose(f.repo,f.base);assert.equal(record.definition.runner,'vitest');assert.deepEqual(record.definition.tests,[{argv:['npm','test','--','--run'],cwd:'frontend'}]);assert.equal(f.git(['status','--porcelain']),before);assert.equal(readFileSync(join(f.repo,'frontend/package.json'),'utf8'),'DIRTY');}finally{rmSync(f.root,{recursive:true,force:true});}
});
test('career proposal is unapproved and exports only pure code with counted checks',async()=>{
 const f=fixture({'test-all.mjs':'throw new Error("MUST NOT EXECUTE");','liveness-core.mjs':'export function classifyLiveness() {}'});try{const r=await f.store.propose(f.repo,f.base);assert.equal(r.definition.runner,'node-script');assert.deepEqual(r.definition.exportFiles,['liveness-core.mjs']);assert.deepEqual(r.definition.tests[0]!.argv.slice(0,2),['node','-e']);assert.equal(r.definition.tests[0]!.report!.expectedTestIds.length,5);assert.match(r.definition.notes.join(' '),/no tracker/);assert.equal(r.approval,null);}finally{rmSync(f.root,{recursive:true,force:true});}
});
for(const [label,changed] of [
 ['shell',{tests:[{argv:['sh','-c','echo unsafe'],cwd:'.'}]}],
 ['escape',{tests:[{argv:['node','test.js'],cwd:'../source'}]}],
 ['absolute cwd',{tests:[{argv:['node','test.js'],cwd:'/tmp'}]}],
 ['runtime injection',{env:{NODE_OPTIONS:'--require=/tmp/inject.js'}}],
 ['outbound host',{env:{HOST:'0.0.0.0'}}],
 ['unbounded timeout',{timeoutSeconds:2000}],
 ['empty commands',{tests:[]}],
 ['unbounded annotations',{notes:Array(101).fill('noise')}]
] as const) test('playbook rejects '+label,()=>assert.throws(()=>validatePlaybookDefinition({...definition(),...changed}),{code:'INVALID_PLAYBOOK'}));
test('tampered playbook definition fails closed',async()=>{
 const f=fixture();try{const draft=await f.store.propose(f.repo,f.base),path=join(f.store.root,(await import('node:fs')).readdirSync(f.store.root)[0]!,'current.json');const r=JSON.parse(readFileSync(path,'utf8'));r.definition.timeoutSeconds=999;writeFileSync(path,JSON.stringify(r));assert.throws(()=>f.store.show(f.repo),{code:'PLAYBOOK_CHANGED'});assert.equal(draft.approval,null);}finally{rmSync(f.root,{recursive:true,force:true});}
});
