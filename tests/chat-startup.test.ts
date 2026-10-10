import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createApplication} from '../apps/server/application.ts';
import {runBuilderSupervisorFixture} from '../apps/server/build-runtime.ts';
import {processIdentity} from '../apps/server/build-processes.ts';
import type {createChatCodex} from '../apps/server/chat-codex.ts';
import type {BuildInput,ProcessRecord} from '../packages/shared/build.ts';
test('chat-server Start survives a short unreaped child while recording real PID and birth before the build turn',async()=>{
 mkdirSync(resolve('.work/foreman-fix'),{recursive:true});const root=mkdtempSync(resolve('.work/foreman-fix/start-')),repo=join(root,'repo'),data=join(root,'data'),script=join(root,'provider.py');mkdirSync(repo);
 const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();git('init','-q');writeFileSync(join(repo,'value.txt'),'BASE');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','BASE');
 writeFileSync(script,`import os,time,threading,json,sys
# Force the real Darwin gap: kernel keeps an exited child alive until waitpid,
# but libproc cannot provide its identity and kill(pid,0) still succeeds.
def reap(pid):
 time.sleep(.7)
 os.waitpid(pid,0)
def send(value):
 print(json.dumps(value),flush=True)
for line in sys.stdin:
 request=json.loads(line);method=request.get('method');rid=request.get('id')
 if rid is None:continue
 if method=='initialize':
  pid=os.fork()
  if pid==0:os._exit(0)
  threading.Thread(target=reap,args=(pid,),daemon=True).start()
  time.sleep(.9)
  send({'id':rid,'result':{'userAgent':'fixture/0.160.0'}})
 elif method=='thread/start':send({'id':rid,'result':{'thread':{'id':'thread','cliVersion':'0.160.0'},'sandbox':{'type':'workspaceWrite','networkAccess':False}}})
 elif method=='turn/start':
  open('value.txt','w').write('Candidate')
  send({'id':rid,'result':{'turn':{'id':'turn'}}})
  send({'method':'turn/completed','params':{'threadId':'thread','turn':{'id':'turn','status':'completed'}}})
 elif method=='thread/backgroundTerminals/list':send({'id':rid,'result':{'data':[],'nextCursor':None}})
 else:send({'id':rid,'result':{}})
`);
 let checked=0;const records:ProcessRecord[]=[];const runtime:ReturnType<typeof createChatCodex>={draft:async()=>({title:'Fixture',repoPath:repo,requestText:'Update value.',doneMeans:'Value changes.',question:null,usage:null,threadId:'draft',turnId:'draft-turn'}),fuel:async()=>({unknown:true,windows:[]}),close:async()=>{}};
 const app=createApplication({port:0,dataDir:data,webRoot:join(root,'web'),development:false,projectRoots:[root]},()=>{},undefined,undefined,undefined,undefined,undefined,{chatRuntime:runtime,ticketDependencies:{driver:{version:async()=> 'codex-cli 0.160.0',reconcile:async()=>({verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null}),run:(context,input,signal,callbacks)=>runBuilderSupervisorFixture(context,input as unknown as BuildInput,signal,{...callbacks,processes:(r)=>{records.push(...r);callbacks.processes(r);}}, {launcher:'/usr/local/bin/python3',args:[script],env:{PATH:process.env.PATH,HOME:context.workspace},timeoutMs:5000})},check:async()=>{checked++;return {verdict:'VERIFIED',gaps:[],failures:[]};}}});
 try{await app.start();const address=app.server.address();assert.ok(address&&typeof address!=='string');const base='http://127.0.0.1:'+address.port,key=readFileSync(join(data,'ticket-operator.key'),'utf8');const call=async(path:string,body:unknown)=>{const response=await fetch(base+path,{method:'POST',headers:{'X-CC-Operator':key,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json();};
 const view=await call('/api/chat/messages',{text:'Update value in the fixture repo.'}),draft=view.drafts[0];await call('/api/chat/drafts/'+draft.id+'/start',{version:draft.version});await app.tickets.idle();const t=app.tickets.list().tickets[0]!;const detail=app.tickets.show(t.id);assert.equal(t.status,'ready_for_review',JSON.stringify(detail.events.filter(e=>e.kind==='agent_stopped'||e.kind==='cleanup')));assert.equal(checked,1);assert.ok(records.length>0);assert.ok(records.every(p=>p.pid>0&&p.birth.startsWith(process.platform==='darwin'?'darwin:':'linux:')));assert.ok(detail.events.some(e=>e.kind==='agent_started'));assert.equal(readFileSync(join(repo,'value.txt'),'utf8'),'BASE');for(const p of records)assert.equal(processIdentity(p.pid),null);
 }finally{await app.close();rmSync(root,{recursive:true,force:true});}
});
