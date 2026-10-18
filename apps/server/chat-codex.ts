import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {prepareBuilderRuntime,createCodexBuilderDriver} from './build-runtime.ts';
import {builderFilesystem} from './builder-filesystem.ts';
import {fileURLToPath} from 'node:url';
import {certifyBuilderVersion} from './build-compatibility.ts';
import {ownedProcessSnapshot,reconcileOwnedProcesses} from './build-processes.ts';
import {sanitizeBuildValue,unsupportedResponse} from './build-protocol.ts';
import type {ProcessRecord} from '../../packages/shared/build.ts';
export type ChatUsage={inputTokens:number;outputTokens:number;totalTokens:number};
export type ChatDraftInput={message:string;repos:{displayName:string;repoPath:string}[];clarification?:string;signal?:AbortSignal};
export type ChatCodexDraft={title:string;repoPath:string;requestText:string;doneMeans:string;question:string|null;usage:ChatUsage|null;threadId:string;turnId:string};
export type ChatFuel={unknown:boolean;windows:{usedPercent:number;windowMinutes:number;resetsAt:number}[]};
const prompt='You only turn the supplied user message and supplied known repository names/paths into one ticket draft. No tools, files, repository inspection, execution, browsing, skills or edits. Do not invent a repository. Preserve the requested behavior. Write the title in plain English, at most eight words, with no code symbols. Keep technical specifics in requestText. Ask at most one concise question only if the repository or intended behavior is genuinely unclear. Otherwise question must be null. After a supplied clarification, never ask another question; make a draft or leave unclear fields empty for manual editing. Return only the requested structured JSON. This is a draft; no work starts.';
const schema={type:'object',additionalProperties:false,required:['title','repoPath','requestText','doneMeans','question'],properties:{title:{type:'string'},repoPath:{type:'string'},requestText:{type:'string'},doneMeans:{type:'string'},question:{anyOf:[{type:'string'},{type:'null'}]}}};
function text(value:unknown,max:number){return typeof value==='string'&&value.length<=max&& !value.includes('\0');}
export function parseChatDraft(value:unknown):Omit<ChatCodexDraft,'usage'|'threadId'|'turnId'>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Draft output was not an object.');const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(',')!=='doneMeans,question,repoPath,requestText,title'||!text(v.title,160)||!text(v.repoPath,4096)||!text(v.requestText,20000)||!text(v.doneMeans,10000)||!(v.question===null||text(v.question,500)))throw Error('Draft output did not match its bounded schema.');
 if(v.question===null&&(!(v.title as string).trim()||!(v.repoPath as string).trim()||!(v.requestText as string).trim()))throw Error('A complete draft needs a title, repository and request.');
 return v as Omit<ChatCodexDraft,'usage'|'threadId'|'turnId'>;
}
export function parseChatFuel(value:unknown):ChatFuel{
 if(!value||typeof value!=='object')return {unknown:true,windows:[]};const source=value as Record<string,unknown>,buckets=source.rateLimitsByLimitId&&typeof source.rateLimitsByLimitId==='object'?Object.values(source.rateLimitsByLimitId):[source.rateLimits],windows:ChatFuel['windows']=[];
 for(const bucket of buckets){if(!bucket||typeof bucket!=='object')continue;for(const key of ['primary','secondary']){const w=(bucket as Record<string,unknown>)[key];if(!w||typeof w!=='object')continue;const row=w as Record<string,unknown>;
 if(typeof row.usedPercent==='number'&&Number.isFinite(row.usedPercent)&&row.usedPercent>=0&&row.usedPercent<=100&&typeof row.windowDurationMins==='number'&&Number.isFinite(row.windowDurationMins)&&row.windowDurationMins>0&&typeof row.resetsAt==='number'&&Number.isSafeInteger(row.resetsAt)&&row.resetsAt>0){const item={usedPercent:row.usedPercent,windowMinutes:row.windowDurationMins,resetsAt:row.resetsAt};if(!windows.some(old=>JSON.stringify(old)===JSON.stringify(item)))windows.push(item);}}}
 return {unknown:windows.length===0,windows};
}
export function parseChatUsage(value:unknown):ChatUsage|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>,total=v.total??v.last;if(!total||typeof total!=='object')return null;const t=total as Record<string,unknown>;for(const key of ['inputTokens','outputTokens','totalTokens'])if(typeof t[key]!=='number'||!Number.isSafeInteger(t[key])||(t[key] as number)<0)return null;
 return {inputTokens:t.inputTokens as number,outputTokens:t.outputTokens as number,totalTokens:t.totalTokens as number};
}
type Fixture={launcher:string;args:string[];env:NodeJS.ProcessEnv;timeoutMs:number};
export function createChatCodex(options:{dataDir:string;artifactRoot?:string}){return create(options);}
/** Internal protocol-test seam. Application routes cannot supply executable/configuration. */
export function createChatCodexFixture(options:{dataDir:string},fixture:Fixture){return create(options,fixture);}
function create(options:{dataDir:string;artifactRoot?:string},fixture?:Fixture){
 const active=new Set<AbortController>(),jobs=new Set<Promise<unknown>>();let closed=false,emergencyStopping=false,cached:{at:number;value:ChatFuel}|null=null,fuelPending:Promise<ChatFuel>|null=null;
 async function session(mode:'draft'|'fuel',input?:ChatDraftInput){
  if(closed||emergencyStopping)throw Error('Chat runtime is stopped.');const control=new AbortController();active.add(control);const abort=()=>control.abort();input?.signal?.addEventListener('abort',abort,{once:true});if(input?.signal?.aborted)control.abort();
  const artifactDir=join(options.artifactRoot??join(options.dataDir,'chat-runtime'),randomUUID()),workspace=join(artifactDir,'empty-workspace');mkdirSync(workspace,{recursive:true,mode:0o700});let setup:Fixture;try{
   if(fixture)setup=fixture;else{certifyBuilderVersion(await createCodexBuilderDriver().version());const context={attemptId:randomUUID(),generation:1,transportId:randomUUID(),artifactDir,workspace,dataDir:resolve(options.dataDir),sourceRoot:workspace,gitCommonDir:workspace};const prepared=prepareBuilderRuntime(context,prompt),filesystem=builderFilesystem([resolve(options.dataDir),resolve(fileURLToPath(new URL('../../',import.meta.url))),join(homedir(),'Projects/ai-lab/command-center'),join(homedir(),'.bench-private')],workspace,workspace);
    // All Builder filesystem capabilities are downgraded to read-only. No repository is writable.
    for(const path of Object.keys(filesystem))if(filesystem[path]==='write')filesystem[path]='read';const profile='cc-chat-readonly',permissions={filesystem,network:{enabled:false}};
    setup={launcher:join(homedir(),'Projects/ai-lab/bin/codex'),args:[...prepared.args,'-c','permissions.'+profile+'='+JSON.stringify(permissions).replace(/"([^"\n]+)":/g,'"$1"='),'-c','default_permissions="'+profile+'"'],env:prepared.env,timeoutMs:mode==='draft'?90000:15000};}
  }catch{active.delete(control);input?.signal?.removeEventListener('abort',abort);throw Error('Read-only Codex runtime could not be prepared.');}
  const child=spawn(setup.launcher,setup.args,{cwd:workspace,env:setup.env,detached:true,stdio:['pipe','pipe','pipe']});let buffer='',next=0,stopping=false,records:ProcessRecord[]=[],threadId='',turnId='',usage:ChatUsage|null=null,output='',failure:Error|null=null;
  const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();let finish!:()=>void,rejectTurn!:(error:Error)=>void;const done=new Promise<void>((r,j)=>{finish=r;rejectTurn=j;});done.catch(()=>{});
  const send=(m:unknown)=>child.stdin.write(JSON.stringify(m)+'\n');const fail=(message:string)=>{if(!failure){failure=Error(message);for(const p of pending.values())p.reject(failure);pending.clear();rejectTurn(failure);}};
  const rpc=(method:string,params:unknown)=>new Promise<any>((r,j)=>{if(failure||control.signal.aborted||stopping){j(failure??Error('Read-only Codex operation cancelled.'));return;}const id=++next;pending.set(id,{resolve:r,reject:j});try{send({id,method,params});}catch{pending.delete(id);j(Error('Codex transport closed.'));}});
  child.stdout.on('data',(chunk:Buffer)=>{buffer+=chunk.toString();if(Buffer.byteLength(buffer)>1024*1024){fail('Codex response exceeded its bound.');return;}let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);let m:any;try{m=JSON.parse(line);}catch{fail('Codex returned an invalid protocol frame.');continue;}if(!m||typeof m!=='object'||Array.isArray(m)){fail('Codex returned an invalid protocol frame.');continue;}
   if(m.id!==undefined&&m.method){send(unsupportedResponse(m.method,m.id));fail('Read-only drafting requested an unsupported tool or permission.');continue;}if(m.id!==undefined){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('Codex rejected the read-only request.')):p.resolve(m.result);}continue;}
   const p=m.params??{};if(p.threadId&&threadId&&p.threadId!==threadId)continue;if(p.turnId&&turnId&&p.turnId!==turnId)continue;
   if(m.method==='thread/tokenUsage/updated')usage=parseChatUsage(p.tokenUsage);
   if((m.method==='item/started'||m.method==='item/completed')&&p.item){if(!['agentMessage','reasoning','userMessage'].includes(p.item.type)){fail('Drafting attempted a tool operation; no draft was accepted.');continue;}if(m.method==='item/completed'&&p.item.type==='agentMessage'){if(typeof p.item.text!=='string'||Buffer.byteLength(p.item.text)>40000){fail('Draft response exceeded its bound.');continue;}output=p.item.text;}}
   if(m.method==='turn/completed'){if(p.turn?.status==='completed')finish();else fail('Read-only draft did not complete.');}
  }});
  child.stderr.resume();child.stdin.on('error',()=>fail('Codex transport closed.'));child.on('error',()=>fail('Codex could not start.'));child.on('exit',()=>{if(!stopping)fail('Codex exited before completing the request.');});
  const deadline=setTimeout(()=>fail('Read-only Codex deadline exceeded.'),setup.timeoutMs),onAbort=()=>fail('Read-only Codex operation cancelled.');control.signal.addEventListener('abort',onAbort,{once:true});const snapshot=()=>{try{if(child.pid){const rows=ownedProcessSnapshot(child.pid),byId=new Map(records.map(r=>[r.pid+':'+r.birth,r]));for(const row of rows)byId.set(row.pid+':'+row.birth,row);records=[...byId.values()];}}catch{fail('Codex process ownership could not be established.');}};const monitor=setInterval(snapshot,200);
  try{
   await new Promise<void>((r,j)=>{child.once('spawn',r);child.once('error',j);});snapshot();if(control.signal.aborted)onAbort();if(failure)throw failure;
   await rpc('initialize',{clientInfo:{name:'command_center_chat',version:'0.0.1'},capabilities:{experimentalApi:true}});send({method:'initialized'});
   if(mode==='fuel')return parseChatFuel(await rpc('account/rateLimits/read',{}));
   const thread=await rpc('thread/start',{cwd:workspace,permissions:'cc-chat-readonly',approvalPolicy:'on-request',approvalsReviewer:'user',ephemeral:true,model:'gpt-6.1-sol',developerInstructions:prompt,config:{model_reasoning_effort:'low'}});threadId=thread.thread.id;
   if(thread.thread.cliVersion!=='0.160.0'||thread.activePermissionProfile?.id!=='cc-chat-readonly')throw Error('Read-only profile/version was not confirmed.');
   const turn=await rpc('turn/start',{threadId,input:[{type:'text',text:JSON.stringify({message:input!.message,repos:input!.repos,clarification:input!.clarification??null}),text_elements:[]}],permissions:'cc-chat-readonly',approvalPolicy:'on-request',approvalsReviewer:'user',effort:'low',outputSchema:schema});turnId=turn.turn.id;await done;if(failure)throw failure;
   try{const parsed=parseChatDraft(JSON.parse(output));if(parsed.repoPath&&!input!.repos.some(r=>r.repoPath===parsed.repoPath))throw Error('Draft selected an unknown repository.');if(input!.clarification&&parsed.question!==null)throw Error('Draft asked a second question.');return {...parsed,usage,threadId,turnId};}catch{writeFileSync(join(artifactDir,'rejected-output.json'),JSON.stringify({reason:'Draft schema/repository/clarification validation failed',output:String(sanitizeBuildValue(output)).slice(0,40000),usage,threadId,turnId}),{mode:0o600});throw Error('Codex draft was rejected; edit the request or retry.');}
  }catch(error){if(mode==='draft'&&!existsSync(join(artifactDir,'rejected-output.json')))writeFileSync(join(artifactDir,'rejected-output.json'),JSON.stringify({reason: String(sanitizeBuildValue(error instanceof Error?error.message:'Read-only draft failed')),output:String(sanitizeBuildValue(output)).slice(0,40000),usage,threadId,turnId}),{mode:0o600});if(error instanceof Error)Object.assign(error,{usage,threadId,turnId});throw error;}finally{stopping=true;clearTimeout(deadline);clearInterval(monitor);snapshot();control.signal.removeEventListener('abort',onAbort);input?.signal?.removeEventListener('abort',abort);active.delete(control);try{child.stdin.end();}catch{}const cleanup=await reconcileOwnedProcesses(records);if(!cleanup.verified)throw Error('Read-only Codex process cleanup could not be verified.');}
 }
 function track<T>(job:Promise<T>){jobs.add(job);job.finally(()=>jobs.delete(job)).catch(()=>{});return job;}
 return {async draft(input:ChatDraftInput){return await track(session('draft',input)) as ChatCodexDraft;},async fuel():Promise<ChatFuel>{if(closed||emergencyStopping)return {unknown:true,windows:[]};if(cached&&Date.now()-cached.at<60000)return cached.value;if(fuelPending)return fuelPending;fuelPending=(async()=>{let value:ChatFuel;try{value=await track(session('fuel')) as ChatFuel;}catch{value={unknown:true,windows:[]};}cached={at:Date.now(),value};return value;})().finally(()=>{fuelPending=null;});return fuelPending;},async stopAll(){emergencyStopping=true;for(const c of active)c.abort();const outcomes=await Promise.allSettled([...jobs]);cached=null;emergencyStopping=false;if(outcomes.some(o=>o.status==='rejected'&&/cleanup/i.test(String(o.reason))))throw Error('Chat cleanup could not be verified.');},async close(){closed=true;for(const c of active)c.abort();await Promise.allSettled([...jobs]);}};
}
