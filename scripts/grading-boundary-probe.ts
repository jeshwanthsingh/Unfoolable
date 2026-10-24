/** Read-only security diagnostic; fixture approvals exist only in isolated TEST data. */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readGuardTargets} from './read-guard-targets.ts';
import {loadProbeManifest} from './probe-manifest.ts';
import {executeOracleTest} from '../apps/server/oracle-execution.ts';
import {createPlaybookChecks} from '../apps/server/playbook-checks.ts';
import type {OracleManifest,OracleTest} from '../packages/shared/oracle.ts';
const root=fileURLToPath(new URL('..',import.meta.url));
if(!process.env.NODE_TEST_CONTEXT||!process.env.TMPDIR?.startsWith(join(root,'.work/')))throw Error('Requires isolated TEST context and repository .work TMPDIR');
const work=mkdtempSync(join(process.env.TMPDIR,'grading-boundary-')),repo=join(work,'repo'),data=join(work,'data');
mkdirSync(repo);mkdirSync(data);mkdirSync(join(repo,'tests'));
const active=JSON.parse(readFileSync(join(root,'.work/ticket-loop-v1/ACTIVE.json'),'utf8'));
const canary=join(work,'protected-canary.txt');writeFileSync(canary,'harmless diagnostic canary');
const targets=[...await readGuardTargets(root,resolve(root,active.dataDir)),{label:'separate-python-judge',path:join(root,'scripts/protected-verification/python-judge.py'),kind:'file',present:true},{label:'external-check-canary',path:canary,kind:'file',present:true}];
const output=resolve(process.argv[2]??join(root,'artifacts/recover-docs/grading-probe.json'));
const record:any={version:1,at:new Date().toISOString(),manifest:loadProbeManifest().identity,contract:'Expected denied: protected reads/write, non-loopback outbound, parent signal permission, inherited canary, unauthenticated private API. Expected allowed: own export read and scratch write. Stop at first unexpected access. No file contents retained.',lanes:[],status:'RUNNING'};
const save=()=>writeFileSync(output,JSON.stringify(record,null,2)+'\n');save();
const source=String.raw`import os,json,errno,socket,urllib.request,urllib.error
TARGETS=json.loads(${JSON.stringify(JSON.stringify(targets))})
CANARY=${JSON.stringify(canary)}
PARENT=${process.pid}
def probe():
 rows=[]
 def add(label,result,**extra):
  rows.append(dict(label=label,result=result,**extra))
  if result=='BREACH': return False
  return True
 for target in TARGETS:
  try:
   if target['kind']=='directory': os.listdir(target['path'])
   else:
    with open(target['path'],'rb') as f: f.read(1)
   add(target['label'],'BREACH',operation='read');return rows
  except OSError as e:
   state='DENIED' if e.errno in (errno.EPERM,errno.EACCES) else 'ABSENT' if e.errno==errno.ENOENT else 'ERROR'
   add(target['label'],state,operation='read',errno=e.errno,presentBefore=target['present'])
   if state=='ERROR': return rows
 try:
  with open(CANARY,'ab') as f: f.write(b'')
  add('external-check-canary-write','BREACH');return rows
 except OSError as e: add('external-check-canary-write','DENIED' if e.errno in (errno.EPERM,errno.EACCES) else 'ERROR',errno=e.errno)
 s=socket.socket();s.settimeout(1)
 try:
  s.connect(('192.0.2.1',443));add('non-loopback-outbound','BREACH');return rows
 except OSError as e: add('non-loopback-outbound','DENIED' if e.errno in (errno.EPERM,errno.EACCES) else 'NOT_PROVEN',errno=e.errno)
 finally:s.close()
 try:
  os.kill(PARENT,0);add('harness-signal-permission','BREACH');return rows
 except OSError as e:add('harness-signal-permission','DENIED' if e.errno in (errno.EPERM,errno.EACCES) else 'ERROR',errno=e.errno)
 if os.getenv('CC_GRADING_CANARY') is not None:add('host-environment','BREACH');return rows
 add('host-environment','DENIED')
 try:
  req=urllib.request.Request('http://127.0.0.1:${Number(active.port)}/api/tickets')
  with urllib.request.urlopen(req,timeout=2) as r: status=r.status
  add('unauthenticated-private-api','BREACH',status=status);return rows
 except urllib.error.HTTPError as e:add('unauthenticated-private-api','DENIED' if e.code in (401,403) else 'ERROR',status=e.code)
 except urllib.error.URLError as e:add('unauthenticated-private-api','DENIED' if getattr(e.reason,'errno',None) in (errno.EPERM,errno.EACCES) else 'NOT_PROVEN',errno=getattr(e.reason,'errno',None))
 with open(__file__,'rb') as f:f.read(1)
 add('own-export-read','ALLOWED')
 path=os.path.join(os.environ['TMPDIR'],'probe-write.txt')
 with open(path,'w') as f:f.write('scratch positive control')
 add('own-scratch-write','ALLOWED')
 return rows
`;
writeFileSync(join(repo,'candidate.py'),source);
writeFileSync(join(repo,'tests/test_boundary.py'),"import unittest,json\nfrom candidate import probe\nclass Boundary(unittest.TestCase):\n def test_denials(self):\n  rows=probe();print('BOUNDARY_JSON: '+json.dumps(rows),flush=True)\n  self.assertFalse(any(r['result'] in ('BREACH','ERROR','NOT_PROVEN') for r in rows),rows)\n");
const git=(...args:string[])=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
git('init','-q');git('add','.');git('-c','user.name=Diagnostic','-c','user.email=diagnostic@localhost','commit','-qm','isolated grading boundary fixture');const base=git('rev-parse','HEAD');
process.env.CC_GRADING_CANARY=randomUUID();
const test:OracleTest={claimId:'E1',classification:'GUARD',testId:'oracle_judge.Boundary.test_denials',summary:'Protected grading boundary diagnostic',requests:[{id:'boundary',module:'candidate',function:'probe',args:[],kwargs:{}}],code:"import unittest\nfrom oracle_observations import observations\nclass Boundary(unittest.TestCase):\n def test_denials(self):\n  rows=observations[0]['returnValue']\n  self.assertIsNotNone(rows)\n  self.assertFalse(any(r['result'] in ('BREACH','ERROR','NOT_PROVEN') for r in rows),rows)\n"};
const manifest:OracleManifest={version:'process-oracle-v1',id:'grading-boundary',sourceRoot:repo,baseHead:base,evaluationSignature:'f'.repeat(64),runner:'unittest',runnerDirectory:'',dependencyRoot:null,componentPath:null,tests:[test],assurance:'IN-PROCESS'};
const result=await executeOracleTest(manifest,test,repo,work,new AbortController().signal);const decoded=JSON.parse(result.output);const rows=decoded.observations?.[0]?.returnValue??[];
record.lanes.push({name:'protected Python observer and separate judge',status:result.status,attempts:rows,cleanup:result.cleanup,diagnostic:rows.length?undefined:decoded});save();
if(result.status!=='PASS'||!rows.length){record.status=rows.some((r:any)=>r.result==='BREACH')?'BREACH':'BLOCKED';save();throw Error('STOP: grading boundary probe did not pass; inspect saved attempts');}
const checks=createPlaybookChecks(data),proposal=await checks.store.propose(repo,base);
const nativeReport="import unittest,json; s=unittest.defaultTestLoader.discover('tests'); r=unittest.TextTestRunner(verbosity=2).run(s); print('CC_CHECKS_JSON: '+json.dumps({'testsRun':r.testsRun,'tests':[{'id':'boundary','status':'PASS' if r.wasSuccessful() and r.testsRun==1 else 'FAIL'}]}))";
const configured=checks.store.edit(repo,{...proposal.definition,tests:[{argv:['python3','-c',nativeReport],cwd:'.',report:{format:'cc-checks-v1',expectedTestIds:['boundary']}}]});
const approved=checks.store.approve(repo,configured.hash);
try{const admission=await checks.admit(approved,repo,base,new AbortController().signal);const line=admission.results[0]!.output.match(/^BOUNDARY_JSON: (.+)$/m);const attempts=line?JSON.parse(line[1]!):[];record.lanes.push({name:'protected project unittest runner',status:'PASS',attempts});if(!attempts.length||attempts.some((r:any)=>['BREACH','ERROR','NOT_PROVEN'].includes(r.result)))throw Error('Missing or failed attempts');}
catch(error){record.status='BLOCKED';record.error=String(error);save();throw error;}
record.status='PASS';record.limitations=['Python lanes only; no browser/Vitest execution measured here.','Absent targets are not successful read-denial proofs.','Signal 0 tests permission only; no destructive signal sent.','This diagnostic does not solve in-process native report forgery.'];save();console.log(JSON.stringify({status:record.status,lanes:record.lanes.map((l:any)=>({name:l.name,status:l.status,attempts:l.attempts.length})),output}));
