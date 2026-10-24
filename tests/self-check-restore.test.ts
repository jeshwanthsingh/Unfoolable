import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
function run(skipped:boolean){const code=`import sys,types,runpy
b=types.ModuleType('backup')
b.read_config=lambda: {'dataDir':'/fixture','backupDir':'/backup'}
b.snapshot=lambda c,force: ${skipped?"{'skipped':'checkpoint busy'}":"{'archive':'fresh.tar.gz','archiveSha256':'fresh'}"}
def restore(directory,status,output):
 assert status['archive']=='fresh.tar.gz'
 return {'allTableDigestsMatch':True,'allFileDigestsMatch':True,'integrityCheck':'ok','foreignKeyErrors':0,'restoredFiles':7}
b.restore_bundle=restore
sys.modules['backup']=b
sys.argv=['self-check-restore.py','/fixture','/isolated-output']
runpy.run_path('scripts/self-check-restore.py',run_name='__main__')
`;return execFileSync('/usr/local/bin/python3',['-I','-c',code],{encoding:'utf8',stdio:'pipe'});}
test('weekly restore refuses a skipped snapshot instead of validating an older archive',()=>{assert.throws(()=>run(true),/fresh|checkpoint|snapshot/i);});
test('weekly restore verifies exactly the fresh snapshot returned by the backup tool',()=>{const result=JSON.parse(run(false));assert.equal(result.restored,true);assert.equal(result.mode,'full');assert.equal(result.complete,true);assert.equal(result.files,7);assert.ok(result.elapsedSeconds>=0);});
