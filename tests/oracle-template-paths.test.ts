import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeBuildPath,safeBuildGit} from '../apps/server/build-workspace.ts';
import {materializeOracleTree} from '../apps/server/oracle-tree.ts';

test('allows exactly named env example template files without relaxing credential paths',()=>{
 for(const path of ['.env.example','backend/.env.example','frontend/.env.example','config/nested/.env.example'])assert.equal(safeBuildPath(path),true,path);
 for(const path of ['.env','.env.local','.env.production','.env.test','.env.example.local','.env.example.bak','.ENV.EXAMPLE','backend/.env','frontend/.env.local','backend/.env.example/file.py','.env.local/.env.example','credentials/.env.example','.ssh/.env.example','private.key','.env.example/../app.py'])assert.equal(safeBuildPath(path),false,path);
});
async function fixture(){const root=await mkdtemp(join(tmpdir(),'oracle-template-')),repo=join(root,'repo');await mkdir(repo);await safeBuildGit(repo,['init','-q']);return {root,repo};}
async function commit(repo:string){await safeBuildGit(repo,['add','-A']);await safeBuildGit(repo,['-c','user.name=Template Test','-c','user.email=template@example.invalid','commit','-qm','template fixture']);return (await safeBuildGit(repo,['rev-parse','HEAD'])).toString().trim();}
test('archive preserves tracked frontend and backend env example template bytes',async()=>{
 const {root,repo}=await fixture();try{
  const templates={'backend/.env.example':'JWT_SECRET=replace-with-generated-secret\n','frontend/.env.example':'VITE_API_URL=http://localhost:3000\n'};
  for(const [path,bytes] of Object.entries(templates)){await mkdir(join(repo,path.split('/')[0]!));await writeFile(join(repo,path),bytes);}
  await writeFile(join(repo,'app.py'),'def checked(value): return value\n');const base=await commit(repo),workspace=join(root,'workspace');
  await materializeOracleTree(repo,base,workspace);
  for(const [path,bytes] of Object.entries(templates))assert.equal(await readFile(join(workspace,path),'utf8'),bytes);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('an allowed template does not admit a neighboring real env file to the archive',async()=>{
 const {root,repo}=await fixture();try{
  await writeFile(join(repo,'.env.example'),'TOKEN=your-token\n');await writeFile(join(repo,'.env.local'),'TOKEN=not-a-real-token-test-fixture\n');const candidate=await commit(repo);
  await assert.rejects(materializeOracleTree(repo,candidate,join(root,'workspace')),/unsafe path/);
 }finally{await rm(root,{recursive:true,force:true});}
});
