"""Read permission test. Never emits filenames discovered or file contents."""
import os, json, errno, pathlib, sqlite3, tempfile, subprocess
workspace=pathlib.Path.cwd()
manifest=json.loads((workspace/'.cc-runtime/read-targets.json').read_text())
rows=[]
for target in manifest:
    try:
        fd=os.open(target['path'],os.O_RDONLY|os.O_NONBLOCK)
        try:
            if target['kind']=='directory':
                with os.scandir(fd) as entries:
                    next(entries,None) # discard the name; do not inspect any files
            else:
                os.read(fd,1) # discard byte; never print or hash it
        finally:
            os.close(fd)
        rows.append(dict(label=target['label'],path=target['path'],readable=True,errno=None))
    except OSError as error:
        rows.append(dict(label=target['label'],path=target['path'],readable=False,errno=error.errno))
checks={}
for name,args in [('git_status',['git','status','--porcelain']),('git_diff',['git','diff','--check']),('git_log',['git','log','-1','--format=%H'])]:
    completed=subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)
    checks[name]=completed.returncode==0
with tempfile.TemporaryDirectory() as directory:
    connection=sqlite3.connect(directory+'/probe.sqlite')
    connection.execute('CREATE TABLE fixture(value INTEGER)')
    connection.execute('INSERT INTO fixture VALUES(1)')
    checks['sqlite_temp']=connection.execute('SELECT value FROM fixture').fetchone()[0]==1
    connection.close()
checks['own_write']=False
try:
    path=workspace/'.cc-runtime/owned-write'
    path.write_text('harmless probe')
    checks['own_write']=path.read_text()=='harmless probe'
    path.unlink()
except OSError:
    pass
report=dict(rows=rows,ownedChecks=checks,secretContentsEmitted=False)
(workspace/'.cc-runtime/read-report.json').write_text(json.dumps(report))
print(json.dumps(report if os.environ.get('CC_PROBE_FULL_OUTPUT')=='1' else dict(targetCount=len(rows),readableCount=sum(r['readable'] for r in rows),ownedChecks=checks)))
