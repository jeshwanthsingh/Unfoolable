import test from 'node:test';import assert from 'node:assert/strict';import fc from 'fast-check';
import {reviewRisk} from '../apps/server/review-risk.ts';import {validatePlaybookDefinition} from '../apps/server/project-playbooks.ts';
const clean=()=>({verdict:'VERIFIED',gaps:[],qualityGates:{version:'quality-gates-v1',base:'base',candidate:'candidate',durationMs:1,gates:[{gate:'ruff',status:'PASS',findings:[],baselineCount:0,durationMs:1}]},testTampering:{status:'CLEAR',flags:[],durationMs:1}});
const definition=()=>({version:'project-playbook-v1',setup:null,tests:[{argv:['python3','-m','unittest'],cwd:'.'}],runner:'unittest',env:{CI:'1'},timeoutSeconds:180,knownFailingTests:[],knownFlakyTests:[],notes:[]});
test('approved path rules add a plain red reason and never lower existing review risk',()=>{
 const risk=reviewRisk(clean(),['auth/login.py'],'',undefined,undefined,{rules:[{path:'auth/**',raiseTo:'RED',message:'Authentication changed; review carefully.'}]});
 assert.equal(risk.color,'RED');assert.match(risk.reason,/Authentication changed/);
 const floor=reviewRisk({...clean(),verdict:'FAILED'},['README.md'],'',undefined,undefined,{rules:[{path:'**',kind:'comment/docs-only',raiseTo:'GREEN',message:'Documentation only.'}]});assert.equal(floor.color,'RED');
});
test('playbook validates bounded declarative rules and preserves old definitions exactly',()=>{
 const old=definition();assert.deepEqual(validatePlaybookDefinition(old),old);
 const next={...old,riskRules:[{path:'auth/**',kind:'logic',raiseTo:'RED',message:'Authentication logic changed.'}]};assert.deepEqual(validatePlaybookDefinition(next).riskRules,next.riskRules);
 for(const rule of [{path:'../secret',raiseTo:'RED',message:'Bad'},{path:'**',raiseTo:'BLUE',message:'Bad'},{path:'**',kind:'comment/docs-only',raiseTo:'RED',message:'Bad'}])assert.throws(()=>validatePlaybookDefinition({...old,riskRules:[rule]}));
});
test('project rules never improve the existing color over thousands of combinations',()=>{
 const rank={GREEN:0,AMBER:1,RED:2};fc.assert(fc.property(fc.boolean(),fc.boolean(),fc.constantFrom('RED','AMBER','GREEN'),(failed,gap,color)=>{
  const check={...clean(),verdict:failed?'FAILED':gap?'PASSED WITH GAPS':'VERIFIED',gaps:gap?['unknown']:[]};
  const base=reviewRisk(check,['src/main.py'],'');const result=reviewRisk(check,['src/main.py'],'',undefined,undefined,{rules:[{path:'**',...(color==='GREEN'?{kind:'comment/docs-only' as const}:{}),raiseTo:color,message:'Approved project review rule.'}]});assert.ok(rank[result.color]>=rank[base.color]);
 }),{numRuns:5000});
});

test('project rules are bounded approval data; malformed and executable definitions are refused',()=>{
 const rule={id:'no-db-in-ui',path:'ui/**',language:'python',pattern:'import db',message:'Do not import the database here.'};
 assert.deepEqual(validatePlaybookDefinition({...definition(),projectRules:[rule]}).projectRules,[rule]);
 for(const bad of [null,{...rule,path:'../secret'},{...rule,argv:['curl']},{...rule,patternRegex:'.*'},{...rule,language:'bash'}])assert.throws(()=>validatePlaybookDefinition({...definition(),projectRules:[bad]}));
});
