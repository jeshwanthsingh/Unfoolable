"""Candidate-only child. Judge and protected observations are never imported."""
import ctypes, signal, threading, time, contextlib, datetime, importlib, io, json, os, sys
root,scratch,fd=sys.argv[1:];call=json.loads(sys.stdin.buffer.readline());sys.path.insert(0,root)
write=os.write;dumps=json.dumps;exception_type=type;value_error=ValueError
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('output limit exceeded')
  return super().write(s)
def decode(v):
 if isinstance(v,str):return v.replace('$SCRATCH',scratch).replace('$EXECUTABLE',call.get('executablePath') or '')
 if isinstance(v,dict) and set(v)=={'$datetime'}:return datetime.datetime.fromisoformat(v['$datetime'])
 if isinstance(v,dict):return {k:decode(x) for k,x in v.items()}
 if isinstance(v,list):return [decode(x) for x in v]
 return v
# Capture cleanup primitives before importing Candidate code. Only direct owned
# children may receive signals under the unchanged sandbox rule.
kill=os.kill;waitpid=os.waitpid;getpid=os.getpid;sleep=time.sleep
class BSDInfo(ctypes.Structure):
 _fields_=[(name,ctypes.c_uint32) for name in ['flags','status','xstatus','pid','ppid','uid','gid','ruid','rgid','svuid','svgid','rfu1']]+[('comm',ctypes.c_char*16),('name',ctypes.c_char*32)]+[(name,ctypes.c_uint32) for name in ['nfiles','pgid','pjobc','e_tdev','e_tpgid','nice']]+[('start_sec',ctypes.c_uint64),('start_usec',ctypes.c_uint64)]
lib=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True);listpids=lib.proc_listallpids;pidinfo=lib.proc_pidinfo;worker_pid=getpid()
def cleanup_listener():
 if sys.stdin.buffer.readline()!=b'CLEAN\n':return
 known_children=set()
 for _ in range(30):
  pids=(ctypes.c_int*8192)();count=listpids(pids,ctypes.sizeof(pids))
  if count<=0 or count>=len(pids):return
  children=[]
  for pid in pids[:count]:
   info=BSDInfo()
   if pidinfo(pid,3,0,ctypes.byref(info),ctypes.sizeof(info))==ctypes.sizeof(info) and info.ppid==worker_pid and info.status!=5:children.append(pid)
  known_children.update(children)
  for pid in children:
   try:kill(pid,signal.SIGKILL)
   except ProcessLookupError:pass
  for pid in known_children:
   try:waitpid(pid,os.WNOHANG)
   except ChildProcessError:pass
  sleep(.01)
threading.Thread(target=cleanup_listener,daemon=True).start()
out,err=Capture(),Capture();row={'returnValue':None,'exception':None,'stdout':'','stderr':''};phase='import'
with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):
 try:
  fn=getattr(importlib.import_module(call['module']),call['function'])
  if call.get('method'):
   phase='constructor';instance=fn(*decode(call.get('constructorArgs',[])),**decode(call.get('constructorKwargs',{})));fn=getattr(instance,call['method'])
  phase='call';value=fn(*decode(call.get('args',[])),**decode(call.get('kwargs',{})))
  phase='serialize';value={field:getattr(value,field) for field in call['resultFields']} if call.get('resultFields') else value;dumps(value,allow_nan=False);row['returnValue']=value
 except BaseException as exc:row['exception']={'name':exception_type(exc).__name__,'module':exception_type(exc).__module__,'builtinValueError':isinstance(exc,value_error),'phase':phase}
row['stdout']=out.getvalue();row['stderr']=err.getvalue()
write(int(fd),(dumps(row,allow_nan=False)+'\n').encode());os.close(int(fd))
threading.Event().wait()
