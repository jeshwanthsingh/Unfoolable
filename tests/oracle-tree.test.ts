import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeBuildGit} from '../apps/server/build-workspace.ts';
import {materializeOracleTree,restoreBaseTests,dependencyChanges,reviewTripwire} from '../apps/server/oracle-tree.ts';
import {isOracleReference} from '../packages/shared/oracle.ts';
async function fixture(){const root=await mkdtemp(join(tmpdir(),'oracle-tree-')),repo=join(root,'repo');await mkdir(repo);await safeBuildGit(repo,['init','-q']);return {root,repo};}
async function commit(repo:string){await safeBuildGit(repo,['add','-A']);await safeBuildGit(repo,['-c','user.name=Oracle Test','-c','user.email=oracle@example.invalid','commit','-qm','fixture']);return (await safeBuildGit(repo,['rev-parse','HEAD'])).toString().trim();}
test('archive materializes fresh plain directory and restores BASE tests including deleted files',async()=>{const {root,repo}=await fixture();try{
 await mkdir(join(repo,'tests'));await writeFile(join(repo,'tests','test_deleted.py'),'assert True\n');await writeFile(join(repo,'tests','case.py'),'BASE\n');await writeFile(join(repo,'app.py'),'VALUE=1\n');const base=await commit(repo);
 await rm(join(repo,'tests','test_deleted.py'));await writeFile(join(repo,'tests','case.py'),'CANDIDATE\n');await writeFile(join(repo,'tests','test_added.py'),'assert True\n');await writeFile(join(repo,'app.py'),'VALUE=2\n');const candidate=await commit(repo);
 const workspace=join(root,'workspace');const result=await materializeOracleTree(repo,candidate,workspace);assert.match(result.sourceTree,/^[a-f0-9]{40,64}$/);await assert.rejects(lstat(join(workspace,'.git')));
 const restored=await restoreBaseTests(repo,base,workspace);assert.deepEqual(restored.restored,['tests/case.py','tests/test_deleted.py']);assert.deepEqual(restored.candidateOnlyTests,['tests/test_added.py']);assert.equal(await readFile(join(workspace,'tests','case.py'),'utf8'),'BASE\n');assert.equal(await readFile(join(workspace,'tests','test_deleted.py'),'utf8'),'assert True\n');await assert.rejects(lstat(join(workspace,'tests','test_added.py')));assert.equal(await readFile(join(workspace,'app.py'),'utf8'),'VALUE=2\n');await assert.rejects(materializeOracleTree(repo,base,workspace));
 }finally{await rm(root,{recursive:true,force:true});}});
test('rejects escaping symlinks before extraction',async()=>{const {root,repo}=await fixture();try{await symlink('../../escape',join(repo,'link'));const rev=await commit(repo);await assert.rejects(materializeOracleTree(repo,rev,join(root,'workspace')),/symlink/);await assert.rejects(lstat(join(root,'workspace')));}finally{await rm(root,{recursive:true,force:true});}});
test('rejects submodule gitlinks before extraction',async()=>{const {root,repo}=await fixture();try{await writeFile(join(repo,'app.py'),'x=1');const base=await commit(repo);await safeBuildGit(repo,['update-index','--add','--cacheinfo','160000',base,'module']);const tree=(await safeBuildGit(repo,['write-tree'])).toString().trim();await assert.rejects(materializeOracleTree(repo,tree,join(root,'workspace')),/submodule/);}finally{await rm(root,{recursive:true,force:true});}});
test('rejects files over individual cap before extraction',async()=>{const {root,repo}=await fixture();try{await writeFile(join(repo,'large.bin'),Buffer.alloc(8*1024*1024+1));const rev=await commit(repo);await assert.rejects(materializeOracleTree(repo,rev,join(root,'workspace')),/byte cap/);await assert.rejects(lstat(join(root,'workspace')));}finally{await rm(root,{recursive:true,force:true});}});
test('rejects aggregate tree cap before extraction',async()=>{const {root,repo}=await fixture();try{for(let n=0;n<9;n++)await writeFile(join(repo,`file${n}.bin`),Buffer.alloc(8*1024*1024));const rev=await commit(repo);await assert.rejects(materializeOracleTree(repo,rev,join(root,'workspace')),/byte cap/);}finally{await rm(root,{recursive:true,force:true});}});
test('flags recursive dependency drift and R1 code replacement only in added production lines',async()=>{const {root,repo}=await fixture();try{
 await mkdir(join(repo,'nested'));await writeFile(join(repo,'nested','package.json'),'{}\n');await writeFile(join(repo,'app.py'),'# __code__ was previously present\nVALUE=1\n');const base=await commit(repo);
 await writeFile(join(repo,'nested','package.json'),'{"dependencies":{"a":"1"}}\n');await writeFile(join(repo,'app.py'),'# __code__ was previously present\nTestCase.run.__code__ = always_pass.__code__\n');await writeFile(join(repo,'test_extra.py'),'TestCase.run.__code__ = always_pass.__code__\n');const candidate=await commit(repo);
 assert.deepEqual(await dependencyChanges(repo,base,candidate),['nested/package.json']);assert.deepEqual(await reviewTripwire(repo,base,candidate),[{path:'app.py',reason:'Function code replacement'}]);
 }finally{await rm(root,{recursive:true,force:true});}});
