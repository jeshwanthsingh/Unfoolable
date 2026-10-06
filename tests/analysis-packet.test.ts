import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildAnalysisPacket} from '../apps/server/analysis-packet.ts';
import {observeRepository} from '../apps/server/context-repository.ts';
import {canonicalJson,payloadHash} from '../apps/server/context-observation.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
import type {Mission} from '../packages/shared/missions.ts';
import type {ProjectContextSnapshot} from '../packages/shared/context.ts';
const quiet=()=>{};
const mission:Mission={id:'mission',projectId:'project',originalIntent:'Fix refresh race while preserving auth token behavior',phase:'DRAFT',createdAt:'2026-10-06T00:00:00.000Z'};
function git(root:string,...args:string[]){return execFileSync('git',['--no-optional-locks','-C',root,...args],{encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}}).trim();}
function fixture(){const root=realpathSync(mkdtempSync(join(tmpdir(),'cc-packet-')));git(root,'init','-q','-b','main');return root;}
function write(root:string,path:string,content:string|Buffer){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),content);}
function commit(root:string){git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','fixture');}
async function snapshot(root:string):Promise<ProjectContextSnapshot>{const payload=await observeRepository(root,[root],quiet);return {id:'snapshot',missionId:mission.id,payload,snapshotHash:payloadHash(payload),createdAt:mission.createdAt};}
function state(root:string){return {head:git(root,'rev-parse','HEAD'),status:git(root,'status','--porcelain'),index:readFileSync(join(root,'.git/index')).toString('hex')};}

test('packet selects refresh sources, nearby tests, guidance and manifest with authentic line provenance',async()=>{
 const root=fixture();try{
  write(root,'AGENTS.md','Keep changes bounded.\nNever execute repository scripts.');write(root,'package.json','{"scripts":{"test":"must not execute"}}');
  write(root,'src/refresh.ts',Array.from({length:100},(_,i)=>i===49?'export const refresh = () => token;':`const value${i+1} = ${i+1};`).join('\n'));
  write(root,'tests/refresh.test.ts','assert behavior');write(root,'src/auth.ts','export const auth = "business source";');write(root,'src/token.ts','export const token = "business source";');
  commit(root);const s=await snapshot(root),before=state(root);const {packet,hash,elapsedMs}=await buildAnalysisPacket(mission,s,root,[root],quiet);
  assert.deepEqual(state(root),before);assert.ok(elapsedMs>=0);assert.equal(hash,payloadHash(packet));assert.equal(packet.sourcePolicy,'committed-head-only');assert.equal(packet.project.dirty,false);
  for(const path of ['AGENTS.md','package.json','src/refresh.ts','tests/refresh.test.ts','src/auth.ts','src/token.ts'])assert.ok(packet.evidence.some(e=>e.path===path),path);
  const block=packet.evidence.find(e=>e.path==='src/refresh.ts')!;assert.equal(block.startLine,38);assert.equal(block.endLine,62);assert.equal(block.content.split('\n')[12],'export const refresh = () => token;');
  for(const e of packet.evidence)assert.equal(e.contentHash,createHash('sha256').update(e.content).digest('hex'));
  assert.ok(!canonicalJson(packet).includes(root));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('committed snapshot evidence stays identical after dirty writes and a later HEAD',async()=>{
 const root=fixture();try{
  write(root,'src/refresh.ts','export const refresh = "committed";\n');commit(root);write(root,'src/refresh.ts','dirty refresh secret');const s=await snapshot(root);
  const a=await buildAnalysisPacket(mission,s,root,[root],quiet);assert.equal(a.packet.project.dirty,true);assert.ok(a.packet.evidence[0]!.content.includes('committed'));assert.ok(!canonicalJson(a.packet).includes('dirty refresh secret'));
  write(root,'src/refresh.ts','new refresh behavior');commit(root);write(root,'untracked-refresh.ts','untracked secret');
  const b=await buildAnalysisPacket(mission,s,root,[root],quiet);assert.deepEqual(a.packet,b.packet);assert.equal(a.hash,b.hash);assert.notEqual(git(root,'rev-parse','HEAD'),s.payload.baseHead);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('secrets, generated content, binary blobs and external symlinks never enter evidence',async()=>{
 const root=fixture();const external=mkdtempSync(join(tmpdir(),'cc-packet-external-'));try{
  for(const path of ['.env','.env.local','credentials/store.json','.npmrc','keymaterial/refresh.ts','id_rsa','refresh.pem','tokens.json','dist/refresh.ts','src/refresh.min.js'])write(root,path,'refresh SECRET_SENTINEL');
  write(root,'src/refresh-binary.ts',Buffer.from('refresh\0BINARY_SENTINEL'));write(root,'src/refresh.ts','refresh safe source');write(external,'outside.txt','EXTERNAL_SENTINEL');symlinkSync(join(external,'outside.txt'),join(root,'refresh-link.ts'));
  commit(root);const s=await snapshot(root),before=state(root);const {packet}=await buildAnalysisPacket(mission,s,root,[root],quiet);const text=canonicalJson(packet);
  assert.deepEqual(state(root),before);for(const value of ['SECRET_SENTINEL','BINARY_SENTINEL','EXTERNAL_SENTINEL','refresh-link.ts'])assert.ok(!text.includes(value),value);
  assert.ok(packet.evidence.some(e=>e.path==='src/refresh.ts'));
 }finally{rmSync(root,{recursive:true,force:true});rmSync(external,{recursive:true,force:true});}
});

test('merged windows preserve original line numbers and record omitted block content',async()=>{
 const root=fixture();try{
  write(root,'src/refresh.ts',Array.from({length:100},(_,i)=>[29,39,79].includes(i)?'refresh race':`line ${i+1}`).join('\n'));
  write(root,'src/refresh-large.ts',Array.from({length:40},()=> 'refresh '+'x'.repeat(900)).join('\n'));write(root,'src/refresh-oversize.ts','refresh\n'+'x'.repeat(PACKET_LIMITS.fileBytes));commit(root);
  const {packet}=await buildAnalysisPacket(mission,await snapshot(root),root,[root],quiet);const blocks=packet.evidence.filter(e=>e.path==='src/refresh.ts');
  assert.deepEqual(blocks.map(e=>[e.startLine,e.endLine]),[[18,52],[68,92]]);assert.equal(blocks[0]!.content.split('\n')[0],'line 18');assert.equal(packet.evidenceTruncated,true);assert.ok(!packet.evidence.some(e=>e.path==='src/refresh-oversize.ts'));
  for(const e of packet.evidence){assert.ok(Buffer.byteLength(e.content)<=PACKET_LIMITS.blockBytes);assert.equal(e.content.split('\n').length,e.endLine-e.startLine+1);}
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('file, search, evidence and packet budgets bound a broad mission deterministically',async()=>{
 const root=fixture();try{
  for(let i=0;i<220;i++)write(root,`src/refresh-${String(i).padStart(3,'0')}.ts`,Array.from({length:45},(_,n)=>`refresh row ${n} ${'x'.repeat(250)}`).join('\n'));
  commit(root);const s=await snapshot(root),a=await buildAnalysisPacket(mission,s,root,[root],quiet),b=await buildAnalysisPacket(mission,s,root,[root],quiet);
  assert.equal(a.hash,b.hash);assert.equal(a.packet.evidenceTruncated,true);assert.ok(new Set(a.packet.evidence.map(e=>e.path)).size<=PACKET_LIMITS.files);assert.ok(a.packet.evidence.length<=PACKET_LIMITS.blocks);
  assert.ok(a.packet.evidence.reduce((n,e)=>n+Buffer.byteLength(e.content),0)<=PACKET_LIMITS.evidenceBytes);assert.ok(Buffer.byteLength(canonicalJson(a.packet))<=PACKET_LIMITS.packetBytes);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('invalid commit, mismatched mission and changed registered root fail closed',async()=>{
 const root=fixture();const alias=join(tmpdir(),'cc-packet-alias-'+process.pid);try{
  write(root,'src/refresh.ts','refresh');commit(root);const s=await snapshot(root);
  await assert.rejects(buildAnalysisPacket(mission,{...s,missionId:'other'},root,[root],quiet),{code:'ANALYSIS_INVALID_SNAPSHOT'});
  await assert.rejects(buildAnalysisPacket(mission,{...s,payload:{...s.payload,baseHead:'a'.repeat(40)}},root,[root],quiet),{code:'ANALYSIS_PACKET_FAILED'});
  symlinkSync(root,alias);await assert.rejects(buildAnalysisPacket(mission,s,alias,[root],quiet),{code:'ANALYSIS_REPOSITORY_CHANGED'});
 }finally{rmSync(alias,{force:true});rmSync(root,{recursive:true,force:true});}
});

test('mutable Git replacement refs cannot change evidence behind the pinned snapshot OID',async()=>{
 const root=fixture();try{write(root,'src/refresh.ts','export const refresh = "original committed behavior";\n');commit(root);const s=await snapshot(root);const before=await buildAnalysisPacket(mission,s,root,[root],quiet);const oid=git(root,'rev-parse',s.payload.baseHead+':src/refresh.ts');write(root,'replacement.txt','export const refresh = "replacement not in pinned commit";\n');const alternate=git(root,'hash-object','-w','replacement.txt');git(root,'replace',oid,alternate);const after=await buildAnalysisPacket(mission,s,root,[root],quiet);assert.equal(after.hash,before.hash);assert.deepEqual(after.packet,before.packet);assert.ok(canonicalJson(after.packet).includes('original committed behavior'));assert.ok(!canonicalJson(after.packet).includes('replacement not in pinned commit'));}finally{rmSync(root,{recursive:true,force:true});}
});

test('unrelated nested guidance cannot crowd out relevant source and test evidence',async()=>{
 const root=fixture();try{
  write(root,'AGENTS.md','Preserve public auth behavior.');write(root,'README.md','Repository orientation.');
  for(let i=0;i<30;i++)write(root,`docs/topic-${i}/README.md`,'Unrelated documentation.');
  write(root,'src/refresh.ts','export const refresh = () => token;');write(root,'tests/refresh.test.ts','refresh behavior must remain compatible');commit(root);
  const {packet}=await buildAnalysisPacket(mission,await snapshot(root),root,[root],quiet);
  assert.ok(packet.evidence.some(e=>e.path==='src/refresh.ts'));assert.ok(packet.evidence.some(e=>e.path==='tests/refresh.test.ts'));
  assert.ok(packet.evidence.filter(e=>e.kind==='guidance').length<=3);assert.equal(packet.evidenceTruncated,true);
 }finally{rmSync(root,{recursive:true,force:true});}
});
