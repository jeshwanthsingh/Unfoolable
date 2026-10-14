import {safeBuildGit} from './build-workspace.ts';
import {realpathSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {materializeOracleTree} from './oracle-tree.ts';
import {collectExistingTests} from './protected-existing-tests.ts';
import type {OracleManifest} from '../../packages/shared/oracle.ts';
import {join} from 'node:path';
import {SpecError} from './spec-errors.ts';
export async function oracleSource(root:string,base:string,intent:string,collection?:{directory:string;signal:AbortSignal}){
 const paths=(await safeBuildGit(root,['ls-tree','-r','--name-only',base],1048576)).toString().trim().split('\n');
 let runner:'unittest'|'vitest'='unittest',directory='.';
 if(paths.includes('sdk/python/pyproject.toml'))directory='sdk/python';
 else if(paths.includes('frontend/package.json')){directory='frontend';runner='vitest';}
 else if(!paths.some(p=>p.startsWith('tests/test_')&&p.endsWith('.py')))throw new SpecError('UNSUPPORTED_RUNNER','No supported unittest or Vitest layout.',422);
 let dependencyRoot:string|null=null;
 if(runner==='vitest'){
  const pkg=JSON.parse((await safeBuildGit(root,['show',base+':frontend/package.json'],65536)).toString());if(!pkg.devDependencies?.vitest&&!pkg.dependencies?.vitest)throw new SpecError('UNSUPPORTED_RUNNER','This frontend does not use Vitest.',422);
  try{dependencyRoot=realpathSync(join(root,'frontend/node_modules'));}catch{throw new SpecError('DEPENDENCIES_UNAVAILABLE','Install the existing locked frontend dependencies before verification.',422);}
 }
 const words=intent.toLowerCase().match(/[a-z]{3,}/g)??[];
 const eligible=paths.filter(p=>(directory==='.'||p.startsWith(directory+'/'))&&/\.(py|tsx?|jsx?)$/.test(p)&&!/(?:^|\/)(?:node_modules|vendor|dist|fixtures)(?:\/|$)/.test(p));
 const scored=await Promise.all(eligible.slice(0,250).map(async p=>{
  const raw=await safeBuildGit(root,['show',base+':'+p],262145).catch(()=>Buffer.alloc(0));if(raw.length>262144)return {p,text:'',score:-1};const full=raw.toString();
  const lines=full.split('\n');let text=full;
  if(raw.length>20000){const frequency=words.map(w=>lines.filter(l=>l.toLowerCase().includes(w)).length),ranked=lines.map((l,i)=>({i,score:words.reduce((n,w,k)=>n+(l.toLowerCase().includes(w)?1/(frequency[k]!||1):0),0)+(/source(?:_|\s|['"])/i.test(l)&&/def |add_parser|args\.command|source_command/.test(l)?1:0)})).sort((a,b)=>b.score-a.score||a.i-b.i),wanted=new Set<number>();for(let i=0;i<Math.min(70,lines.length);i++)wanted.add(i);for(const hit of ranked.slice(0,10))for(let j=Math.max(0,hit.i-14);j<Math.min(lines.length,hit.i+48);j++)wanted.add(j);text=[...wanted].sort((a,b)=>a-b).map(i=>lines[i]).join('\n').slice(0,32000);}
  const lower=(p+' '+text).toLowerCase(),score=words.reduce((n,w)=>n+(lower.includes(w)?1:0)+(p.toLowerCase().includes(w)?3:0),0)+(p.includes('test_')?1:0)+(p==='research_router/cli.py'?100:p==='research_router/db.py'?90:p==='research_router/sources/manual.py'?80:p==='research_router/config.py'?75:0);return {p,text,score};
 }));
 const source:Record<string,string>={};let bytes=0;for(const file of scored.sort((a,b)=>b.score-a.score||a.p.localeCompare(b.p)).slice(0,14)){if(!file.text||bytes+Buffer.byteLength(file.text)>98304)continue;source[file.p]=file.text;bytes+=Buffer.byteLength(file.text);}
 const testPaths=eligible.filter(p=>runner==='unittest'?/(?:^|\/)test_[^/]+\.py$/.test(p):/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(p));
 let expectedTests:string[]=[],inventory:null|{directory:string;observationPath:unknown}=null;
 if(testPaths.length&&collection){
  const runDirectory=collection.directory;mkdirSync(runDirectory,{recursive:true,mode:0o700});
  const workspace=join(runDirectory,'base'),revision=directory==='sdk/python'?(await safeBuildGit(root,['rev-parse',base+':sdk/python'],1000)).toString().trim():base;
  await materializeOracleTree(root,revision,workspace);
  const manifest:OracleManifest={version:'process-oracle-v1',id:randomUUID(),sourceRoot:root,baseHead:base,evaluationSignature:'0'.repeat(64),runner,runnerDirectory:directory,dependencyRoot,componentPath:null,tests:[],assurance:'IN-PROCESS'};
  const paths=testPaths.map(p=>directory==='sdk/python'?p.slice(11):directory==='frontend'?p.slice(9):p);
  const result=await collectExistingTests(manifest,workspace,join(runDirectory,'collection'),paths,collection.signal);expectedTests=result.ids;inventory={directory:runDirectory,observationPath:result.execution.environment.observationPath};
 }
 return {runner,directory,dependencyRoot,source,expectedTests,inventory,paths:eligible};
}
