import sys, os, json, importlib, datetime, io, contextlib, hashlib
write=os.write; dumps=json.dumps; kind=type; value_error=ValueError
root,scratch=sys.argv[1:3];request=json.loads(sys.stdin.read());sys.path.insert(0,root);results=[]
def decode(v):
 if isinstance(v,dict) and set(v)=={'$datetime'}:return datetime.datetime.fromisoformat(v['$datetime'])
 if isinstance(v,dict):return {k:decode(x) for k,x in v.items()}
 if isinstance(v,list):return [decode(x) for x in v]
 return v
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('output limit exceeded')
  return super().write(s)
for call in request['requests']:
 out,err=Capture(),Capture();row={'id':call['id'],'returnValue':None,'exception':None,'stdout':'','stderr':'','filesWritten':[]}
 with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):
  try:
   phase='import';fn=getattr(importlib.import_module(call['module']),call['function']);args=decode(call.get('args',[]));kwargs=decode(call.get('kwargs',{}));phase='call';value=fn(*args,**kwargs);phase='serialize';dumps(value,allow_nan=False);row['returnValue']=value
  except BaseException as exc:row['exception']={'name':kind(exc).__name__,'module':kind(exc).__module__,'builtinValueError':isinstance(exc,value_error),'phase':phase}
 row['stdout']=out.getvalue();row['stderr']=err.getvalue();results.append(row)
from pathlib import Path
files=[]
for p in Path(scratch).rglob('*'):
 if p.is_file() and not p.is_symlink():
  if p.stat().st_size>1048576:raise RuntimeError('file size limit')
  files.append({'path':str(p.relative_to(scratch)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for row in results:row['filesWritten']=files
write(int(os.environ['CC_OBSERVATION_FD']),(dumps({'version':'observations-v1','observations':results},allow_nan=False)+'\n').encode())
