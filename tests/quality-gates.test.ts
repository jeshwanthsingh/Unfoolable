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
