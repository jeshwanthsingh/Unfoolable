import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION,isHealthResponse} from '../packages/shared/health.ts';
test('application version matches package metadata',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')) as {version:string};assert.equal(APP_VERSION,pkg.version);
});
test('only a valid readiness response may produce ready UI state',()=>{
 const valid={status:'ok',version:'0.0.1',coordinator:'online',database:{status:'ready',schemaVersion:1}};
 assert.equal(isHealthResponse(valid),true);
 for(const bad of [null,{},'ok',{...valid,database:{status:'ready'}},{...valid,database:{status:'ready',schemaVersion:0}},{...valid,coordinator:'offline'}])assert.equal(isHealthResponse(bad),false);
});
test('a real database-unavailable response remains distinct from an offline coordinator',()=>{
 assert.equal(isHealthResponse({status:'error',version:'0.0.1',coordinator:'online',database:{status:'unavailable'},error:{code:'DATABASE_UNAVAILABLE',message:'Database is not ready'}}),true);
});
