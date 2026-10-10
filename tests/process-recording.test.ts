import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const header=`import importlib.util,json
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('identity','scripts/build-process-info.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
row=dict(pid=123,ppid=1,pgid=123,sid=123,birth_id='darwin:123:456',executable='/fixture',zombie=False)
`;
function run(code:string){return execFileSync(process.platform==='darwin'?'/usr/local/bin/python3':'/usr/bin/python3',['-c',header+code],{cwd:resolve('.'),encoding:'utf8',timeout:5000});}
test('recording retries transient missing identity and returns the actual kernel birth record',()=>{assert.equal(run(`with patch.object(m,'inspect',side_effect=[None,None,row]),patch.object(m.os,'kill',return_value=None),patch.object(m.time,'sleep'),patch.object(m.time,'monotonic',return_value=0):
 assert m.record(123,1)==row
print('confirmed')
`).trim(),'confirmed');});
test('exited PID is omitted only after ESRCH proof, never fabricated as owned',()=>{assert.equal(run(`with patch.object(m,'inspect',return_value=None),patch.object(m.os,'kill',side_effect=ProcessLookupError):
 assert m.record(123,1) is None
print('absent')
`).trim(),'absent');});
test('persistent live uncertainty reaches deadline and fails closed without an identity',()=>{assert.equal(run(`with patch.object(m,'inspect',return_value=None),patch.object(m.os,'kill',return_value=None),patch.object(m.time,'sleep'),patch.object(m.time,'monotonic',side_effect=[0,.5,1]):
 try:m.record(123,1);raise AssertionError('accepted unknown PID')
 except RuntimeError as e:assert 'after bounded retry' in str(e)
print('denied')
`).trim(),'denied');});
test('permission uncertainty never substitutes PID-only existence for ownership',()=>{assert.equal(run(`with patch.object(m,'inspect',return_value=None),patch.object(m.os,'kill',side_effect=PermissionError):
 try:m.record(123,1);raise AssertionError('accepted unknown PID')
 except RuntimeError as e:assert 'unavailable' in str(e)
print('denied')
`).trim(),'denied');});
test('PID reuse outside the freshly recorded parent/session is rejected',()=>{assert.equal(run(`unrelated=dict(row,pid=456,ppid=999,pgid=999,sid=999,birth_id='new-birth')
with patch.object(m.subprocess,'check_output',return_value='123 1 123\\n456 123 123\\n'),patch.object(m,'record',side_effect=lambda pid,deadline:row if pid==123 else unrelated):
 try:m.tree(123);raise AssertionError('accepted unrelated reused PID')
 except RuntimeError as e:assert 'no longer belongs' in str(e)
print('rejected')
`).trim(),'rejected');});
test('multiple pending identities share one recording budget',()=>{assert.equal(run(`deadlines=[]
with patch.object(m.subprocess,'check_output',return_value='123 1 123\\n456 123 123\\n'),patch.object(m.time,'monotonic',return_value=50),patch.object(m,'record',side_effect=lambda pid,deadline:(deadlines.append(deadline) or (row if pid==123 else dict(row,pid=456,ppid=123)))):
 assert len(m.tree(123))==2
 assert deadlines==[51,51]
print('bounded')
`).trim(),'bounded');});
