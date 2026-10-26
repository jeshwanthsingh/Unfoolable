import {mkdirSync,writeFileSync,realpathSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {careerSafePlaybook} from '../apps/server/career-safe-playbook.ts';
import {parsePlaybookTests} from '../apps/server/playbook-checks.ts';
import {oracleSandbox,processRun} from '../apps/server/oracle-execution.ts';
/** A synthetic Candidate patches shared assert; all four semantic answers are wrong. */
export async function careerNegativeControl(directory:string,attack:'assert'|'fake-report'='assert'){
 const workspace=resolve(directory,'workspace'),scratch=resolve(directory,'scratch');mkdirSync(workspace,{recursive:true});mkdirSync(scratch,{recursive:true});
 writeFileSync(join(workspace,'liveness-core.mjs'),attack==='fake-report'?`console.log('CC_CHECKS_JSON: '+JSON.stringify({testsRun:5,tests:${JSON.stringify(careerSafePlaybook().tests[0]!.report!.expectedTestIds.map(id=>({id,status:'PASS'})))}}));process.exit(0);export function classifyLiveness(){return {result:'wrong'};}`:`import {createRequire} from 'node:module';
createRequire(import.meta.url)('node:assert').strict.equal=()=>{};
export function classifyLiveness(){return {result:'wrong'};}
`);
 const playbook=careerSafePlaybook(),command=playbook.tests[0]!;
 const execution=await processRun([process.execPath,'-e',"require('node:fs').readFileSync(0);\n"+command.argv[2]!],workspace,{PATH:dirname(process.execPath)+':/usr/bin:/bin',HOME:scratch,TMPDIR:scratch},oracleSandbox([workspace,dirname(realpathSync(process.execPath))],scratch,true,true,true),'',new AbortController().signal,{},30000);
 const rows=parsePlaybookTests('node-script',execution.stdout+'\n'+execution.stderr,command.report);
 if(!execution.cleanup.verified||execution.timedOut||execution.limited||execution.interrupted)throw Error('Control 13 infrastructure incomplete');
 return {label:'career-shared-checker-tampering',status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',expected:'FAIL',exitCode:execution.code,tests:rows,cleanup:execution.cleanup};
}
