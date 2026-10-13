import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,lstatSync,realpathSync,symlinkSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {homedir} from 'node:os';
import {prepareJsonDirectory,type JsonOwnership,type CodexJsonResult} from './codex-json.ts';
import {processIdentity,sameProcess,ownedProcessSnapshot,reconcileOwnedProcesses} from './build-processes.ts';
import type {ProcessRecord} from '../../packages/shared/build.ts';

/** The only tool this fresh session receives. Paths resolve against a Git archive, never a checkout. */
export function baseReader(exportRoot:string){
 const root=realpathSync(exportRoot),files:string[]=[];
 const walk=(dir:string)=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(entry.isFile())files.push(relative(root,path));else throw Error('BASE export contains unsupported entry');}};walk(root);
 return (path:unknown)=>{if(typeof path!=='string'||isAbsolute(path)||path.includes('\\')||path.split('/').some(p=>p==='..'))throw Error('Only relative BASE paths may be read');if(path==='')return JSON.stringify({files:files.sort()});const target=resolve(root,path);if(!files.includes(relative(root,target))||realpathSync(target)!==target||!lstatSync(target).isFile())throw Error('Not a BASE file');return readFileSync(target,'utf8');};
}

/** Tool-free provider plus one host read capability; no shell, filesystem write, Candidate or network tools. */
export async function runWriterSession(root:string,input:unknown,directory:string,signal:AbortSignal,prompt:string,schema:unknown,ownership:JsonOwnership={processes:()=>{}}):Promise<CodexJsonResult>{
 const launcher=join(homedir(),'Projects/ai-lab/bin/codex'),read=baseReader(root);
 if(['OPENAI_API_KEY','OPENROUTER_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY'].some(k=>process.env[k]))throw Error('Existing ChatGPT account required');
 const env={PATH:process.env.PATH,HOME:homedir(),LANG:'C',LC_ALL:'C',TMPDIR:directory};
 const auth=spawnSync(launcher,['login','status'],{env,encoding:'utf8',timeout:5000});
 if(execFileSync(launcher,['--version'],{env,encoding:'utf8',timeout:5000}).trim()!=='codex-cli 0.160.0'||auth.status!==0|| !/Logged in using ChatGPT/.test(auth.stdout+auth.stderr))throw Error('Pinned Codex with ChatGPT entitlement required');
 const runtime=mkdtempSync(join(directory,'session-'));prepareJsonDirectory(runtime,prompt,schema);symlinkSync(join(homedir(),'.codex/auth.json'),join(runtime,'auth.json'));Object.assign(env,{CODEX_HOME:runtime});
 const args=['app-server','--listen','stdio://','--strict-config','--enable','skip_host_skill_discovery',...['shell_tool','image_generation','apps','plugins','hooks','view_image','browser_use','computer_use','code_mode_host','multi_agent','multi_agent_v2','memory_tool','workspace_dependencies','skill_search','goals'].flatMap(f=>['--disable',f]),'-c','model_catalog_json='+JSON.stringify(join(runtime,'catalog.json')),'-c','model_instructions_file='+JSON.stringify(join(runtime,'prompt.md')),'-c','web_search="disabled"','-c','tools.update_plan.enabled=false','-c','tools.experimental_request_user_input.enabled=false','-c','project_doc_max_bytes=0','-c','memories.use_memories=false','-c','memories.generate_memories=false'];
 const begin=performance.now();ownership.launchPending?.();const child=spawn(launcher,args,{cwd:join(runtime,'neutral'),env,detached:true,stdio:['pipe','pipe','pipe']});
 let records:ProcessRecord[]=[],thread:string|null=null,turn:string|null=null,summary='',usage:CodexJsonResult['usage']=null,buffer='',bytes=0,next=0,closing=false,exited=false;
 const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
 let finish!:(v:void)=>void,fail!:(e:Error)=>void;const completed=new Promise<void>((r,j)=>{finish=r;fail=j;});completed.catch(()=>{});
 const send=(value:unknown)=>child.stdin.write(JSON.stringify(value)+'\n');
 const rpc=(method:string,params:unknown)=>new Promise<any>((r,j)=>{const id=++next;pending.set(id,{resolve:r,reject:j});send({id,method,params});});
 const stop=(e:Error)=>{fail(e);for(const p of pending.values())p.reject(e);pending.clear();};
 const log=(value:unknown)=>{const line=JSON.stringify(value)+'\n';writeFileSync(join(directory,'session.jsonl'),line,{flag:'a',mode:0o600});};
 child.stdout.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>8*1024*1024){stop(Error('Writer protocol output exceeded limit'));return;}buffer+=chunk.toString();let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const m=JSON.parse(line);if(m.id!==undefined&& !m.method){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error('Writer protocol request rejected: '+m.error.code)):p.resolve(m.result);continue;}
 if(m.id!==undefined){const p=m.params;let response:any={contentItems:[{type:'inputText',text:'Denied: only BASE read access is available.'}],success:false};
 if(m.method==='item/tool/call'&&p.threadId===thread&&(turn===null||p.turnId===turn)&&p.tool==='read_base'){try{response={contentItems:[{type:'inputText',text:read(p.arguments?.path)}],success:true};}catch{}}else{send({id:m.id,error:{code:-32601,message:'Unsupported writer capability'}});stop(Error('Unsupported writer capability'));continue;}
 log({method:m.method,path:p.arguments?.path,success:response.success,threadId:p.threadId,turnId:p.turnId});send({id:m.id,result:response});continue;}
 if(m.method==='item/completed'&&m.params?.item?.type==='agentMessage')summary=m.params.item.text;
 if(m.method==='thread/tokenUsage/updated'){const u=m.params.tokenUsage?.total;if(u&&['inputTokens','cachedInputTokens','outputTokens','totalTokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0))usage=u;}
 if(m.method==='turn/completed'){m.params?.turn?.status==='completed'?finish():stop(Error('Writer turn did not complete'));}
 }catch(e){stop(e as Error);}}});
 child.stderr.on('data',()=>{});child.stdin.on('error',()=>stop(Error('Writer transport lost')));child.on('error',()=>stop(Error('Writer failed to start')));child.on('exit',()=>{exited=true;if(!closing)stop(Error('Writer transport exited'));});
 const abort=()=>stop(Error('Writer interrupted'));signal.addEventListener('abort',abort,{once:true});const deadline=setTimeout(()=>stop(Error('Writer deadline exceeded')),180000);let monitor:ReturnType<typeof setInterval>|undefined;
 try{await new Promise<void>((r,j)=>{child.once('spawn',r);child.once('error',j);});let stable=false;for(let i=0;i<20&&!stable;i++){const first=processIdentity(child.pid!);await new Promise(r=>setTimeout(r,50));const second=processIdentity(child.pid!);stable=!!first&&!!second&&sameProcess(first,second)&&!second.exitedAt;}if(!stable)throw Error('Writer process ownership unknown');
 const sample=()=>{const fresh=ownedProcessSnapshot(child.pid!);if(!fresh.some(p=>p.pid===child.pid))throw Error('Writer root identity unavailable');const all=new Map(records.map(p=>[p.pid+':'+p.birth,p]));for(const p of fresh)all.set(p.pid+':'+p.birth,p);records=[...all.values()];if(records.length>256)throw Error('Writer process inventory exceeded limit');ownership.processes(records);};sample();monitor=setInterval(()=>{try{sample();}catch(e){stop(e as Error);}},200);
 if(signal.aborted)throw Error('Writer interrupted');await rpc('initialize',{clientInfo:{name:'cc_test_writer',version:'2'},capabilities:{experimentalApi:true}});send({method:'initialized'});
 const started=await rpc('thread/start',{cwd:join(runtime,'neutral'),sandbox:'read-only',approvalPolicy:'on-request',approvalsReviewer:'user',ephemeral:true,model:'gpt-6.1-sol',developerInstructions:prompt,config:{model_reasoning_effort:'low'},dynamicTools:[{type:'function',name:'read_base',description:'Read an entire relative file from the immutable BASE export. Empty path lists all exported paths. No other files are available.',inputSchema:{type:'object',additionalProperties:false,properties:{path:{type:'string'}},required:['path']}}]});thread=started.thread.id;
 if(started.thread.cliVersion!=='0.160.0'||started.sandbox?.type!=='readOnly')throw Error('Read-only writer sandbox not confirmed');
 const running=await rpc('turn/start',{threadId:thread,input:[{type:'text',text:JSON.stringify(input),text_elements:[]}],outputSchema:schema,effort:'low'});turn=running.turn.id;await completed;
 const output=JSON.parse(summary);writeFileSync(join(directory,'output.json'),JSON.stringify(output),{mode:0o400,flag:'wx'});return {output,usage,sessionId:thread,elapsedMs:performance.now()-begin,toolVersion:'codex-cli 0.160.0'};
 }finally{closing=true;clearTimeout(deadline);clearInterval(monitor);signal.removeEventListener('abort',abort);for(const p of pending.values())p.reject(Error('Writer shutting down'));pending.clear();const cleanup=records.length?await reconcileOwnedProcesses(records):{verified:exited,ambiguous:!exited,remaining:[],terminalCount:0,reason:exited?null:'Writer launch has no certified identity'};ownership.cleanup?.(cleanup);writeFileSync(join(directory,'unvalidated-output.json'),JSON.stringify({summary}),{mode:0o400});writeFileSync(join(directory,'cost.json'),JSON.stringify({usage,sessionId:thread,started:records.length>0}),{mode:0o400});rmSync(runtime,{recursive:true,force:true});if(!cleanup.verified||cleanup.ambiguous||cleanup.remaining.length)throw Error('Writer cleanup not certified');}
}
