import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {processIdentity,ownedProcessSnapshot,reconcileOwnedProcesses} from '../apps/server/build-processes.ts';
test('kernel ownership uses birth, executable, group and session',()=>{const own=processIdentity(process.pid);assert.ok(own);assert.match(own.birth,/^(darwin:\d+:\d+|linux:)/);assert.equal(own.pid,process.pid);assert.ok(own.executable);assert.ok(own.sid);});
test('unknown birth never signals an unrelated live process',async()=>{const own=processIdentity(process.pid)!;const result=await reconcileOwnedProcesses([{...own,birth:'wrong'}]);assert.equal(result.verified,false);assert.equal(result.ambiguous,true);assert.ok(processIdentity(process.pid));});
test('composite OS reconciliation stops owned counter and leaves stable sentinel',async()=>{const dir=mkdtempSync(join(tmpdir(),'cc-owned-counter-')),sentinel=join(dir,'ticks');const child=spawn(process.execPath,['-e',`const fs=require('fs');let i=0;setInterval(()=>fs.writeFileSync(${JSON.stringify(sentinel)},String(++i)),20)`],{detached:true,stdio:'ignore'});try{
 await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});for(let i=0;i<30&&!existsSync(sentinel);i++)await new Promise(r=>setTimeout(r,20));const first=readFileSync(sentinel,'utf8');await new Promise(r=>setTimeout(r,60));assert.notEqual(readFileSync(sentinel,'utf8'),first,'No interrupt acknowledgement may be treated as process death');const records=ownedProcessSnapshot(child.pid!);assert.ok(records.some(r=>r.pid===child.pid));const cleanup=await reconcileOwnedProcesses(records);assert.equal(cleanup.verified,true);const frozen=readFileSync(sentinel,'utf8');await new Promise(r=>setTimeout(r,80));assert.equal(readFileSync(sentinel,'utf8'),frozen);assert.equal(processIdentity(child.pid!),null);
 }finally{try{child.kill('SIGKILL');}catch{}rmSync(dir,{recursive:true,force:true});}});
test('a late same-group descendant prevents falsely verified cleanup',async()=>{const dir=mkdtempSync(join(tmpdir(),'cc-late-child-')),ready=join(dir,'ready');const child=spawn(process.execPath,['-e',`const fs=require('fs');fs.writeFileSync(${JSON.stringify(ready)},'ready');process.on('SIGTERM',()=>{require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});setTimeout(()=>process.exit(0),30)});setInterval(()=>{},1000)`],{detached:true,stdio:'ignore'});try{await new Promise<void>(resolve=>child.once('spawn',resolve));for(let i=0;i<30&&!existsSync(ready);i++)await new Promise(r=>setTimeout(r,20));const cleanup=await reconcileOwnedProcesses(ownedProcessSnapshot(child.pid!));assert.equal(cleanup.verified,false);assert.equal(cleanup.ambiguous,true);assert.equal(cleanup.remaining.length,0,'Unknown survivor must not be promoted into trusted ownership for later retry');assert.ok(ownedProcessSnapshot(child.pid!).length,'late descendant is visible instead of being claimed gone');}finally{// Only this disposable test knows that its exact created session cannot be reused here.
 await reconcileOwnedProcesses(ownedProcessSnapshot(child.pid!));try{child.kill('SIGKILL');}catch{}rmSync(dir,{recursive:true,force:true});}});

test('transient exit identity failure clears only after two proved absences and empty group snapshots',async()=>{
 const {reconcileOwnedProcessesFixture}=await import('../apps/server/build-processes.ts');const record={pid:111,ppid:1,pgid:111,sid:111,birth:'fixture-birth',executable:'fixture',observedAt:'now',exitedAt:null};let queries=0,signals=0;
 const result=await reconcileOwnedProcessesFixture([record],{identity:()=>{if(++queries===1)throw Error('exit race');return null;},snapshot:()=>[],signal:()=>{signals++;},pause:async()=>{}});assert.equal(result.verified,true);assert.equal(result.ambiguous,false);assert.equal(signals,0);
});
test('unknown living identity remains uncertified even when group inventory is empty',async()=>{
 const {reconcileOwnedProcessesFixture}=await import('../apps/server/build-processes.ts');const record={pid:111,ppid:1,pgid:111,sid:111,birth:'fixture-birth',executable:'fixture',observedAt:'now',exitedAt:null};let signals=0;
 const result=await reconcileOwnedProcessesFixture([record],{identity:()=>{throw Error('unknown live identity');},snapshot:()=>[],signal:()=>{signals++;},pause:async()=>{}});assert.equal(result.verified,false);assert.equal(signals,0);assert.match(result.reason!,/pid 111/);
});
test('observed PID reuse stays permanently uncertified after the reused process disappears',async()=>{
 const {reconcileOwnedProcessesFixture}=await import('../apps/server/build-processes.ts');const record={pid:111,ppid:1,pgid:111,sid:111,birth:'fixture-birth',executable:'fixture',observedAt:'now',exitedAt:null};let queries=0,signals=0;
 const result=await reconcileOwnedProcessesFixture([record],{identity:()=>++queries===1?{...record,birth:'reused-birth'}:null,snapshot:()=>[],signal:()=>{signals++;},pause:async()=>{}});assert.equal(result.verified,false);assert.equal(signals,0);assert.match(result.reason!,/mismatch/);
});

test('kernel tree refuses to omit an owned live PID with missing identity but accepts proved exit',()=>{
 const helper=new URL('../scripts/build-process-info.py',import.meta.url).pathname;
 const code=`import importlib.util,subprocess,os
spec=importlib.util.spec_from_file_location('ownership_helper',${JSON.stringify(helper)})
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.subprocess.check_output=lambda *args,**kwargs:'111 1 111\\n222 111 111\\n'
m.inspect=lambda pid:None
m.os.kill=lambda pid,signal:None
try:
 m.tree(111)
 raise AssertionError('A live owned PID was omitted')
except RuntimeError as e:
 assert 'live but kernel identity unavailable' in str(e)
def absent(pid,signal): raise ProcessLookupError()
m.os.kill=absent
assert m.tree(111)==[]
`;execFileSync(process.platform==='darwin'?'/usr/local/bin/python3':'/usr/bin/python3',['-c',code],{timeout:3000});
});

if(process.platform==='darwin')test('Darwin unreaped death is certified by the same kernel microsecond birth, never PID-only',()=>{
 const helper=new URL('../scripts/build-process-info.py',import.meta.url).pathname;
 const code=`import importlib.util,os,time
spec=importlib.util.spec_from_file_location('ownership_helper',${JSON.stringify(helper)})
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r,w=os.pipe();pid=os.fork()
if pid==0:
 os.close(w);os.read(r,1);os._exit(0)
os.close(r)
try:
 before=m.inspect(pid);assert before and not before['zombie']
 os.write(w,b'x');os.close(w)
 for i in range(100):
  after=m.inspect(pid)
  if after and after['zombie']:break
  time.sleep(.01)
 assert after and after['zombie']
 assert before['pid']==after['pid'] and before['birth_id']==after['birth_id']
 assert after['executable']=='<zombie>'
 os.kill(pid,0) # Proves that PID existence alone incorrectly implies alive.
 assert m.record(pid,time.monotonic())['zombie']
finally:
 os.waitpid(pid,0)
`;execFileSync('/usr/local/bin/python3',['-c',code],{timeout:3000});
});
