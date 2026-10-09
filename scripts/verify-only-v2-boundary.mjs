import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const cc=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const {oracleSandbox}=await import(pathToFileURL(cc+'/apps/server/oracle-execution.ts'));
const {processIdentity,ownedProcessSnapshot,reconcileOwnedProcesses}=await import(pathToFileURL(cc+'/apps/server/build-processes.ts'));
const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true,mode:0o700});
const save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');const pause=ms=>new Promise(r=>setTimeout(r,ms));
const extension='(allow signal (require-all (target same-sandbox) (target children)))';
let harnessSignals=0;process.on('SIGUSR2',()=>harnessSignals++);
const recorderDir=path.join(dir,'boundary-recorder'),judgeDir=path.join(dir,'boundary-judge');fs.mkdirSync(recorderDir);fs.mkdirSync(judgeDir);
const judgeOracle=path.join(judgeDir,'oracle.py');fs.writeFileSync(judgeOracle,`import unittest,signal,time,os\nfrom pathlib import Path\nclass Boundary(unittest.TestCase):\n def test_wait(self):\n  signal.signal(signal.SIGUSR2,lambda *args:Path(${JSON.stringify(path.join(judgeDir,'signal-delivered'))}).write_text('delivered'))\n  Path(${JSON.stringify(path.join(judgeDir,'ready'))}).write_text(str(os.getpid()))\n  until=time.monotonic()+30\n  while not Path(${JSON.stringify(path.join(judgeDir,'release'))}).exists() and time.monotonic()<until:time.sleep(0.02)\n  self.assertTrue(Path(${JSON.stringify(path.join(judgeDir,'release'))}).exists())\n`);
const obs=path.join(judgeDir,'observations.json');save(obs,{observations:[]});const judge=cc+'/scripts/protected-verification/python-judge.py';
const judgeProfile=oracleSandbox([judge,judgeOracle,obs],judgeDir,true);
const env=d=>({PATH:'/usr/local/bin:/usr/bin:/bin',HOME:d,TMPDIR:d,LANG:'C',TZ:'UTC',PYTHONDONTWRITEBYTECODE:'1'});
const judgeProcess=spawn('/usr/bin/sandbox-exec',['-p',judgeProfile,'/usr/local/bin/python3','-I','-B',judge,obs,judgeOracle,'oracle_judge.Boundary.test_wait'],{cwd:judgeDir,env:env(judgeDir),detached:true,stdio:['pipe','pipe','pipe']});let judgeStdout='',judgeStderr='';judgeProcess.stdout.on('data',b=>judgeStdout+=b);judgeProcess.stderr.on('data',b=>judgeStderr+=b);judgeProcess.stdin.end(' ');
const judgedone=new Promise(r=>judgeProcess.once('close',r));
const candidate=path.join(recorderDir,'candidate.py');fs.writeFileSync(candidate,`import sys,os,json,signal,subprocess\ntargets=json.loads(sys.argv[1]);out={'attempts':[]}\np=subprocess.Popen(['/usr/local/bin/python3','-I','-B','-c','import time;print("READY",flush=True);time.sleep(30)'],stdout=subprocess.PIPE,text=True)\nout['childReady']=p.stdout.readline().strip()=='READY'\nassert out['childReady']\nout['childPid']=p.pid\nos.kill(p.pid,signal.SIGTERM);out['childReturnCode']=p.wait(timeout=3)\ntry:os.waitpid(p.pid,os.WNOHANG);out['reaped']=False\nexcept ChildProcessError:out['reaped']=True\nfor role,pid in targets.items():\n try:os.kill(pid,signal.SIGUSR2);out['attempts'].append({'role':role,'pid':pid,'allowed':True})\n except OSError as e:out['attempts'].append({'role':role,'pid':pid,'allowed':False,'errno':e.errno})\nprint(json.dumps(out))\n`);
const recorder=path.join(recorderDir,'recorder.py');fs.writeFileSync(recorder,`import sys,os,signal,subprocess,json\nfrom pathlib import Path\nsys.stdin.read()\nsignal.signal(signal.SIGUSR2,lambda *args:Path(${JSON.stringify(path.join(recorderDir,'signal-delivered'))}).write_text('delivered'))\nrecord=json.loads(sys.argv[1]);record['recorder']=os.getpid()\nr=subprocess.run(['/usr/local/bin/python3','-I','-B',${JSON.stringify(candidate)},json.dumps(record)],capture_output=True,text=True,timeout=10)\nprint(json.dumps({'runnerExit':r.returncode,'stderr':r.stderr,'observation':json.loads(r.stdout) if r.stdout else None}))\n`);
const profile=oracleSandbox([recorder,candidate],recorderDir,true,false,true);fs.writeFileSync(path.join(dir,'candidate-profile.sb'),profile);fs.writeFileSync(path.join(dir,'judge-profile.sb'),judgeProfile);
let records=[],recorderProcess=null,timer=null;const harnessBefore=processIdentity(process.pid);
try{
 for(let n=0;n<200&&!fs.existsSync(path.join(judgeDir,'ready'));n++)await pause(50);
 if(!fs.existsSync(path.join(judgeDir,'ready')))throw Error('Actual native judge did not reach barrier: '+judgeStderr);
 const judgeBefore=processIdentity(judgeProcess.pid);records=ownedProcessSnapshot(judgeProcess.pid).filter(x=>x.identified!==false);
 recorderProcess=spawn('/usr/bin/sandbox-exec',['-p',profile,'/usr/local/bin/python3','-I','-B',recorder,JSON.stringify({harness:process.pid,judge:judgeProcess.pid})],{cwd:recorderDir,env:env(recorderDir),detached:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';recorderProcess.stdout.on('data',b=>stdout+=b);recorderProcess.stderr.on('data',b=>stderr+=b);const done=new Promise(r=>recorderProcess.once('close',r));await pause(150);const recorderBefore=processIdentity(recorderProcess.pid);records.push(...ownedProcessSnapshot(recorderProcess.pid).filter(x=>x.identified!==false));
 timer=setInterval(()=>{try{records.push(...ownedProcessSnapshot(recorderProcess.pid).filter(x=>x.identified!==false));}catch{}},100);recorderProcess.stdin.end(' ');
 const code=await Promise.race([done,pause(12000).then(()=>null)]);clearInterval(timer);await pause(200);
 if(code!==0)throw Error('Signal probe failed: '+stderr+' '+stdout);
 const result=JSON.parse(stdout);const observation=result.observation;
 const forbiddenDelivered=harnessSignals!==0||fs.existsSync(path.join(judgeDir,'signal-delivered'))||fs.existsSync(path.join(recorderDir,'signal-delivered'));
 const passed=result.runnerExit===0&&observation.childReady&&observation.childReturnCode===-15&&observation.reaped&&observation.attempts.length===3&&observation.attempts.every(a=>!a.allowed&&[1,13].includes(a.errno))&&!forbiddenDelivered&&!!processIdentity(judgeProcess.pid)&&!!processIdentity(process.pid);
 fs.writeFileSync(path.join(judgeDir,'release'),'release');const judgeExit=await judgedone;
 const proof={passed,extension,scope:'v2 observer owned-child signals; judge retains deny signal',observation,harnessSignals,forbiddenDelivered,judgeExit,judgeNativeReport:JSON.parse(judgeStdout),identities:{harness:harnessBefore,judge:judgeBefore,recorder:recorderBefore},profileSHA256:createHash('sha256').update(profile).digest('hex')};
 save(path.join(dir,'BOUNDARY.json'),proof);console.log(JSON.stringify(proof));if(!passed||judgeExit!==0)throw Error('Signal boundary not proven');
}finally{
 clearInterval(timer);fs.writeFileSync(path.join(judgeDir,'release'),'release');const unique=new Map(records.map(r=>[r.pid+':'+r.birth,r]));const cleanup=await reconcileOwnedProcesses([...unique.values()]);save(path.join(dir,'boundary-cleanup.json'),cleanup);if(!cleanup.verified||cleanup.ambiguous)throw Error('Boundary process cleanup uncertified');
}
