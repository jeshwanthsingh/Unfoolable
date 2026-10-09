import {safeBuildGit} from './build-workspace.ts';
import {realpathSync} from 'node:fs';
import {join} from 'node:path';
import {SpecError} from './spec-errors.ts';
export async function oracleSource(root:string,base:string,intent:string){
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
 const words=intent.toLowerCase().match(/[a-z][a-z_-]{3,}/g)??[];
 const eligible=paths.filter(p=>(directory==='.'||p.startsWith(directory+'/'))&&/\.(py|tsx?|jsx?)$/.test(p)&&!/(?:^|\/)(?:node_modules|vendor|dist|fixtures)(?:\/|$)/.test(p));
 const scored=await Promise.all(eligible.slice(0,250).map(async p=>{
  const raw=await safeBuildGit(root,['show',base+':'+p],65537).catch(()=>Buffer.alloc(0));if(raw.length>65536)return {p,text:'',score:-1};const text=raw.toString();
  const lower=(p+' '+text).toLowerCase(),score=words.reduce((n,w)=>n+(lower.includes(w)?1:0)+(p.toLowerCase().includes(w)?3:0),0)+(p.includes('test_')?1:0);return {p,text,score};
 }));
 const source:Record<string,string>={};let bytes=0;for(const file of scored.sort((a,b)=>b.score-a.score||a.p.localeCompare(b.p)).slice(0,12)){if(!file.text||bytes+Buffer.byteLength(file.text)>65536)continue;source[file.p]=file.text;bytes+=Buffer.byteLength(file.text);}
 return {runner,directory,dependencyRoot,source};
}
