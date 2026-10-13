"""Native unittest result collector. Only the new writer file is selected."""
import sys, json, unittest, importlib.util, contextlib, io, traceback
policy = json.loads(sys.stdin.readline())
root, path = policy['root'], policy['path']
sys.path.insert(0, root)
class Result(unittest.TestResult):
    def __init__(self):
        super().__init__(); self.records = []; self.subfailures = set()
    def addSuccess(self, t):
        super().addSuccess(t)
        if t.id() not in self.subfailures: self.records.append({'id':t.id(), 'status':'PASS'})
    def addFailure(self,t,e):
        super().addFailure(t,e); self.records.append({'id':t.id(),'status':'ASSERTION_FAIL','reason':''.join(traceback.format_exception(*e))[-6000:]})
    def addError(self,t,e):
        super().addError(t,e); self.records.append({'id':t.id(),'status':'ERROR','reason':''.join(traceback.format_exception(*e))[-6000:]})
    def addSkip(self,t,r):
        super().addSkip(t,r); self.records.append({'id':t.id(),'status':'SKIPPED','reason':r})
    def addExpectedFailure(self,t,e):
        super().addExpectedFailure(t,e); self.records.append({'id':t.id(),'status':'SKIPPED','reason':'expected failure'})
    def addUnexpectedSuccess(self,t):
        super().addUnexpectedSuccess(t); self.records.append({'id':t.id(),'status':'ERROR','reason':'unexpected success'})
    def addSubTest(self,t,sub,e):
        super().addSubTest(t,sub,e)
        if e is not None and t.id() not in self.subfailures:
            self.subfailures.add(t.id()); self.records.append({'id':t.id(),'status':'ASSERTION_FAIL' if issubclass(e[0],t.failureException) else 'ERROR','reason':''.join(traceback.format_exception(*e))[-6000:]})
class Capture(io.StringIO):
    def write(self,s):
        if self.tell()+len(s)>16384: raise RuntimeError('Writer native output exceeded bound')
        return super().write(s)
r=Result(); out,err=Capture(),Capture()
try:
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        spec=importlib.util.spec_from_file_location('cc_writer_test',root+'/'+path)
        module=importlib.util.module_from_spec(spec);sys.modules[spec.name]=module;spec.loader.exec_module(module)
        unittest.defaultTestLoader.loadTestsFromModule(module).run(r)
    report={'testsRun':r.testsRun,'tests':r.records,'stdout':out.getvalue(),'stderr':err.getvalue()}
except BaseException as e:
    report={'testsRun':0,'tests':[],'errorType':type(e).__name__,'error':traceback.format_exc()[-6000:]}
print(json.dumps(report),flush=True)
sys.exit(0 if r.testsRun>0 and r.wasSuccessful() and not report.get('error') else 1)
