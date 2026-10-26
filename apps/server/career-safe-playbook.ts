import type {ProjectPlaybookDefinition} from '../../packages/shared/playbooks.ts';

export const CAREER_CHECK_IDS = ['liveness.syntax', 'liveness.expired-apply', 'liveness.active-workday', 'liveness.expired-url', 'liveness.listing-only'];
// Protected command data, not a test file the Candidate can edit. Inputs are synthetic.
const inputs = [
 {finalUrl:'https://example.com/jobs/closed',bodyText:'Company Careers\nApply\nThe job you are looking for is no longer open.',applyControls:[]},
 {finalUrl:'https://example.workday.com/job/123',bodyText:'663 JOBS FOUND\nSenior Engineer\nSynthetic job description.',applyControls:['Apply for this Job']},
 {finalUrl:'https://example.com/job?error=true',bodyText:'Synthetic content',applyControls:['Apply']},
 {finalUrl:'https://example.com/jobs',bodyText:'663 JOBS FOUND',applyControls:[]},
];
// Only inert JSON crosses the boundary. Candidate imports never reach parent assert/reporting.
const observe = `const fs=require('node:fs');const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
(async()=>{const candidate=await import(require('node:url').pathToFileURL(require('node:path').resolve('liveness-core.mjs')).href);
const data=inputs.map(input=>candidate.classifyLiveness(input));process.stdout.write(JSON.stringify(data));})().catch(()=>{process.exitCode=1;});`;
const checks = `const {strict:assert}=require('node:assert');
const {execFileSync}=require('node:child_process');
const rows=[];let data;
const check=(id,fn)=>{try{fn();rows.push({id,status:'PASS'});}catch{rows.push({id,status:'FAIL'});}};
check('liveness.syntax',()=>execFileSync(process.execPath,['--check','liveness-core.mjs'],{stdio:'pipe',timeout:10000}));
try{data=JSON.parse(execFileSync(process.execPath,['-e',${JSON.stringify(observe)}],{input:${JSON.stringify(JSON.stringify(inputs))},encoding:'utf8',timeout:10000,maxBuffer:65536}));
if(!Array.isArray(data)||data.length!==4||data.some(row=>!row||typeof row!=='object'||typeof row.result!=='string'))data=undefined;}catch{}
${CAREER_CHECK_IDS.slice(1).map((id,index)=>`check('${id}',()=>assert.equal(data?.[${index}]?.result,'${index===1?'active':'expired'}'));`).join('\n')}
console.log('CC_CHECKS_JSON: '+JSON.stringify({testsRun:rows.length,tests:rows}));
process.exitCode=rows.some(r=>r.status!=='PASS')?1:0;`;

/** Immutable legacy approvals are retained, but cannot execute the superseded shared checker. */
export function currentCareerChecks(definition:ProjectPlaybookDefinition){
 const reserved=definition.tests.some(c=>c.report?.expectedTestIds.some(id=>CAREER_CHECK_IDS.includes(id)));
 const expected=careerSafePlaybook().tests[0]!;return !reserved||(definition.tests.length===1&&definition.tests[0]!.cwd===expected.cwd&&JSON.stringify(definition.tests[0]!.argv)===JSON.stringify(expected.argv));
}

export function careerSafePlaybook(): ProjectPlaybookDefinition {
  return {
    version: 'project-playbook-v1', exportFiles: ['liveness-core.mjs'], setup: null,
    tests: [{argv: ['node', '-e', checks], cwd: '.', report: {format: 'cc-checks-v1', expectedTestIds: [...CAREER_CHECK_IDS]}}],
    env: {HOST: '127.0.0.1', BIND_ADDRESS: '127.0.0.1', CI: '1'}, runner: 'node-script', timeoutSeconds: 30,
    knownFailingTests: [], knownFlakyTests: [],
    notes: ['This small proposal checks only the liveness classifier: its JavaScript syntax and four made-up page examples (closed page, active job, expired URL and listing page). CC exports only liveness-core.mjs; no tracker, applications, profile files or operational scripts are copied or run. The candidate classifier runs in a bounded child process that returns JSON; assertions and the five-check report remain in the trusted parent. The protected command must report exactly five named checks; missing, zero, skipped or mismatched counts cannot pass. BASE must pass before the checks count. This does not check dashboard compilation, tracker merging or personal-data correctness. Approval is still required.'],
  };
}
