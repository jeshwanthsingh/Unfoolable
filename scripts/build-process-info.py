"""Kernel process identity only. Never emit argv or environment."""
import ctypes, json, os, subprocess, sys, time

class BsdInfo(ctypes.Structure):
    _fields_ = [(n, ctypes.c_uint32) for n in ('flags','status','xstatus','pid','ppid','uid','gid','ruid','rgid','svuid','svgid','rfu')]+[('comm',ctypes.c_char*16),('name',ctypes.c_char*32)]+[(n,ctypes.c_uint32) for n in ('nfiles','pgid','pjobc','e_tdev','e_tpgid','nice')]+[('start_sec',ctypes.c_uint64),('start_usec',ctypes.c_uint64)]

class DarwinProcessPrefix(ctypes.Structure):
    # sys/proc.h extern_proc prefix (64-bit Darwin): timeval + two
    # pointers + flags + status + PID. Kernel sysctl includes zombies
    # even when libproc and getpgid/getsid return ESRCH.
    _fields_ = [('start_sec',ctypes.c_long),('start_usec',ctypes.c_int),
                ('vmspace',ctypes.c_void_p),('sigacts',ctypes.c_void_p),
                ('flags',ctypes.c_int),('status',ctypes.c_char),('pid',ctypes.c_int)]

def darwin_zombie(pid):
    if ctypes.sizeof(ctypes.c_void_p) != 8:
        return None
    lib=ctypes.CDLL(None,use_errno=True)
    mib=(ctypes.c_int*4)(1,14,1,pid) # CTL_KERN, KERN_PROC, KERN_PROC_PID
    data=ctypes.create_string_buffer(4096); length=ctypes.c_size_t(len(data))
    if lib.sysctl(mib,4,data,ctypes.byref(length),None,0) != 0 or length.value < ctypes.sizeof(DarwinProcessPrefix):
        return None
    info=DarwinProcessPrefix.from_buffer_copy(data)
    if info.pid != pid or info.status != b'\x05' or info.start_sec <= 0 or not 0 <= info.start_usec < 1000000:
        return None
    # This is death proof, not live ownership. No group/parent/executable
    # is invented; no consumer may signal an exited record.
    return dict(pid=pid,ppid=0,pgid=0,sid=0,birth_id=f'darwin:{info.start_sec}:{info.start_usec}',executable='<zombie>',zombie=True)

def inspect(pid):
    try:
        if sys.platform == 'darwin':
            lib=ctypes.CDLL('/usr/lib/libproc.dylib')
            info=BsdInfo()
            if lib.proc_pidinfo(pid,3,0,ctypes.byref(info),ctypes.sizeof(info)) != ctypes.sizeof(info): return darwin_zombie(pid)
            path=ctypes.create_string_buffer(4096)
            if lib.proc_pidpath(pid,path,4096)<=0:
                return darwin_zombie(pid)
            return dict(pid=pid,ppid=info.ppid,pgid=info.pgid,sid=os.getsid(pid),birth_id=f'darwin:{info.start_sec}:{info.start_usec}',executable=path.value.decode(),zombie=info.status==5)
        if sys.platform.startswith('linux'):
            raw=open(f'/proc/{pid}/stat').read(); fields=raw[raw.rfind(')')+2:].split()
            return dict(pid=pid,ppid=int(fields[1]),pgid=int(fields[2]),sid=int(fields[3]),birth_id='linux:'+open('/proc/sys/kernel/random/boot_id').read().strip()+':'+fields[19],executable=os.readlink(f'/proc/{pid}/exe'),zombie=fields[0]=='Z')
        raise RuntimeError('Uncertified process identity platform')
    except (ProcessLookupError, FileNotFoundError, PermissionError): return None

# The whole recording call has one budget, below the caller's three-second limit.
# Exited, unreaped Darwin children can have no libproc identity while kill(pid,0)
# still succeeds. Accept only a full live identity, kernel-certified zombie,
# or ESRCH absence; never invent ownership.
RECORD_RETRY_SECONDS = 1.0
ROOT_RETRY_SECONDS = .05

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
    for pid in sorted(owned,key=lambda pid:pid!=root):
        # Do not hold the coordinator event loop for a second on its own
        # exiting child: it must run the exit handler to reap that PID.
        limit=min(deadline,time.monotonic()+ROOT_RETRY_SECONDS) if pid==root else deadline
        row=record(pid,limit)
        if row and not row['zombie']:
            rows.append(row)
    # A PID may disappear and be reused while recording retries. Revalidate
    # membership from the recorded kernel parents/session, not stale ps rows.
    current={root}
    while True:
        before=len(current)
        current.update(r['pid'] for r in rows if r['ppid'] in current or (r['pgid']==root and r['sid']==root))
        if len(current)==before:
            break
    # ps and libproc are separate snapshots. An exiting parent can vanish
    # before its already-exiting child is recorded. Never claim it as owned.
    # Clear ONLY a proved exit: ESRCH, or a zombie with the same kernel birth.
    for row in [r for r in rows if r['pid'] not in current]:
        # Only the exit/reparent-to-init race may be cleared. A different
        # live parent/session is observed identity conflict, never transient.
        parent=next((ppid for pid,ppid,pgid in basic if pid==row['pid']),None)
        if row['ppid']!=1 or parent not in owned or parent==1:
            raise RuntimeError('Recorded process no longer belongs to the owned tree: parent/session changed')
        old_parent=inspect(parent)
        if old_parent is not None and not old_parent['zombie']:
            raise RuntimeError('Recorded process no longer belongs to the owned tree: parent still live')
        if old_parent is None:
            try:
                os.kill(parent,0)
            except ProcessLookupError:
                pass
            except PermissionError:
                raise RuntimeError('Recorded process no longer belongs to the owned tree: parent identity unavailable') from None
            else:
                raise RuntimeError('Recorded process no longer belongs to the owned tree: parent death unproved')
        while True:
            now=inspect(row['pid'])
            if now and now['birth_id']!=row['birth_id']:
                raise RuntimeError('Recorded process no longer belongs to the owned tree: PID reused')
            if now and now['zombie']:
                rows.remove(row)
                break
            if now is None:
                try:
                    os.kill(row['pid'],0)
                except ProcessLookupError: # ESRCH is absence, not a failed identity query.
                    rows.remove(row)
                    break
                except PermissionError:
                    raise RuntimeError('Recorded process no longer belongs to the owned tree: identity unavailable') from None
            if time.monotonic()>=deadline:
                raise RuntimeError('Recorded process no longer belongs to the owned tree')
            time.sleep(min(.025,max(0,deadline-time.monotonic())))
    return rows

if __name__ == '__main__':
    print(json.dumps(record(int(sys.argv[2]),time.monotonic()+ROOT_RETRY_SECONDS) if sys.argv[1]=='one' else tree(int(sys.argv[2]))))
