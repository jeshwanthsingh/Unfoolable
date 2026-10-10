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
 const words=intent.toLowerCase().match(/[a-z]{3,}/g)??[];
 const eligible=paths.filter(p=>(directory==='.'||p.startsWith(directory+'/'))&&/\.(py|tsx?|jsx?)$/.test(p)&&!/(?:^|\/)(?:node_modules|vendor|dist|fixtures)(?:\/|$)/.test(p));
 const scored=await Promise.all(eligible.slice(0,250).map(async p=>{
  const raw=await safeBuildGit(root,['show',base+':'+p],262145).catch(()=>Buffer.alloc(0));if(raw.length>262144)return {p,text:'',score:-1};const full=raw.toString();
  const lines=full.split('\n');let text=full;
  if(raw.length>20000){const frequency=words.map(w=>lines.filter(l=>l.toLowerCase().includes(w)).length),ranked=lines.map((l,i)=>({i,score:words.reduce((n,w,k)=>n+(l.toLowerCase().includes(w)?1/(frequency[k]!||1):0),0)+(/source(?:_|\s|['"])/i.test(l)&&/def |add_parser|args\.command|source_command/.test(l)?1:0)})).sort((a,b)=>b.score-a.score||a.i-b.i),wanted=new Set<number>();for(let i=0;i<Math.min(70,lines.length);i++)wanted.add(i);for(const hit of ranked.slice(0,10))for(let j=Math.max(0,hit.i-14);j<Math.min(lines.length,hit.i+48);j++)wanted.add(j);text=[...wanted].sort((a,b)=>a-b).map(i=>lines[i]).join('\n').slice(0,32000);}
  const lower=(p+' '+text).toLowerCase(),score=words.reduce((n,w)=>n+(lower.includes(w)?1:0)+(p.toLowerCase().includes(w)?3:0),0)+(p.includes('test_')?1:0)+(p==='research_router/cli.py'?100:p==='research_router/db.py'?90:p==='research_router/sources/manual.py'?80:p==='research_router/config.py'?75:0);return {p,text,score};
 }));
 const source:Record<string,string>={};let bytes=0;for(const file of scored.sort((a,b)=>b.score-a.score||a.p.localeCompare(b.p)).slice(0,14)){if(!file.text||bytes+Buffer.byteLength(file.text)>98304)continue;source[file.p]=file.text;bytes+=Buffer.byteLength(file.text);}
 const expectedTests:string[]=[];
 for(const p of eligible.filter(p=>/(?:^|\/)(?:tests|__tests__)\//.test(p))){const text=(await safeBuildGit(root,['show',base+':'+p],262145)).toString();
  if(runner==='unittest'){let className='';for(const line of text.split('\n')){const cls=/^class (\w+)\([^)]*(?:TestCase|Tests)[^)]*\):/.exec(line);if(cls)className=cls[1]!;const method=/^ +def (test_\w+)\(self\)/.exec(line);if(className&&method)expectedTests.push(p.split('/').at(-1)!.replace(/\.py$/,'')+'.'+className+'.'+method[1]);}}
  else for(const match of text.matchAll(/\b(?:test|it)\(\s*(['"])((?:\\.|(?!\1)[^\\\r\n])*)\1/g)){
   // Decode only literal titles; never evaluate repository JavaScript.
   const body=match[1]==='"'?match[2]!:match[2]!.replace(/\\.|"/g,part=>part==="\\'"?"'":part==='"'?'\\"':part);
   try{expectedTests.push(JSON.parse('"'+body+'"') as string);}catch{throw new SpecError('UNSUPPORTED_TEST_TITLE','A frozen test title uses unsupported string escapes.',422);}
  }
 }
 return {runner,directory,dependencyRoot,source,expectedTests:expectedTests.sort(),paths:eligible};
}
