import sys, os, json, importlib, datetime, io, contextlib, hashlib, subprocess, tempfile
from pathlib import Path
write=os.write; dumps=json.dumps; kind=type; value_error=ValueError
root,scratch=sys.argv[1:3];request=json.loads(sys.stdin.read());sys.path.insert(0,root);results=[]
def decode(v):
 if isinstance(v,str):return v.replace('$SCRATCH',scratch)
 if isinstance(v,dict) and set(v)=={'$datetime'}:return datetime.datetime.fromisoformat(v['$datetime'])
 if isinstance(v,dict):return {k:decode(x) for k,x in v.items()}
 if isinstance(v,list):return [decode(x) for x in v]
 return v
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('output limit exceeded')
  return super().write(s)
def snapshot():
 files={}
 for p in Path(scratch).rglob('*'):
  if p.is_file() and not p.is_symlink():
   if len(files)>1000 or p.stat().st_size>1048576:raise RuntimeError('CLI snapshot bound')
   files[str(p.relative_to(scratch))]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mtime':p.stat().st_mtime_ns}
 return files
def cli(args):
 script=os.path.join(os.path.dirname(__file__),'cli-observation-worker.py')
 result=subprocess.run(['/usr/local/bin/python3','-I','-B',script,root],cwd=root,input=dumps({'args':args}).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={k:v for k,v in os.environ.items() if k!='CC_OBSERVATION_FD'},timeout=5,close_fds=True)
 if result.returncode or len(result.stdout)>65536 or not result.stdout:raise RuntimeError('CLI observer did not complete')
 return json.loads(result.stdout)
for call in request['requests']:
 out,err=Capture(),Capture();row={'id':call['id'],'returnValue':None,'exception':None,'stdout':'','stderr':'','filesWritten':[]}
 with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):
  try:
   if call.get('kind')=='SCOPE':
    phase='scope';row['returnValue']=call['scope']
   elif call.get('kind')=='SUITE':
    phase='suite';script=os.path.join(os.path.dirname(__file__),'suite-worker.py')
    proc=subprocess.run(['/usr/local/bin/python3','-I','-B',script,root],cwd=root,input=dumps({'excludedTests':call.get('excludedTests',[]),'testPaths':call.get('fixtureInput',{}).get('testPaths')}).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=100)
    if proc.returncode or len(proc.stdout)>200000:raise RuntimeError('native suite recorder did not complete')
    row['returnValue']=json.loads(proc.stdout)
   elif call.get('kind')=='BOUNDED_CALL':
    phase='bounded-call';path=os.path.join(os.path.dirname(__file__),'timeout-observation.py')
    spec=importlib.util.spec_from_file_location('timeout_observation',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    row.update(module.observe(root,scratch,call));out.write(row['stdout']);err.write(row['stderr'])
   elif call.get('kind')=='CONCURRENT':
    phase='concurrent';path=os.path.join(os.path.dirname(__file__),'concurrent-observation.py')
    spec=importlib.util.spec_from_file_location('concurrent_observation',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    row['returnValue']=module.observe(root,scratch,call)
   elif call.get('kind')=='CLI':
    phase='cli';args=decode(call.get('args',[]));stdin=decode(call.get('stdin',''))
    if not isinstance(args,list) or not all(isinstance(a,str) for a in args) or not isinstance(stdin,str):raise ValueError('invalid CLI request')
    if 'prepareArgs' in call:
     row['setupExitCodes']=[cli(decode(prep))['exitCode'] for prep in call['prepareArgs']]
     row['beforeFiles']=snapshot();value=cli(args);row.update(value);row['afterFiles']=snapshot();out.write(value['stdout']);err.write(value['stderr'])
    else:
     with tempfile.TemporaryFile(dir=scratch) as stdout_file,tempfile.TemporaryFile(dir=scratch) as stderr_file:
      result=subprocess.run(['/usr/local/bin/python3','-B','-m','research_router.cli',*args],cwd=root,input=stdin.encode(),stdout=stdout_file,stderr=stderr_file,env={k:v for k,v in os.environ.items() if k!='CC_OBSERVATION_FD'},timeout=5,close_fds=True)
      stdout_file.seek(0);stderr_file.seek(0);stdout_bytes=stdout_file.read(16385);stderr_bytes=stderr_file.read(16385)
      if len(stdout_bytes)>16384 or len(stderr_bytes)>16384:raise RuntimeError('output limit exceeded')
      out.write(stdout_bytes.decode('utf-8',errors='replace'));err.write(stderr_bytes.decode('utf-8',errors='replace'));row['exitCode']=result.returncode
   else:
    phase='import';fn=getattr(importlib.import_module(call['module']),call['function']);args=decode(call.get('args',[]));kwargs=decode(call.get('kwargs',{}));phase='call';value=fn(*args,**kwargs);phase='serialize';value={field:getattr(value,field) for field in call['resultFields']} if call.get('resultFields') else value;dumps(value,allow_nan=False);row['returnValue']=value
  except BaseException as exc:
   if call.get('kind')=='BOUNDED_CALL':raise
   row['exception']={'name':kind(exc).__name__,'module':kind(exc).__module__,'builtinValueError':isinstance(exc,value_error),'phase':phase}
 row['stdout']=out.getvalue();row['stderr']=err.getvalue()
 if call.get('kind')=='CLI':
  try:row['jsonOutput']=json.loads(row['stdout']);row['jsonParseError']=False
  except (ValueError,RecursionError):row['jsonOutput']=None;row['jsonParseError']=True
 results.append(row)
files=[]
for p in ([] if any(r.get('kind')=='CONCURRENT' for r in request['requests']) else Path(scratch).rglob('*')):
 if p.is_file() and not p.is_symlink():
  if p.stat().st_size>1048576:raise RuntimeError('file size limit')
  files.append({'path':str(p.relative_to(scratch)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for row in results:row['filesWritten']=files
write(int(os.environ['CC_OBSERVATION_FD']),(dumps({'version':'observations-v1','observations':results},allow_nan=False)+'\n').encode())
