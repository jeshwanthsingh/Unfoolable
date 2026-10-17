import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRisk} from '../apps/server/review-risk.ts';
const clean=()=>({verdict:'VERIFIED',gaps:[],qualityGates:{version:'quality-gates-v1',base:'base',candidate:'candidate',durationMs:1,gates:[{gate:'ruff',status:'PASS',findings:[],baselineCount:4,durationMs:1}]},testTampering:{status:'CLEAR',flags:[],durationMs:1}});
test('green requires complete passing evidence; old baseline warnings do not turn it red',()=>assert.equal(reviewRisk(clean(),['src/main.py'],'+ok').color,'GREEN'));
test('passed with gaps is amber; missing evidence cannot look green',()=>{assert.equal(reviewRisk({...clean(),verdict:'PASSED WITH GAPS',gaps:['not checked']},['src/a.py'],'').color,'AMBER');assert.equal(reviewRisk(undefined,[],'').color,'AMBER');});
for(const path of ['tests/test_a.py','src/a.test.ts','src/a.spec.tsx','.github/workflows/ci.yml','package-lock.json','playbook.json'])test(path+' changes require red review',()=>assert.equal(reviewRisk(clean(),[path],'').color,'RED'));
test('test tampering, gate findings and protected failure are red',()=>{
 assert.equal(reviewRisk({...clean(),testTampering:{status:'FLAGGED',flags:[{path:'a',line:1,reason:'skip'}],durationMs:1}},[],'').color,'RED');
 assert.equal(reviewRisk({...clean(),qualityGates:{...clean().qualityGates,gates:[{gate:'ruff',status:'FAIL',findings:[],baselineCount:0,durationMs:1}]}},[],'').color,'RED');
 assert.equal(reviewRisk({...clean(),verdict:'FAILED'},[],'').color,'RED');
});
test('cap accepts the boundary and rejects either excess',()=>{assert.equal(reviewRisk(clean(),['src/a'],'@@ -1 +1 @@\n'+Array(400).fill('+line').join('\n')).color,'GREEN');assert.equal(reviewRisk(clean(),['src/a'],'@@ -1 +1 @@\n'+Array(401).fill('+line').join('\n')).color,'RED');assert.equal(reviewRisk(clean(),Array.from({length:16},(_,i)=>'src/'+i),'').color,'RED');});

test('custom caps and header-like content inside hunks cannot hide changed lines',()=>{assert.equal(reviewRisk(clean(),['src/a'],'--- a\n+++ b\n@@ -1 +1 @@\n---removed\n+++added',{lines:1,files:1}).color,'RED');assert.equal(reviewRisk(clean(),['src/a'],'@@ -1 +1 @@\n+one\n+two',{lines:2,files:1}).color,'GREEN');});

test('unmeasurable binary changes never look like a small green diff',()=>assert.equal(reviewRisk(clean(),['asset.bin'],'GIT binary patch').color,'RED'));
