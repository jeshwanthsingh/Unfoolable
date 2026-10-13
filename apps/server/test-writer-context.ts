import {mkdirSync,writeFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {safeBuildGit} from './build-workspace.ts';
export const WRITER_TOKEN_LIMIT=40000;
export function remainingWriterTokens(costs:({totalTokens:number}|null)[]){if(costs.some(c=>c===null))return 0;return Math.max(0,WRITER_TOKEN_LIMIT-costs.reduce((n,c)=>n+c!.totalTokens,0));}
export type WriterContextOptions={changedPaths:string[];playbookCommand:string|null;tokenBudget:number};
export async function writerContextPack(repo:string,base:string,request:string,target:string,options:WriterContextOptions){
 const paths=(await safeBuildGit(repo,['ls-tree','-r','--name-only',base],1048576)).toString().trim().split('\n');
 const allowed=paths.filter(p=>!/(?:^|\/)(?:node_modules|vendor|dist)(?:\/|$)/.test(p)&&!/(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]+\.(?:pem|key)|(?:credentials|tokens|secrets|auth|cookies)(?:\.[^/]*)?)$/i.test(p)&&/\.(?:py|[cm]?[jt]sx?|json|toml|md)$/.test(p));
 const words=request.toLowerCase().match(/[a-z_]{4,}/g)??[],changed=new Set(options.changedPaths),ranked=allowed.map(p=>({p,score:(changed.has(p)?100:0)+words.reduce((n,w)=>n+(p.toLowerCase().includes(w)?4:0),0)+(p.includes('test')?1:0)})).sort((a,b)=>b.score-a.score||a.p.localeCompare(b.p));
 const maxBytes=Math.min(32000,Math.max(0,options.tokenBudget*2)),files:Record<string,string>={},omitted:string[]=[];let bytes=Buffer.byteLength(request)+Buffer.byteLength(options.playbookCommand??'');mkdirSync(target,{mode:0o700});
 for(const {p}of ranked.slice(0,18)){
  const blob=await safeBuildGit(repo,['show',base+':'+p],131072).catch(()=>null);if(!blob||bytes+blob.length>maxBytes||Object.keys(files).length>=6){omitted.push(p);continue;}
  files[p]=blob.toString();bytes+=blob.length;mkdirSync(dirname(join(target,p)),{recursive:true,mode:0o700});writeFileSync(join(target,p),blob,{flag:'wx',mode:0o400});
 }
 return {request,changedPaths:[...options.changedPaths],approvedPlaybookTestCommand:options.playbookCommand,files,omittedBaseFiles:omitted,bytes,tokenBudget:options.tokenBudget};
}
