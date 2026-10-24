import {createHash} from 'node:crypto';
import {renameSync} from 'node:fs';
import {canonicalContractJson} from '../apps/server/contract-store.ts';
import {repositoryIdentity,readRepositoryIdentities} from '../apps/server/repository-identity.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, realpathSync} from 'node:fs';
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

test('quality gate proposals invalidate approval and bind the exact tool/rule policy; never auto-approve',async()=>{
 const f=fixture();try{const initial=await f.store.propose(f.repo,f.base);f.store.approve(f.repo,initial.hash);const proposal=await f.store.proposeGates(f.repo,f.base);assert.equal(proposal.approval,null);assert.notEqual(proposal.hash,initial.hash);assert.ok(proposal.definition.qualityGates?.gates.includes('ruff'));assert.match(proposal.definition.qualityGates!.policyHash,/^[a-f0-9]{64}$/);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});const approved=f.store.approve(f.repo,proposal.hash);assert.deepEqual(await f.store.proposeGates(f.repo,f.base),approved);}finally{rmSync(f.root,{recursive:true,force:true});}
});
test('invalid arbitrary quality tool names are rejected',()=>assert.throws(()=>validatePlaybookDefinition({...definition(),qualityGates:{gates:['shell'],policyHash:'a'.repeat(64)}}),{code:'INVALID_PLAYBOOK'}));

test('approval follows root commit and remote identity across clean clones; edits and other repos stay unapproved',async()=>{
 const f=fixture();try{
  const draft=await f.store.propose(f.repo,f.base);f.store.approve(f.repo,draft.hash);
  const clone=join(f.root,'clone');execFileSync('git',['clone','--quiet','--no-hardlinks',f.repo,clone]);execFileSync('git',['-C',clone,'remote','remove','origin']);
  assert.equal(f.store.requireApproved(clone).hash,draft.hash);
  assert.equal(f.store.requireApproved(clone).repoRoot,realpathSync(clone));
  f.store.edit(clone,{...draft.definition,timeoutSeconds:181});assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});
  execFileSync('git',['-C',clone,'remote','add','origin','https://example.invalid/different.git']);assert.equal(f.store.show(clone),null);
  const other=fixture({'tests/test_other.py':'# different repository'});try{assert.equal(createProjectPlaybookStore(f.data).show(other.repo),null);}finally{rmSync(other.root,{recursive:true,force:true});}
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('diff cap changes are hashed, unapproved and validated',async()=>{const f=fixture();try{const d=await f.store.propose(f.repo,f.base);f.store.approve(f.repo,d.hash);const edited=f.store.edit(f.repo,{...d.definition,diffCap:{lines:200,files:5}});assert.notEqual(edited.hash,d.hash);assert.equal(edited.approval,null);assert.deepEqual(edited.definition.diffCap,{lines:200,files:5});for(const diffCap of [{lines:0,files:1},{lines:400,files:-1},{lines:Infinity,files:1}])assert.throws(()=>validatePlaybookDefinition({...d.definition,diffCap}),{code:'INVALID_PLAYBOOK'});}finally{rmSync(f.root,{recursive:true,force:true});}});

test('legacy path-only approval needs fresh confirmation and creates identity storage before approval',async()=>{const f=fixture();try{const d=await f.store.propose(f.repo,f.base);f.store.approve(f.repo,d.hash);const current=join(f.store.root,repositoryIdentity(f.repo)),legacy=join(f.store.root,createHash('sha256').update(canonicalContractJson(realpathSync(f.repo))).digest('hex'));renameSync(current,legacy);assert.equal(f.store.show(f.repo)?.approval,null);const approved=f.store.approve(f.repo,d.hash);assert.equal(approved.repositoryIdentity,repositoryIdentity(f.repo));assert.ok(approved.approval);assert.deepEqual(f.store.show(f.repo),approved);}finally{rmSync(f.root,{recursive:true,force:true});}});

test('a real origin named NO_REMOTE cannot collide with absence of a remote',()=>{const f=fixture();try{const absent=repositoryIdentity(f.repo);f.git(['remote','add','origin','NO_REMOTE']);assert.notEqual(repositoryIdentity(f.repo),absent);}finally{rmSync(f.root,{recursive:true,force:true});}});

test('display identity snapshots never survive into a later authorization read',()=>{const f=fixture();try{const before=repositoryIdentity(f.repo);readRepositoryIdentities(()=>{assert.equal(repositoryIdentity(f.repo),before);f.git(['remote','add','origin','https://example.invalid/changed.git']);assert.equal(repositoryIdentity(f.repo),before);});assert.notEqual(repositoryIdentity(f.repo),before);}finally{rmSync(f.root,{recursive:true,force:true});}});
test('adding risk rules changes the playbook hash and requires fresh approval',async()=>{
 const f=fixture();try{const proposed=await f.store.propose(f.repo,f.base);const approved=f.store.approve(f.repo,proposed.hash);const edited=f.store.edit(f.repo,{...approved.definition,riskRules:[{path:'auth/**',raiseTo:'RED',message:'Authentication code changed.'}]});assert.notEqual(edited.hash,approved.hash);assert.equal(edited.approval,null);assert.throws(()=>f.store.requireApproved(f.repo),{code:'PLAYBOOK_REQUIRED'});}finally{rmSync(f.root,{recursive:true,force:true});}
});
