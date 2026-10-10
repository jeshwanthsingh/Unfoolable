"""Bounded child-call recorder. No Candidate import or correctness verdict here."""
import ctypes, json, os, selectors, signal, subprocess, sys, time, tempfile, uuid
from pathlib import Path

def observe(root, scratch, call):
 deadline = call.get('deadlineSeconds')
 if type(deadline) not in (int, float) or not .05 <= deadline <= 5:
  raise ValueError('bounded call deadline must be 0.05 to 5 seconds')
 if call.get('executableFixture') not in (None, 'sleep'):
  raise ValueError('unknown executable fixture')
 fixture = None
 if call.get('executableFixture') == 'sleep':
  fixture = str(Path(scratch)/('bounded-cli-'+uuid.uuid4().hex+'.py'))
  Path(fixture).write_text('#!/usr/local/bin/python3\nimport time\ntime.sleep(30)\nprint("verification=verified")\n')
  os.chmod(fixture, 0o500)
 read_fd, write_fd = os.pipe()
 raw_out=tempfile.TemporaryFile(dir=scratch);raw_err=tempfile.TemporaryFile(dir=scratch)
 proc = subprocess.Popen([sys.executable, '-I', '-B', str(Path(__file__).with_name('timeout-worker.py')), root, scratch, str(write_fd)], stdin=subprocess.PIPE, stdout=raw_out, stderr=raw_err, pass_fds=(write_fd,), env={k:v for k,v in os.environ.items() if k != 'CC_OBSERVATION_FD'}, start_new_session=True)
 os.close(write_fd)
 owned = {}; observed = None; timed_out = False; started = time.monotonic()
 class BSDInfo(ctypes.Structure):
  _fields_=[(name,ctypes.c_uint32) for name in ['flags','status','xstatus','pid','ppid','uid','gid','ruid','rgid','svuid','svgid','rfu1']]+[('comm',ctypes.c_char*16),('name',ctypes.c_char*32)]+[(name,ctypes.c_uint32) for name in ['nfiles','pgid','pjobc','e_tdev','e_tpgid','nice']]+[('start_sec',ctypes.c_uint64),('start_usec',ctypes.c_uint64)]
 lib=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True)
 def snapshot():
  pids=(ctypes.c_int*8192)();count=lib.proc_listallpids(pids,ctypes.sizeof(pids))
  if count<=0 or count>=len(pids):raise RuntimeError('bounded process inventory unavailable')
  rows={}
  for pid in pids[:count]:
   info=BSDInfo();size=lib.proc_pidinfo(pid,3,0,ctypes.byref(info),ctypes.sizeof(info))
   if size==ctypes.sizeof(info):rows[pid]=(info.ppid,info.pgid,'Z' if info.status==5 else 'R',(info.start_sec,info.start_usec))
   else:rows[pid]=(None,None,None,None)
  return rows
 def retain(rows):
  for pid, row in rows.items():
   if row[1] == proc.pid:
    if pid in owned and owned[pid]!=row[3]:raise RuntimeError('bounded observer process identity changed')
    owned[pid] = row[3]
  # Also retain children that move to another group while their parent is owned.
  changed=True
  while changed:
   changed=False
   for pid,row in rows.items():
    if row[0] in owned and pid not in owned:owned[pid]=row[3];changed=True
 def live(rows, strict=True):
  active=[]
  for pid,birth in owned.items():
   if pid in rows:
    if rows[pid][3] is None:
     if strict:raise RuntimeError('bounded owned process identity unavailable')
     active.append(pid);continue
    if rows[pid][3] != birth: raise RuntimeError('bounded observer process identity changed')
    if not rows[pid][2].startswith('Z'): active.append(pid)
  return active
 selector=selectors.DefaultSelector(); selector.register(read_fd,selectors.EVENT_READ); data=b''
 try:
  retain(snapshot())
  if proc.pid not in owned:raise RuntimeError('bounded worker identity unavailable')
  proc.stdin.write(json.dumps({**call,'executablePath':fixture}).encode()+b'\n');proc.stdin.flush()
  while time.monotonic()-started < deadline:
   retain(snapshot())
   if selector.select(.01):
    part=os.read(read_fd,65537-len(data));data+=part
    if len(data)>65536:raise RuntimeError('bounded worker output bound')
    if b'\n' in data:
     observed=json.loads(data.split(b'\n',1)[0]);break
    if not part:raise RuntimeError('bounded worker ended without observation')
  if observed is None:timed_out=True
  elapsed=time.monotonic()-started
 finally:
  selector.close()
  # The worker remains alive after its result so returned-but-leaked subprocesses
  # remain in the sampled group until the recorder finishes exact cleanup.
  rows=snapshot();retain(rows);active_descendants=sum(pid != proc.pid for pid in live(rows))
  proc.stdin.write(b'CLEAN\n');proc.stdin.flush()
  for _ in range(40):
   rows=snapshot();retain(rows)
   if not any(pid != proc.pid for pid in live(rows,strict=False)):break
   time.sleep(.025)
  if any(pid != proc.pid for pid in live(snapshot())):raise RuntimeError('bounded descendant cleanup not certified')
  try:os.kill(proc.pid,signal.SIGKILL)
  except ProcessLookupError:pass
  try:proc.wait(timeout=2)
  except subprocess.TimeoutExpired:raise RuntimeError('bounded worker cleanup deadline')
  os.close(read_fd);proc.stdin.close()
  raw_out.seek(0);raw_err.seek(0)
  raw_bytes=len(raw_out.read(16385))+len(raw_err.read(16385))
  raw_out.close();raw_err.close()
  if raw_bytes>16384:raise RuntimeError('bounded raw output bound')
  for _ in range(40):
   rows=snapshot();retain(rows);active=live(rows)
   if not active:break
   # A remaining process after the worker is reaped is uncertified. The host
   # owns final reconciliation; no broader signaling permission is requested.
   time.sleep(.025)
  if live(snapshot()):raise RuntimeError('bounded child cleanup not certified')
 if observed is None:observed={'returnValue':None,'exception':None,'stdout':'','stderr':''}
 if set(observed)!={'returnValue','exception','stdout','stderr'}:raise RuntimeError('bounded worker shape')
 return {**observed,'elapsedSeconds':elapsed,'deadlineExceeded':timed_out,'ownedDescendantsGone':True,'activeDescendantsAtReturn':active_descendants}
