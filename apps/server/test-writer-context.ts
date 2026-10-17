import {execFile} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {safeBuildGit} from './build-workspace.ts';
export const WRITER_TOKEN_LIMIT=40000;
export function remainingWriterTokens(costs:({totalTokens:number}|null)[]){if(costs.some(c=>c===null))return 0;return Math.max(0,WRITER_TOKEN_LIMIT-costs.reduce((n,c)=>n+c!.totalTokens,0));}
export type WriterContextOptions={changedPaths:string[];playbookCommand:string|null;tokenBudget:number};
export async function relevantBaseDefinitions(path:string,source:string,request:string,budget:number){
 const python=fileURLToPath(new URL('../../.work/tools/tree-sitter/bin/python',import.meta.url)),script=fileURLToPath(new URL('../../scripts/protected-verification/writer-context-map.py',import.meta.url));
 const output=await new Promise<string>((resolve,reject)=>{const child=execFile(python,['-I',script],{timeout:5000,maxBuffer:262144,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C',TZ:'UTC'}},(error,stdout)=>error?reject(Error('Tree-sitter context unavailable')):resolve(stdout));child.stdin?.end(JSON.stringify({path,source,request,budget}));});
 const map=JSON.parse(output) as {content:string;language:string;ranges:{startLine:number;endLine:number;kind:string}[];versions:Record<string,string>};
 if(typeof map.content!=='string'||Buffer.byteLength(map.content)>budget||!Array.isArray(map.ranges)||!map.ranges.length)throw Error('Invalid bounded tree-sitter context');return map;
}
export async function writerContextPack(repo:string,base:string,request:string,target:string,options:WriterContextOptions){
 const paths=(await safeBuildGit(repo,['ls-tree','-r','--name-only',base],1048576)).toString().trim().split('\n');
 const allowed=paths.filter(p=>!/(?:^|\/)(?:node_modules|vendor|dist)(?:\/|$)/.test(p)&&!/(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]+\.(?:pem|key)|(?:credentials|tokens|secrets|auth|cookies)(?:\.[^/]*)?)$/i.test(p)&&/\.(?:py|[cm]?[jt]sx?|json|toml|md)$/.test(p));
 const words=request.toLowerCase().match(/[a-z_]{4,}/g)??[],changed=new Set(options.changedPaths),ranked=allowed.map(p=>({p,score:(changed.has(p)?100:0)+words.reduce((n,w)=>n+(p.toLowerCase().includes(w)?4:0),0)+(p.includes('test')?1:0)})).sort((a,b)=>b.score-a.score||a.p.localeCompare(b.p));
 const maxBytes=Math.min(32000,Math.max(0,options.tokenBudget*2)),files:Record<string,string>={},omitted:string[]=[],selections:Record<string,unknown>={};let bytes=Buffer.byteLength(request)+Buffer.byteLength(options.playbookCommand??'');mkdirSync(target,{mode:0o700});
 for(const {p}of ranked.slice(0,18)){
  const blob=await safeBuildGit(repo,['show',base+':'+p],1048577).catch(()=>null);if(!blob||blob.length>1048576||Object.keys(files).length>=6){omitted.push(p);continue;}
  let content=blob.toString();
  if(blob.length>12000||bytes+blob.length>maxBytes){
   if(!/\.(?:py|[cm]?[jt]sx?)$/.test(p)){omitted.push(p);continue;}
   try{const map=await relevantBaseDefinitions(p,content,request,Math.max(0,Math.min(16000,maxBytes-bytes)));content=map.content;selections[p]={mode:'BASE_EXCERPTS',language:map.language,ranges:map.ranges,versions:map.versions};}catch{omitted.push(p);continue;}
  }else selections[p]={mode:'FULL_BASE_FILE'};
  const size=Buffer.byteLength(content);if(bytes+size>maxBytes){omitted.push(p);delete selections[p];continue;}
  files[p]=content;bytes+=size;mkdirSync(dirname(join(target,p)),{recursive:true,mode:0o700});writeFileSync(join(target,p),content,{flag:'wx',mode:0o400});
 }
 return {request,changedPaths:[...options.changedPaths],approvedPlaybookTestCommand:options.playbookCommand,files,selections,omittedBaseFiles:omitted,bytes,tokenBudget:options.tokenBudget};
}
