"""Fixed two-worker CLI interface technique. Only raw outcomes/histograms, never verdicts."""
import os,sys,json,subprocess,selectors,time,sqlite3,threading
from pathlib import Path
def observe(root,scratch,call):
 pairs=call['repetitions'];budget=call['budgetSeconds']
 if type(pairs)!=int or pairs<1 or pairs>2000 or type(budget)!=int or budget<1 or budget>120:raise ValueError('concurrency bounds')
 class Worker:
  def __init__(self,n):
   read,write=os.pipe();ready_read,ready_write=os.pipe()
   def mapped():os.dup2(write,3);os.dup2(ready_write,4)
   self.p=subprocess.Popen(['/usr/local/bin/python3','-I','-B',str(Path(__file__).with_name('concurrent-worker.py')),root],cwd=root,env={**os.environ,'CC_OBSERVATION_FD':'3'},stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,pass_fds=tuple(set([write,ready_write,3,4])),preexec_fn=mapped)
   self.bytes=0;self.drainers=[]
   def drain(stream):
    while True:
     part=stream.read(4096)
     if not part:break
     self.bytes+=len(part)
   for stream in [self.p.stdout,self.p.stderr]:
    t=threading.Thread(target=drain,args=(stream,),daemon=True);t.start();self.drainers.append(t)
   os.close(write);os.close(ready_write);self.out=os.fdopen(read,'rb',buffering=0);self.ready=os.fdopen(ready_read,'rb',buffering=0)
  def read(self,pipe):
   selector=selectors.DefaultSelector();selector.register(pipe,selectors.EVENT_READ)
   try:
    if not selector.select(5):raise RuntimeError('CLI worker deadline')
    data=pipe.readline(65536)
    if not data:raise RuntimeError('CLI worker observation missing')
    return json.loads(data)
   finally:selector.close()
  def prepare(self,id,args):
   self.p.stdin.write((json.dumps({'id':id,'args':args})+'\n').encode());self.p.stdin.flush()
   if self.read(self.ready)!={'id':id,'ready':True}:raise RuntimeError('CLI worker correlation')
  def release(self):self.p.stdin.write(b'x');self.p.stdin.flush()
  def collect(self,id):
   row=self.read(self.out)
   if self.bytes>65536:raise RuntimeError('CLI raw output exceeds bound')
   if row['id']!=id:raise RuntimeError('CLI observation identity')
   return row
  def close(self):
   self.p.stdin.close();self.p.wait(timeout=3);self.out.close();self.ready.close()
   for t in self.drainers:t.join(1)
   self.p.stdout.close();self.p.stderr.close()
 workers=[Worker(0),Worker(1)];histogram={};samples=[];started=time.monotonic();completed=0
 try:
  for index in range(pairs):
   if time.monotonic()-started>budget:raise RuntimeError('concurrent sampling deadline')
   folder=Path(scratch)/('pair-'+str(index));folder.mkdir()
   for name in ['state','proof-lab','codex-kit']:(folder/name).mkdir()
   url='https://oracle.invalid/'+str(os.getpid())+'/'+str(index)
   def args(value):return [a.replace('$URL',value) for a in call['args']]+['--state-dir',str(folder/'state'),'--proof-lab-root',str(folder/'proof-lab'),'--codex-kit-root',str(folder/'codex-kit')]
   warm='warm-'+str(index);workers[0].prepare(warm,args(url+'/warm'));workers[0].release();warm_row=workers[0].collect(warm)
   database=folder/call['dbRelativePath']
   if not database.resolve().is_relative_to(folder.resolve()) or not database.is_file():raise RuntimeError('disposable database unavailable')
   with sqlite3.connect(database) as db:db.execute('DELETE FROM sources');db.execute('DELETE FROM audit_events');db.execute('DELETE FROM runs');db.commit()
   ids=[str(index)+'-0',str(index)+'-1']
   urls=[url,url+'/other' if call.get('distinctUrls') else url]
   for worker,id,value in zip(workers,ids,urls):worker.prepare(id,args(value))
   for worker in workers:worker.release()
   rows=[worker.collect(id) for worker,id in zip(workers,ids)]
   with sqlite3.connect(database) as db:
    count=db.execute('SELECT COUNT(*) FROM sources').fetchone()[0];stored=[x[0] for x in db.execute('SELECT source_id FROM sources')]
   def identity(value):
    try:
     data=json.loads(value)
     def find(obj):
      if isinstance(obj,dict):
       if isinstance(obj.get('source_id'),str):return obj['source_id']
       for v in obj.values():
        result=find(v)
        if result:return result
      return None
     return find(data)
    except ValueError:return None
   returned=[identity(r['stdout']) for r in rows]
   item={'exitCodes':[r['exitCode'] for r in rows],'exceptionTypes':[r['exceptionType'] for r in rows],'storedRows':count,'warmExitCode':warm_row['exitCode'],'returnedMatchesStored':[value in stored for value in returned],'returnedIdsEqual':returned[0] is not None and returned[0]==returned[1]}
   key=json.dumps(item,sort_keys=True);histogram[key]=histogram.get(key,0)+1
   if len(samples)<8:samples.append({'index':index,'calls':rows,'storedRows':count})
   completed+=1
 finally:
  for worker in workers:worker.close()
 return {'requestedPairs':pairs,'completedPairs':completed,'elapsedSeconds':time.monotonic()-started,'histogram':[{'outcome':json.loads(k),'count':n} for k,n in sorted(histogram.items())],'samples':samples}
