import unittest,json,sys,importlib.util,types
sys.stdin.read(1)
observations=json.load(open(sys.argv[1]));module=types.ModuleType('oracle_observations');module.observations=observations['observations'];sys.modules['oracle_observations']=module
spec=importlib.util.spec_from_file_location('oracle_judge',sys.argv[2]);oracle=importlib.util.module_from_spec(spec);sys.modules['oracle_judge']=oracle;spec.loader.exec_module(oracle)
class Result(unittest.TestResult):
 def __init__(self):super().__init__();self.records=[]
 def addSuccess(self,t):super().addSuccess(t);self.records.append({'id':t.id(),'status':'passed'})
 def addFailure(self,t,e):super().addFailure(t,e);self.records.append({'id':t.id(),'status':'failed'})
 def addError(self,t,e):super().addError(t,e);self.records.append({'id':t.id(),'status':'error'})
 def addSkip(self,t,r):super().addSkip(t,r);self.records.append({'id':t.id(),'status':'skipped'})
selector=sys.argv[3];suite=unittest.defaultTestLoader.loadTestsFromName(selector);result=Result();suite.run(result);record={'testsRun':result.testsRun,'tests':result.records,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'expectedFailures':len(result.expectedFailures),'unexpectedSuccesses':len(result.unexpectedSuccesses)}
passed=result.testsRun==1 and result.records==[{'id':selector,'status':'passed'}] and all(record[k]==0 for k in ['failures','errors','skipped','expectedFailures','unexpectedSuccesses']);record['status']='PASS' if passed else 'FAIL' if record['failures'] else 'INCONCLUSIVE';print(json.dumps(record));sys.exit(0 if passed else 1)
