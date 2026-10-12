import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir,homedir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {openDatabase} from '../apps/server/database.ts';import {createTicket,getTicket,listTicketEvents} from '../apps/server/ticket-store.ts';import {createTicketLoop} from '../apps/server/ticket-loop.ts';import {watchmanActions} from '../apps/server/watchman.ts';import {prepareBuilderRuntime,runBuilderSupervisorFixture} from '../apps/server/build-runtime.ts';import {reconcileOwnedProcesses} from '../apps/server/build-processes.ts';import type {BuildInput} from '../packages/shared/build.ts';
test('planted probing provider runs actual denied native commands; Watchman interrupts at eleven and cleanup is certified',async()=>{const root=mkdtempSync(join(tmpdir(),'cc-native-watchman-')),repo=join(root,'repo'),data=join(root,'data'),provider=join(root,'provider.py');mkdirSync(repo);mkdirSync(data);writeFileSync(join(repo,'value'),'BASE');writeFileSync(join(data,'synthetic-denied'),'harmless');const git=(...a:string[])=>execFileSync('git',['-C',repo,...a],{encoding:'utf8'}).trim();git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-qm','BASE');const db=openDatabase(data,()=>{});let checked=0;
try{const t=createTicket(db.connection,{title:'Planted native probing fixture',requestText:'Synthetic denial regression',repoPath:repo,baseCommit:git('rev-parse','HEAD')});const loop=createTicketLoop(db.connection,data,{driver:{version:async()=> 'codex-cli 0.160.0',reconcile:reconcileOwnedProcesses,run:async(context,input,signal,callbacks)=>{const prepared=prepareBuilderRuntime(context),config=prepared.args.flatMap((x,i)=>x==='-c'&&/^(permissions\.|default_permissions)/.test(prepared.args[i+1]??'')?['-c',prepared.args[i+1]!]:[]);const command=[join(homedir(),'Projects/ai-lab/bin/codex'),'sandbox',...config,'-P',prepared.permissionProfile,'-C',context.workspace,'--','/usr/local/bin/python3','-c',"open("+JSON.stringify(join(data,'synthetic-denied'))+").close()"];
writeFileSync(provider,`import json,sys,subprocess,threading,time
stopped=threading.Event()
def send(v):print(json.dumps(v),flush=True)
def commands():
 time.sleep(.2)
 for n in range(12):
  if stopped.is_set():return
  item={'id':'probe-'+str(n),'type':'commandExecution','command':'python synthetic-denied-read '+str(n),'cwd':${JSON.stringify(context.workspace)},'status':'inProgress'}
  send({'method':'item/started','params':{'threadId':'thread','turnId':'turn','item':item}})
  p=subprocess.run(${JSON.stringify(command)},capture_output=True,text=True)
  open(${JSON.stringify(join(root,'native-output.txt'))},'w').write(p.stdout+p.stderr)
  item.update(status='completed',exitCode=p.returncode,aggregatedOutput=p.stdout+p.stderr)
  send({'method':'item/completed','params':{'threadId':'thread','turnId':'turn','item':item}})
  time.sleep(.2)
for line in sys.stdin:
 r=json.loads(line);m=r.get('method');i=r.get('id')
 if i is None:continue
 if m=='initialize':v={'userAgent':'fixture/0.160.0'}
 elif m=='thread/start':v={'thread':{'id':'thread','cliVersion':'0.160.0'},'sandbox':{'type':'workspaceWrite','networkAccess':False}}
 elif m=='turn/start':v={'turn':{'id':'turn'}};send({'id':i,'result':v});threading.Thread(target=commands,daemon=True).start();continue
 elif m=='turn/interrupt':stopped.set();v={};send({'method':'turn/completed','params':{'threadId':'thread','turn':{'id':'turn','status':'interrupted'}}})
 elif m=='thread/backgroundTerminals/list':v={'data':[],'nextCursor':None}
 else:v={}
 send({'id':i,'result':v})
`);return runBuilderSupervisorFixture(context,input as unknown as BuildInput,signal,callbacks,{launcher:'/usr/local/bin/python3',args:[provider],env:prepared.env,timeoutMs:25000});}},check:async()=>{checked++;return {verdict:'NOT CHECKED',gaps:['diagnostic'],failures:[]};}});await loop.run(t.id,new AbortController().signal);const ticket=getTicket(db.connection,t.id)!,actions=watchmanActions(db.connection,t.id),events=listTicketEvents(db.connection,t.id);assert.equal(ticket.status,'needs_you');assert.equal(actions.length,11);assert.ok(actions.every(a=>a.exitCode!==0));assert.equal(ticket.candidateCommits.length,0);assert.equal(checked,0);assert.equal(events.filter(e=>e.kind==='agent_stopped').at(-1)?.data.cleanupVerified,true);mkdirSync('.work/watchman',{recursive:true});writeFileSync('.work/watchman/native-denial-proof.json',JSON.stringify({kind:'deterministic planted provider, actual native Codex sandbox commands',ticket,actions,events},null,2));}finally{db.close();}});
