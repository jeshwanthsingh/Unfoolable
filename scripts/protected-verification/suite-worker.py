"""Observe native BASE-restored unittest results; no oracle assertions or verdict."""
import sys,json,unittest,contextlib,io,importlib.util,os
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
 def addSubTest(self,t,sub,e):
  super().addSubTest(t,sub,e)
  if e is not None:
   outcome='failed' if issubclass(e[0],t.failureException) else 'error'
   existing=next((r for r in self.records if r['id']==t.id()),None)
   if existing is None:self.records.append({'id':t.id(),'outcome':outcome,'reason':str(sub)})
   elif outcome=='failed':existing['outcome']='failed'
 def addSkip(self,t,r):super().addSkip(t,r);self.records.append({'id':t.id(),'outcome':'skipped','reason':r})
 def addExpectedFailure(self,t,e):super().addExpectedFailure(t,e);self.records.append({'id':t.id(),'outcome':'expected-failure'})
 def addUnexpectedSuccess(self,t):super().addUnexpectedSuccess(t);self.records.append({'id':t.id(),'outcome':'unexpected-success'})
out,err=Capture(),Capture()
with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):
 paths=policy.get('testPaths')
 if paths is None:suite=unittest.defaultTestLoader.discover(root+'/tests')
 else:
  suite=unittest.TestSuite()
  for path in paths:
   if not isinstance(path,str) or path.startswith('/') or '..' in path.split('/') or not path.endswith('.py'):raise ValueError('Invalid BASE test path')
   sys.path.insert(0,os.path.dirname(root+'/'+path))
   name=os.path.basename(path)[:-3];spec=importlib.util.spec_from_file_location(name,root+'/'+path)
   module=importlib.util.module_from_spec(spec);sys.modules[name]=module;spec.loader.exec_module(module)
   suite.addTests(unittest.defaultTestLoader.loadTestsFromModule(module))
 def flatten(suite):
  for item in suite:
   if isinstance(item,unittest.TestSuite):yield from flatten(item)
   else:yield item
 cases=list(flatten(suite));ids=[t.id() for t in cases];exclude_ids={e['testId'] for e in excluded}
 if any(ids.count(i)!=1 for i in exclude_ids):raise ValueError('Declared excluded test missing or duplicated')
 included=[t for t in cases if t.id() not in exclude_ids]
 if policy.get('collectOnly'):
  print_packet={'collection':ids}
 else:
  result=Result();unittest.TestSuite(included).run(result)
if policy.get('collectOnly'):print(json.dumps(print_packet));sys.exit(0)
print(json.dumps({'testsRun':result.testsRun,'tests':result.records,'excludedTests':[{**e,'status':'EXCLUDED'} for e in excluded],'stdout':out.getvalue(),'stderr':err.getvalue()}))
