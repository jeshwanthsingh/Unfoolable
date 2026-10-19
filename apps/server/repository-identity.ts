import {SpecError} from './spec-errors.ts';
import {AsyncLocalStorage} from 'node:async_hooks';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {canonicalContractJson} from './contract-store.ts';
const readScope=new AsyncLocalStorage<Map<string,string>>();
/** One synchronous display projection only. Never wrap authorization or asynchronous operations. */
export function readRepositoryIdentities<T>(read:()=>T):T{return readScope.run(new Map(),read);}
/** Local-only repositories deliberately share identity with their history-preserving clones. */
export function repositoryIdentity(repo:string):string {
 try{const root=realpathSync(repo),cached=readScope.getStore()?.get(root);if(cached)return cached;
 const git=(args:string[])=>execFileSync('git',['--no-pager','-C',root,...args],{encoding:'utf8',timeout:10000,maxBuffer:65536,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,HOME:'/nonexistent',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_COUNT:'0',GIT_TERMINAL_PROMPT:'0'}}).trim();
 const roots=git(['rev-list','--max-parents=0','HEAD']).split('\n').sort();
 if(!roots.length||roots.some(x=>!/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(x)))throw Error('Repository identity unavailable');
 let remote:string|null=null;
 try{remote=git(['config','--local','--get','remote.origin.url'])||null;}catch(error){if((error as {status?:number}).status!==1)throw Error('Repository identity unavailable');}
 // Persist only the digest: remote URLs can contain credentials.
 const identity=createHash('sha256').update(canonicalContractJson({roots,remote:remote===null?'NO_REMOTE':{url:remote}})).digest('hex');readScope.getStore()?.set(root,identity);return identity;}catch{throw new SpecError('REPOSITORY_UNAVAILABLE','Cannot read this project right now. Check that its folder is available, then try again.',503);}
}
