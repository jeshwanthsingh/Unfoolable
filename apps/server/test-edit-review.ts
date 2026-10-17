import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {createHash} from 'node:crypto';
const tool=resolve('.work/quality-tools/js/node_modules/.bin/ast-grep');
const cache=new Map<string,boolean>();
const env={PATH:dirname(process.execPath)+':/opt/homebrew/bin:/usr/bin:/bin',HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_COUNT:'0',GIT_TERMINAL_PROMPT:'0'};
// Native AST extraction only; Candidate test code is never executed here.
export function existingTestsUnchanged(base:string,candidate:string,path:string):boolean {
 const language=path.endsWith('.py')?'python':/\.[cm]?tsx?$/.test(path)?'typescript':/\.[cm]?jsx?$/.test(path)?'javascript':null;
 if(!language||!existsSync(tool))return false;
 const extract=(source:string)=>{if(!source.trim())return [];const result=execFileSync(tool,['run','--lang',language,...(language==='python'?['--kind','function_definition']:['--pattern','$CALL($$$ARGS)']),'--json=compact','--stdin'],{input:source,encoding:'utf8',timeout:3000,maxBuffer:2*1024*1024,env});const rows=JSON.parse(result) as {text:string;metaVariables?:{single?:{CALL?:{text?:string}}}}[];return rows.filter(r=>language==='python'||/^(?:test|it)(?:\.(?:each|skip|only|todo|concurrent))?$/.test(r.metaVariables?.single?.CALL?.text??'')).map(r=>r.text);};
 try{const old=extract(base),current=extract(candidate);if(!old.length&&base.trim())return false;const counts=new Map<string,number>();for(const text of current)counts.set(text,(counts.get(text)??0)+1);for(const text of old){const n=counts.get(text)??0;if(!n)return false;counts.set(text,n-1);}return candidate===base||current.length>old.length;}catch{return false;}
}
export function reviewTestEdits(repo:string,base:string,candidate:string,paths:string[]){
 const result:Record<string,boolean>={};const git=(args:string[])=>execFileSync('git',['--no-pager','-C',repo,...args],{encoding:'utf8',timeout:3000,maxBuffer:2*1024*1024,env,stdio:['ignore','pipe','pipe']});
 for(const path of paths.filter(p=>/(^|\/)(tests?|__tests__)(\/|$)|(^|\/)(test_[^/]+|[^/]+_test)\.[^/]+$|[._-](test|spec)\.[^/]+$/i.test(p))){const key=createHash('sha256').update(JSON.stringify([repo,base,candidate,path])).digest('hex');if(cache.has(key)){result[path]=cache.get(key)!;continue;}let unchanged=false;try{const existed=git(['ls-tree','-z',base,'--',path]);unchanged=!existed||existingTestsUnchanged(git(['show',base+':'+path]),git(['show',candidate+':'+path]),path);}catch{}if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(key,unchanged);result[path]=unchanged;}
 return result;
}
