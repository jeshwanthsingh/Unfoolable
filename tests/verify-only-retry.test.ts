import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {AnalysisError} from '../apps/server/analysis-errors.ts';import {harnessRetry,retryableHarnessError} from '../apps/server/verify-only-retry.ts';
const envError=()=>{const e=new AnalysisError('ANALYSIS_OWNERSHIP_UNKNOWN','transient kernel query');e.cleanupCertified=true;return e;};
test('certified harness failure gets one recorded retry and succeeds',async()=>{const dir=mkdtempSync(join(tmpdir(),'cc-retry-'));let calls=0;assert.equal(await harnessRetry('author',dir,new AbortController().signal,async()=>{if(++calls===1)throw envError();return 42;}),42);assert.equal(calls,2);assert.equal(JSON.parse(readFileSync(join(dir,'harness-retries.jsonl'),'utf8')).attempt,1);});
test('second harness failure remains error; code failure is never retried',async()=>{const dir=mkdtempSync(join(tmpdir(),'cc-retry-'));let calls=0;await assert.rejects(harnessRetry('author',dir,new AbortController().signal,async()=>{calls++;throw envError();}));assert.equal(calls,2);calls=0;await assert.rejects(harnessRetry('author',dir,new AbortController().signal,async()=>{calls++;throw new AnalysisError('INVALID_ANALYSIS_OUTPUT','wrong output');}));assert.equal(calls,1);});
test('uncertain ownership and cancellation never authorize retry',async()=>{assert.equal(retryableHarnessError(new AnalysisError('ANALYSIS_OWNERSHIP_UNKNOWN','uncertain')),false);const c=new AbortController();c.abort();let calls=0;await assert.rejects(harnessRetry('author',tmpdir(),c.signal,async()=>{calls++;throw envError();}));assert.equal(calls,1);});

test('only certified environment exceptions retry; failed or incomplete checks do not',async()=>{
 const {retryableExecution}=await import('../apps/server/verify-only-retry.ts');
 const base={status:'INCONCLUSIVE' as const,output:JSON.stringify({observations:[{exception:{phase:'suite',name:'PermissionError'}}]}),truncated:false,durationMs:1,cleanup:{verified:true,ambiguous:false,remaining:[],terminalCount:0,reason:null},environment:{}};
 assert.equal(retryableExecution(base),true);
 for(const result of [{...base,status:'FAIL' as const},{...base,status:'PASS' as const},{...base,output:'invalid'},{...base,truncated:true},{...base,cleanup:{...base.cleanup,verified:false}},{...base,cleanup:{...base.cleanup,ambiguous:true}},{...base,output:JSON.stringify({observations:[{exception:{phase:'call',name:'PermissionError'}}]})}])assert.equal(retryableExecution(result),false);
});