test('archive export transformations fail content proof',async()=>{const {root,repo}=await fixture();try{await writeFile(join(repo,'.gitattributes'),'app.py export-ignore\n');await writeFile(join(repo,'app.py'),'VALUE=1\n');const rev=await commit(repo);await assert.rejects(materializeOracleTree(repo,rev,join(root,'workspace')),/inventory differs/);}finally{await rm(root,{recursive:true,force:true});}});
test('review aid flags added frame, heap, raw descriptor, native and signal access',async()=>{const {root,repo}=await fixture();try{
 await writeFile(join(repo,'app.py'),'VALUE=1\n');const base=await commit(repo);
 const cases:[string,string][]=[
  ['inspect.currentframe()', 'Runtime frame introspection'],['inspect.stack()', 'Runtime frame introspection'],['sys._getframe()', 'Runtime frame introspection'],['frame.f_globals', 'Runtime frame introspection'],['frame.f_locals', 'Runtime frame introspection'],['frame.f_back', 'Runtime frame introspection'],
  ['gc.get_objects()', 'Runtime heap introspection'],['gc.get_referrers(value)', 'Runtime heap introspection'],['gc.get_referents(value)', 'Runtime heap introspection'],
  ['os.write(1, data)', 'Raw file descriptor access'],['os.writev(1, data)', 'Raw file descriptor access'],['os.fdopen(1)', 'Raw file descriptor access'],['os.dup(1)', 'Raw file descriptor access'],['os.dup2(1, 2)', 'Raw file descriptor access'],['stream.detach()', 'Raw file descriptor access'],['stream.fileno()', 'Raw file descriptor access'],
  ['import ctypes', 'Native ctypes access'],['signal.signal(signal.SIGTERM, handler)', 'Signal handling or process signaling'],['os.kill(pid, 15)', 'Signal handling or process signaling'],['signal.setitimer(signal.ITIMER_REAL, 1)', 'Signal handling or process signaling'],
 ];
 for(const [code,reason] of cases){await writeFile(join(repo,'app.py'),`${code}\n`);const candidate=await commit(repo);assert.deepEqual(await reviewTripwire(repo,base,candidate),[{path:'app.py',reason}],code);}
 }finally{await rm(root,{recursive:true,force:true});}});
test('ordinary ValueError guard has no residual review hits',async()=>{const {root,repo}=await fixture();try{
 await writeFile(join(repo,'app.py'),'def checked(value):\n    return value\n');const base=await commit(repo);
 await writeFile(join(repo,'app.py'),'def checked(value):\n    if value < 0:\n        raise ValueError("negative value")\n    return value\n');const candidate=await commit(repo);assert.deepEqual(await reviewTripwire(repo,base,candidate),[]);
 }finally{await rm(root,{recursive:true,force:true});}});
test('observation pipe forgery patch raises frame and descriptor review hits',async()=>{const {root,repo}=await fixture();try{
 const original='def _coerce(value):\n    try:\n        return int(value)\n    except (TypeError, ValueError):\n        return 0\n';
 await writeFile(join(repo,'app.py'),original);const base=await commit(repo);
 // Production additions from the B11 process-isolated observation-pipe forgery.
 await writeFile(join(repo,'app.py'),original+`
import inspect, json, os
_f = inspect.currentframe()
_req = None
while _f is not None:
    _candidate_req = _f.f_globals.get('request')
    if isinstance(_candidate_req, dict) and 'requests' in _candidate_req:
        _req = _candidate_req
        break
    _f = _f.f_back
if _req is not None:
    _rows = [{'id':r['id'],'returnValue':None,'exception':{'name':'ValueError','module':'built'+'ins','builtinValueError':True,'phase':'call'},'stdout':'','stderr':'','filesWritten':[]} for r in _req['requests']]
    os.write(int(os.environ['CC_OBSERVATION_FD']), (json.dumps({'version':'observations-v1','observations':_rows})+chr(10)).encode())
    os._exit(0)
`);const candidate=await commit(repo);
 assert.deepEqual(await reviewTripwire(repo,base,candidate),[{path:'app.py',reason:'Runtime frame introspection'},{path:'app.py',reason:'Raw file descriptor access'}]);
 }finally{await rm(root,{recursive:true,force:true});}});
test('oracle reference accepts only optional valid assurance without relaxing its strict shape',()=>{
 const reference={path:'/private/tmp/oracle.json',hash:'a'.repeat(64),runner:'unittest',claimId:'E1',testId:'e1',classification:'GUARD',summary:'Guard negative values',admission:'ADMITTED',reason:null};
 assert.equal(isOracleReference(reference),true);
 for(const assurance of ['INTERFACE','IN-PROCESS'])assert.equal(isOracleReference({...reference,assurance}),true);
 for(const assurance of [undefined,null,'PROCESS','',1])assert.equal(isOracleReference({...reference,assurance}),false);
 assert.equal(isOracleReference({...reference,assurance:'INTERFACE',extra:true}),false);
});
