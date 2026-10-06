import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,statSync,realpathSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../apps/server/application.ts';
import {loadConfig} from '../apps/server/config.ts';
type Project={id:string;displayName:string;repoRoot:string;registeredHead:string;registeredBranch:string|null;createdAt:string};
const quiet=()=>{};
function git(path:string,...args:string[]){return execFileSync('git',['--no-optional-locks','-C',path,...args],{encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}}).trim();}
function repo(path:string){mkdirSync(path);git(path,'init','-q','-b','main');writeFileSync(join(path,'example.txt'),'initial\n');git(path,'add','example.txt');git(path,'-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','initial');return {path,head:git(path,'rev-parse','HEAD')};}
async function fixture(){const root=mkdtempSync(join(tmpdir(),'cc-projects-'));const allowed=join(root,'allowed');mkdirSync(allowed);const data=join(root,'data');const config={...loadConfig({COMMAND_CENTER_DATA_DIR:data,COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([allowed])},root),port:0,projectRoots:[allowed]};const app=createApplication(config,quiet);await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');return {root,allowed,data,config,app,url:`http://127.0.0.1:${address.port}`};}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function finish(f:Fixture){await f.app.close();rmSync(f.root,{recursive:true});}
async function post(f:Fixture,displayName:unknown,repoPath:unknown){const r=await fetch(f.url+'/api/projects',{method:'POST',headers:{Origin:f.url,'Content-Type':'application/json'},body:JSON.stringify({displayName,repoPath})});return {status:r.status,body:await r.json() as Project&{error:{code:string;message:string}}};}
async function list(f:Fixture){const r=await fetch(f.url+'/api/projects');assert.equal(r.status,200);return await r.json() as {projects:Project[];allowedRoots:string[]};}

test('registers canonical root, actual HEAD/branch and stable app identity',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'sample'));mkdirSync(join(r.path,'sub'));const registered=await post(f,'  Example  ',join(r.path,'sub'));assert.equal(registered.status,201);assert.equal(registered.body.displayName,'Example');assert.equal(registered.body.repoRoot,realpathSync(r.path));assert.equal(registered.body.registeredHead,r.head);assert.equal(registered.body.registeredBranch,'main');assert.match(registered.body.id,/^[a-f0-9-]{36}$/);assert.equal((await list(f)).projects[0]?.id,registered.body.id);}finally{await finish(f);}
});
test('project ID and registration metadata survive server/database restart',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'persistent'));const created=await post(f,'Persistent',r.path);assert.equal(created.status,201);await f.app.close();f.app=createApplication(f.config,quiet);await f.app.start();const address=f.app.server.address();assert.ok(address&&typeof address!=='string');f.url=`http://127.0.0.1:${address.port}`;assert.deepEqual((await list(f)).projects,[created.body]);}finally{await finish(f);}
});
test('dirty repository registration leaves tracked bytes, HEAD, index and status unchanged',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'dirty'));writeFileSync(join(r.path,'example.txt'),'dirty content\n');const before={bytes:readFileSync(join(r.path,'example.txt'),'utf8'),head:git(r.path,'rev-parse','HEAD'),index:readFileSync(join(r.path,'.git/index')).toString('hex'),mtime:statSync(join(r.path,'.git/index')).mtimeMs,status:git(r.path,'status','--porcelain')};assert.equal((await post(f,'Dirty',r.path)).status,201);assert.deepEqual({bytes:readFileSync(join(r.path,'example.txt'),'utf8'),head:git(r.path,'rev-parse','HEAD'),index:readFileSync(join(r.path,'.git/index')).toString('hex'),mtime:statSync(join(r.path,'.git/index')).mtimeMs,status:git(r.path,'status','--porcelain')},before);}finally{await finish(f);}
});
test('trailing slash, nested path and symlink alias cannot duplicate canonical repository',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'unique'));mkdirSync(join(r.path,'sub'));const alias=join(f.allowed,'alias');symlinkSync(r.path,alias);assert.equal((await post(f,'Original',r.path+'/')).status,201);for(const p of [join(r.path,'sub'),alias,r.path,'~/'+relative(homedir(),r.path)]){const d=await post(f,'Another',p);assert.equal(d.status,409);assert.equal(d.body.error.code,'DUPLICATE_PROJECT');assert.match(d.body.error.message,/Original/);}assert.equal((await list(f)).projects.length,1);}finally{await finish(f);}
});
test('simultaneous registrations have one database winner and one clear conflict',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'raced'));const results=await Promise.all([post(f,'First',r.path),post(f,'Second',r.path)]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);assert.equal((await list(f)).projects.length,1);}finally{await finish(f);}
});
test('missing and non-Git paths fail without inserting rows',async()=>{
 const f=await fixture();try{const directory=join(f.allowed,'not-git');mkdirSync(directory);for(const [p,code] of [[join(f.allowed,'missing'),'PATH_NOT_FOUND'],[directory,'NOT_GIT_REPOSITORY']]){const r=await post(f,'Invalid',p);assert.equal(r.body.error.code,code);assert.notEqual(r.status,201);}assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('outside root, sibling prefix and symlink escape are rejected',async()=>{
 const f=await fixture();try{const outside=repo(join(f.root,'allowed-escape'));const alias=join(f.allowed,'escape');symlinkSync(outside.path,alias);for(const p of [outside.path,alias]){const r=await post(f,'Escaped',p);assert.equal(r.status,403);assert.equal(r.body.error.code,'OUTSIDE_ALLOWED_ROOT');}assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('discovered Git root outside the allowlist is rejected even when input directory is allowed',async()=>{
 const f=await fixture();try{const parent=repo(join(f.root,'parent'));const inner=join(parent.path,'inner');mkdirSync(inner);await f.app.close();f.app=createApplication({...f.config,projectRoots:[inner]},quiet);await f.app.start();const a=f.app.server.address();assert.ok(a&&typeof a!=='string');f.url=`http://127.0.0.1:${a.port}`;const r=await post(f,'Parent',inner);assert.equal(r.body.error.code,'OUTSIDE_ALLOWED_ROOT');}finally{await finish(f);}
});
test('rejects blank/long display names and invalid path types without partial rows',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'names'));for(const name of ['', '   ','x'.repeat(121),null]){const failed=await post(f,name,r.path);assert.equal(failed.status,400);assert.equal(failed.body.error.code,'INVALID_DISPLAY_NAME');}for(const p of ['',null,'relative/path','bad\u0000path']){const failed=await post(f,'Name',p);assert.equal(failed.status,400);assert.equal(failed.body.error.code,'INVALID_PATH');}assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('detached HEAD is valid and branch is null',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'detached'));git(r.path,'checkout','--detach','-q');const result=await post(f,'Detached',r.path);assert.equal(result.status,201);assert.equal(result.body.registeredBranch,null);assert.equal(result.body.registeredHead,r.head);}finally{await finish(f);}
});
test('existing linked worktree is discovered through Git, not rejected for a .git file',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'main-tree'));const tree=join(f.allowed,'linked-tree');git(r.path,'worktree','add','-q','-b','linked',tree);const result=await post(f,'Linked',tree);assert.equal(result.status,201);assert.equal(result.body.registeredBranch,'linked');assert.equal(result.body.registeredHead,r.head);}finally{await finish(f);}
});
test('path shell metacharacters remain data, not executable command text',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'repo ; $(not-a-command)'));const result=await post(f,'Literal path',r.path);assert.equal(result.status,201);assert.equal(result.body.registeredHead,r.head);}finally{await finish(f);}
});
test('registration preserves existing Host and Origin guards',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'guarded'));for(const origin of [undefined,'https://attacker.example']){const headers:Record<string,string>={'Content-Type':'application/json'};if(origin)headers.Origin=origin;const response=await fetch(f.url+'/api/projects',{method:'POST',headers,body:JSON.stringify({displayName:'Guarded',repoPath:r.path})});assert.equal(response.status,403);}assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('malformed, oversized and non-JSON requests fail atomically',async()=>{
 const f=await fixture();try{for(const [body,type,status] of [['{','application/json',400],['[]','application/json',400],['x'.repeat(20000),'application/json',413],['{}','text/plain',415]] as const){const r=await fetch(f.url+'/api/projects',{method:'POST',headers:{Origin:f.url,'Content-Type':type},body});assert.equal(r.status,status);assert.ok((await r.json() as {error:{code:string}}).error.code);}assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('regular files and repositories without a commit receive clear errors',async()=>{
 const f=await fixture();try{const file=join(f.allowed,'file');writeFileSync(file,'plain');assert.equal((await post(f,'File',file)).body.error.code,'INVALID_PATH');const unborn=join(f.allowed,'unborn');mkdirSync(unborn);git(unborn,'init','-q','-b','main');const response=await post(f,'Unborn',unborn);assert.equal(response.status,422);assert.equal(response.body.error.code,'HEAD_UNAVAILABLE');assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
test('inherited Git directory overrides cannot redirect validation',async()=>{
 const f=await fixture();const old=process.env.GIT_DIR;try{const r=repo(join(f.allowed,'actual'));const other=repo(join(f.root,'other'));process.env.GIT_DIR=join(other.path,'.git');const registered=await post(f,'Actual',r.path);assert.equal(registered.status,201);assert.equal(registered.body.repoRoot,realpathSync(r.path));assert.equal(registered.body.registeredHead,r.head);}finally{if(old===undefined)delete process.env.GIT_DIR;else process.env.GIT_DIR=old;await finish(f);}
});
test('listing remains SQLite-authoritative when Git is unavailable',async()=>{
 const f=await fixture();const old=process.env.PATH;try{const r=repo(join(f.allowed,'stored'));const registered=await post(f,'Stored',r.path);assert.equal(registered.status,201);process.env.PATH='/nonexistent-command-center-test-bin';assert.deepEqual((await list(f)).projects,[registered.body]);}finally{if(old===undefined)delete process.env.PATH;else process.env.PATH=old;await finish(f);}
});
test('configured root symlink and its canonical spelling share one project identity',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'alias-root-project'));const alias=join(f.root,'configured-alias');symlinkSync(f.allowed,alias);await f.app.close();f.app=createApplication({...f.config,projectRoots:[alias]},quiet);await f.app.start();const a=f.app.server.address();assert.ok(a&&typeof a!=='string');f.url=`http://127.0.0.1:${a.port}`;assert.equal((await post(f,'Alias',join(alias,'alias-root-project'))).status,201);assert.equal((await post(f,'Canonical',r.path)).status,409);}finally{await finish(f);}
});
test('failed persistence returns a typed failure and creates no project after reopen',async()=>{
 const f=await fixture();try{const r=repo(join(f.allowed,'unsaved'));f.app.database.connection.close();const failed=await post(f,'Unsaved',r.path);assert.equal(failed.status,500);assert.equal(failed.body.error.code,'PROJECT_STORAGE_FAILED');await f.app.close();f.app=createApplication(f.config,quiet);await f.app.start();const a=f.app.server.address();assert.ok(a&&typeof a!=='string');f.url=`http://127.0.0.1:${a.port}`;assert.equal((await list(f)).projects.length,0);}finally{await finish(f);}
});
