import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {loadConfig} from '../apps/server/config.ts';

test('defaults resolve data relative to project root and use an unprivileged port',()=>{
 const c=loadConfig({COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([tmpdir()]),},'/tmp/example');assert.equal(c.dataDir,'/tmp/example/data');assert.equal(c.port,3210);
});
test('explicit temporary data directory and port are respected',()=>{
 const c=loadConfig({COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([tmpdir()]),COMMAND_CENTER_DATA_DIR:'/tmp/cc-test',COMMAND_CENTER_PORT:'4321'},'/tmp/example');assert.equal(c.dataDir,'/tmp/cc-test');assert.equal(c.port,4321);
});
test('relative data directory is anchored to project root',()=>{
 assert.equal(loadConfig({COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([tmpdir()]),COMMAND_CENTER_DATA_DIR:'custom'},'/tmp/example').dataDir,resolve('/tmp/example/custom'));
});
test('malformed configuration fails clearly without echoing values',()=>{
 for(const value of ['','0','-1','1.5','abc','65536','1234x'])assert.throws(()=>loadConfig({COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([tmpdir()]),COMMAND_CENTER_PORT:value},'/tmp/example'),/COMMAND_CENTER_PORT/);
 assert.throws(()=>loadConfig({COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([tmpdir()]),COMMAND_CENTER_DATA_DIR:''},'/tmp/example'),/COMMAND_CENTER_DATA_DIR/);
});
