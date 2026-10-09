"""Observe native BASE-restored unittest results; no oracle assertions or verdict."""
import sys,json,unittest,contextlib,io
policy=json.loads(sys.stdin.read());excluded=policy.get('excludedTests',[])
allowed={'testId':'test_broker_smoke.BrokerSmokeIntegrationTests.test_broker_examples','reason':'Needs live broker credentials; explicitly excluded by user.'}
if excluded not in ([],[allowed]):raise ValueError('Unapproved suite exclusion')
root=sys.argv[1];sys.path.insert(0,root)
class Capture(io.StringIO):
 def write(self,s):
  if self.tell()+len(s)>16384:raise RuntimeError('native suite output exceeds bound')
  return super().write(s)
class Result(unittest.TestResult):
 def __init__(self):super().__init__();self.records=[]
 def addSuccess(self,t):super().addSuccess(t);self.records.append({'id':t.id(),'outcome':'passed'})
 def addFailure(self,t,e):super().addFailure(t,e);self.records.append({'id':t.id(),'outcome':'failed'})
 def addError(self,t,e):super().addError(t,e);self.records.append({'id':t.id(),'outcome':'error','exceptionType':e[0].__name__})
 def addSkip(self,t,r):super().addSkip(t,r);self.records.append({'id':t.id(),'outcome':'skipped','reason':r})
 def addExpectedFailure(self,t,e):super().addExpectedFailure(t,e);self.records.append({'id':t.id(),'outcome':'expected-failure'})
 def addUnexpectedSuccess(self,t):super().addUnexpectedSuccess(t);self.records.append({'id':t.id(),'outcome':'unexpected-success'})
out,err=Capture(),Capture()
with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):
 suite=unittest.defaultTestLoader.discover(root+'/tests')
 def flatten(suite):
  for item in suite:
   if isinstance(item,unittest.TestSuite):yield from flatten(item)
   else:yield item
 cases=list(flatten(suite));ids=[t.id() for t in cases];exclude_ids={e['testId'] for e in excluded}
 if any(ids.count(i)!=1 for i in exclude_ids):raise ValueError('Declared excluded test missing or duplicated')
 included=[t for t in cases if t.id() not in exclude_ids]
 if not included:raise ValueError('No included native tests')
 result=Result();unittest.TestSuite(included).run(result)
print(json.dumps({'testsRun':result.testsRun,'tests':result.records,'excludedTests':[{**e,'status':'EXCLUDED'} for e in excluded],'stdout':out.getvalue(),'stderr':err.getvalue()}))
