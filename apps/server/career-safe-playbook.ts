import type {ProjectPlaybookDefinition} from '../../packages/shared/playbooks.ts';

export const CAREER_CHECK_IDS = ['liveness.syntax', 'liveness.expired-apply', 'liveness.active-workday', 'liveness.expired-url', 'liveness.listing-only'];
// Protected command data, not a test file the Candidate can edit. Inputs are synthetic.
const checks = `const {strict:assert}=require('node:assert');
const {execFileSync}=require('node:child_process');
const rows=[];let classify;
const check=(id,fn)=>{try{fn();rows.push({id,status:'PASS'});}catch{rows.push({id,status:'FAIL'});}};
(async()=>{
check('liveness.syntax',()=>execFileSync(process.execPath,['--check','liveness-core.mjs'],{stdio:'pipe',timeout:10000}));
try{classify=(await import(require('node:url').pathToFileURL(require('node:path').resolve('liveness-core.mjs')).href)).classifyLiveness;}catch{}
check('liveness.expired-apply',()=>assert.equal(classify({finalUrl:'https://example.com/jobs/closed',bodyText:'Company Careers\\nApply\\nThe job you are looking for is no longer open.',applyControls:[]}).result,'expired'));
check('liveness.active-workday',()=>assert.equal(classify({finalUrl:'https://example.workday.com/job/123',bodyText:'663 JOBS FOUND\\nSenior Engineer\\nSynthetic job description.',applyControls:['Apply for this Job']}).result,'active'));
check('liveness.expired-url',()=>assert.equal(classify({finalUrl:'https://example.com/job?error=true',bodyText:'Synthetic content',applyControls:['Apply']}).result,'expired'));
check('liveness.listing-only',()=>assert.equal(classify({finalUrl:'https://example.com/jobs',bodyText:'663 JOBS FOUND',applyControls:[]}).result,'expired'));
console.log('CC_CHECKS_JSON: '+JSON.stringify({testsRun:rows.length,tests:rows}));
process.exitCode=rows.some(r=>r.status!=='PASS')?1:0;
})().catch(()=>{process.exitCode=1;});`;

export function careerSafePlaybook(): ProjectPlaybookDefinition {
  return {
    version: 'project-playbook-v1', exportFiles: ['liveness-core.mjs'], setup: null,
    tests: [{argv: ['node', '-e', checks], cwd: '.', report: {format: 'cc-checks-v1', expectedTestIds: [...CAREER_CHECK_IDS]}}],
    env: {HOST: '127.0.0.1', BIND_ADDRESS: '127.0.0.1', CI: '1'}, runner: 'node-script', timeoutSeconds: 30,
    knownFailingTests: [], knownFlakyTests: [],
    notes: ['This small proposal checks only the liveness classifier: its JavaScript syntax and four made-up page examples (closed page, active job, expired URL and listing page). CC exports only liveness-core.mjs; no tracker, applications, profile files or operational scripts are copied or run. The protected command must report exactly five named checks; missing, zero, skipped or mismatched counts cannot pass. BASE must pass before the checks count. This does not check dashboard compilation, tracker merging or personal-data correctness. Approval is still required.'],
  };
}
