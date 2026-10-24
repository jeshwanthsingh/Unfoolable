import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import test from 'node:test';import assert from 'node:assert/strict';
import {changedLines,newQualityFindings,proposeQualityGates} from '../apps/server/quality-gates.ts';
test('quality gates count only new diagnostics on changed lines, never old warnings',()=>{
 const changed=changedLines('+++ b/a.py\n@@ -1 +1,3 @@\n');const old={path:'a.py',line:1,rule:'F401',message:'unused import'};
 assert.deepEqual(newQualityFindings([old],[{...old,line:2}],changed),[]);
 assert.deepEqual(newQualityFindings([old],[old,{...old,line:3,message:'new problem'},{...old,line:8,message:'unchanged'}],changed),[{...old,line:3,message:'new problem'}]);
});
test('gate proposals use ESLint only with repo config and preserve language boundaries',()=>{
 assert.ok(proposeQualityGates(['app.py']).includes('bandit'));assert.ok(!proposeQualityGates(['app.py']).includes('tsc'));
 assert.ok(proposeQualityGates(['a.ts','tsconfig.json']).includes('oxlint'));
 const gates=proposeQualityGates(['frontend/a.ts','frontend/eslint.config.mjs','frontend/tsconfig.json']);assert.ok(gates.includes('eslint'));assert.ok(!gates.includes('oxlint'));assert.ok(gates.includes('tsc'));
});

import {isReviewEvidence} from '../packages/shared/quality-gates.ts';
test('review boundary rejects malformed diagnostics rather than hiding or inventing a result',()=>{assert.equal(isReviewEvidence({mutationCoverage:'Not measured',qualityGates:{version:'quality-gates-v1',base:'a',candidate:'b',durationMs:1,gates:[{gate:'ruff',status:'PASS',findings:'missing',baselineCount:0,durationMs:1}]}}),false);assert.equal(isReviewEvidence({mutationCoverage:'Not measured'}),true);});

import {ticketPlaybookHooks} from '../apps/server/ticket-playbook-hooks.ts';
test('passing project/quality gates cannot overwrite NOT CHECKED from the protected checker',async()=>{
 const playbook={hash:'approved',definition:{runner:'unittest'}};
 const project={verdict:'PASSED WITH GAPS',gaps:[],failures:[]};
 const checks:any={store:{requireApproved:()=>playbook},check:async()=>project};
 const native:any=async()=>({verdict:'NOT CHECKED',gaps:['Required project recipe unavailable'],failures:[]});
 const hooks=ticketPlaybookHooks(checks,native);
 const dir=mkdtempSync(join(tmpdir(),'cc-combine-unit-')),diffPath=join(dir,'change.patch');writeFileSync(diffPath,'');
 const result=await hooks.check!({repoPath:'fixture',baseCommit:'base'} as any,{repo:'fixture',commit:'candidate',paths:[],diffPath} as any,new AbortController().signal);
 assert.equal(result.verdict,'NOT CHECKED');assert.ok(result.gaps.some(g=>g.includes('recipe unavailable')));rmSync(dir,{recursive:true,force:true});
});

test('changed-line filtering accepts Unicode paths and refuses unsupported quoted paths instead of silently passing',()=>{const unicode=changedLines('+++ b/café.py\n@@ -1 +1 @@\n');assert.ok(unicode.get('café.py')?.has(1));assert.throws(()=>changedLines('+++ "b/quoted-path.py"\n@@ -1 +1 @@\n'),/explicit review/);});
