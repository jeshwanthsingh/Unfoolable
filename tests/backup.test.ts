import {test} from 'node:test';import {execFileSync} from 'node:child_process';
test('local backup helpers preserve identity and fail closed on unsafe storage or restore paths',()=>{execFileSync('/usr/local/bin/python3',['-I','tests/backup_helpers_test.py'],{stdio:'pipe',timeout:30000});});
