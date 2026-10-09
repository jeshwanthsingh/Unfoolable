"""Persistent public CLI worker. Its parent owns synchronization and observation pipe."""
import sys,os,json,io,contextlib
root=sys.argv[1];sys.path.insert(0,root)
from research_router.cli import main
def emit(fd,v):os.write(fd,(json.dumps(v)+'\n').encode())
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('CLI output bound exceeded')
  return super().write(s)
for line in sys.stdin:
 request=json.loads(line);emit(4,{'id':request['id'],'ready':True})
 if sys.stdin.read(1)!='x':raise RuntimeError('CLI release missing')
 out,err=Capture(),Capture();code=None;exception=None
 try:
  with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):code=main(request['args'])
 except SystemExit as e:code=e.code
 except BaseException as e:exception=type(e).__name__
 emit(3,{'id':request['id'],'exitCode':code if isinstance(code,int) else 0 if code is None and exception is None else None,'exceptionType':exception,'stdout':out.getvalue(),'stderr':err.getvalue()})
