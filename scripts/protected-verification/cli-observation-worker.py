import sys,os,json,io,contextlib
root=sys.argv[1];packet=json.loads(sys.stdin.read());sys.path.insert(0,root)
effects=[]
def audit(event,args):
 if len(effects)>1000:raise RuntimeError('CLI effect observation limit')
 if event.startswith('socket.'):effects.append({'kind':'network','event':event})
 elif event=='open':
  path,mode,flags=args
  if isinstance(flags,int) and flags&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND):effects.append({'kind':'write','event':event,'path':str(path)})
 elif event in {'os.mkdir','os.remove','os.rename','os.rmdir','os.link','os.symlink','os.chmod','os.truncate'}:effects.append({'kind':'write','event':event,'path':str(args[0])})
sys.addaudithook(audit)
from research_router.cli import main
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('CLI output limit exceeded')
  return super().write(s)
out,err=Capture(),Capture();code=None;exception=None
try:
 with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):code=main(packet['args'])
except SystemExit as e:code=e.code
except BaseException as e:exception={'name':type(e).__name__}
print(json.dumps({'exitCode':code,'stdout':out.getvalue(),'stderr':err.getvalue(),'exception':exception,'effects':effects}))
