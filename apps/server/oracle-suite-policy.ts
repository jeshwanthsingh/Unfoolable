import {lstatSync,readFileSync,realpathSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import type {OracleManifest,OracleRequest,ExcludedSuiteTest} from '../../packages/shared/oracle.ts';
export const brokerExclusion:ExcludedSuiteTest={testId:'test_broker_smoke.BrokerSmokeIntegrationTests.test_broker_examples',reason:'Needs live broker credentials; explicitly excluded by user.'};
export function suiteExclusions(directory:string,expected:string[]):ExcludedSuiteTest[]{return directory==='sdk/python'&&expected.includes(brokerExclusion.testId)?[{...brokerExclusion}]:[];}
export function suiteExactReads(manifest:OracleManifest,requests:OracleRequest[],workspace:string):string[]{
 if(manifest.runner!=='unittest'||manifest.runnerDirectory!=='sdk/python'||!requests.some(r=>r.kind==='SUITE'&&r.excludedTests?.some(e=>e.testId===brokerExclusion.testId&&e.reason===brokerExclusion.reason)))return [];
 if(!existsSync(join(workspace,'tests/test_sdk.py')))return [];
 const test=readFileSync(join(workspace,'tests/test_sdk.py'),'utf8');if(!test.includes('test_receipt_missing_file_returns_none_from_result')||!test.includes('/tmp/definitely-missing.dsse.json'))return [];
 const path=join(realpathSync('/tmp'),'definitely-missing.dsse.json');try{lstatSync(path);throw Error('Missing-receipt fixture exists; exact-path exception refused.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}return [path,'/tmp/definitely-missing.dsse.json'];
}
