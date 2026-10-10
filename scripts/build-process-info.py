"""Kernel process identity only. Never emit argv or environment."""
import ctypes, json, os, subprocess, sys, time

class BsdInfo(ctypes.Structure):
    _fields_ = [(n, ctypes.c_uint32) for n in ('flags','status','xstatus','pid','ppid','uid','gid','ruid','rgid','svuid','svgid','rfu')]+[('comm',ctypes.c_char*16),('name',ctypes.c_char*32)]+[(n,ctypes.c_uint32) for n in ('nfiles','pgid','pjobc','e_tdev','e_tpgid','nice')]+[('start_sec',ctypes.c_uint64),('start_usec',ctypes.c_uint64)]

def inspect(pid):
    try:
        if sys.platform == 'darwin':
            lib=ctypes.CDLL('/usr/lib/libproc.dylib')
            info=BsdInfo()
            if lib.proc_pidinfo(pid,3,0,ctypes.byref(info),ctypes.sizeof(info)) != ctypes.sizeof(info): return None
            path=ctypes.create_string_buffer(4096)
            if lib.proc_pidpath(pid,path,4096)<=0:
                if info.status==5: return dict(pid=pid,ppid=info.ppid,pgid=info.pgid,sid=os.getsid(pid),birth_id=f'darwin:{info.start_sec}:{info.start_usec}',executable='<zombie>',zombie=True)
                return None
            return dict(pid=pid,ppid=info.ppid,pgid=info.pgid,sid=os.getsid(pid),birth_id=f'darwin:{info.start_sec}:{info.start_usec}',executable=path.value.decode(),zombie=info.status==5)
        if sys.platform.startswith('linux'):
            raw=open(f'/proc/{pid}/stat').read(); fields=raw[raw.rfind(')')+2:].split()
            return dict(pid=pid,ppid=int(fields[1]),pgid=int(fields[2]),sid=int(fields[3]),birth_id='linux:'+open('/proc/sys/kernel/random/boot_id').read().strip()+':'+fields[19],executable=os.readlink(f'/proc/{pid}/exe'),zombie=fields[0]=='Z')
        raise RuntimeError('Uncertified process identity platform')
    except (ProcessLookupError, FileNotFoundError, PermissionError): return None

# The whole recording call has one budget, below the caller's three-second limit.
# Exited, unreaped Darwin children can have no libproc identity while kill(pid,0)
# still succeeds. Wait for a full identity or ESRCH, never invent ownership.
RECORD_RETRY_SECONDS = 1.0

def record(pid, deadline):
    while True:
        row=inspect(pid)
        if row:
            if row['pid'] != pid or not row['birth_id']:
                raise RuntimeError(f'Owned PID {pid} kernel identity is invalid')
            return row
        try:
            os.kill(pid,0)
        except ProcessLookupError:
            return None
        except PermissionError:
            raise RuntimeError(f'Owned PID {pid} existence or kernel identity unavailable') from None
        remaining=deadline-time.monotonic()
        if remaining<=0:
            raise RuntimeError(f'Owned PID {pid} is live but kernel identity unavailable after bounded retry')
        time.sleep(min(.025,remaining))

def tree(root):
    rows=[]
    # Only kernel IDs are inspected internally; only exact owned ancestry/group is emitted.
    ids=subprocess.check_output(['/bin/ps','-axo','pid=,ppid=,pgid='],text=True).splitlines()
    basic=[tuple(map(int,line.split())) for line in ids if len(line.split())==3]
    owned={root}
    while True:
        before=len(owned)
        owned.update(pid for pid,ppid,pgid in basic if ppid in owned or pgid==root)
        if len(owned)==before: break
    deadline=time.monotonic()+RECORD_RETRY_SECONDS
    for pid in owned:
        row=record(pid,deadline)
        if row:
            rows.append(row)
    # A PID may disappear and be reused while recording retries. Revalidate
    # membership from the recorded kernel parents/session, not stale ps rows.
    current={root}
    while True:
        before=len(current)
        current.update(r['pid'] for r in rows if r['ppid'] in current or (r['pgid']==root and r['sid']==root))
        if len(current)==before:
            break
    if any(r['pid'] not in current for r in rows):
        raise RuntimeError('Recorded process no longer belongs to the owned tree')
    return rows

if __name__ == '__main__':
    print(json.dumps(record(int(sys.argv[2]),time.monotonic()+RECORD_RETRY_SECONDS) if sys.argv[1]=='one' else tree(int(sys.argv[2]))))
