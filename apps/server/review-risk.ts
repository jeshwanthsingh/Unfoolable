import {matchesGlob} from 'node:path';
import {isChangeClassification} from '../../packages/shared/change-classification.ts';
import type {ReviewRiskRule} from '../../packages/shared/review-risk.ts';
import {writerWarnings,isTestWriterEvidence} from '../../packages/shared/test-writer.ts';
import {isQualityEvidence,isTamperingEvidence} from '../../packages/shared/quality-gates.ts';
import type {ReviewRisk} from '../../packages/shared/review-risk.ts';
export function reviewRisk(check:Record<string,unknown>|undefined,paths:string[],diff:string,cap={lines:400,files:15},existingTests?:Record<string,boolean>,policy?:{classification?:unknown;rules?:ReviewRiskRule[]}):ReviewRisk {
 let changedLines=0,inHunk=false;for(const line of diff.split('\n')){if(line.startsWith('diff --git '))inHunk=false;else if(line.startsWith('@@ '))inHunk=true;else if(inHunk&&(line.startsWith('+')||line.startsWith('-')))changedLines++;}
 const reasons:string[]=[];if(/GIT binary patch|^Binary files /m.test(diff))reasons.push('Binary diff cannot be measured as changed text lines');
 const isTest=(p:string)=>/(^|\/)(test_[^/]+|[^/]+_test)\.[^/]+$|(^|\/)(tests?|__tests__)(\/|$)|(^|\/)[^/]*[._-](test|spec)\.[^/]+$/i.test(p);
 const additiveTests=paths.filter(isTest);
 const blocks=diff.split(/(?=^diff --git )/m);
 const additionsOnly=(path:string)=>{const block=blocks.find(b=>b.split('\n').some(l=>l==='+++ b/'+path||l==='+++ '+JSON.stringify('b/'+path))||b.startsWith('diff --git a/'+path+' b/'+path+'\n'));return !!block&&(/^@@ /m.test(block)||/^new file mode /m.test(block))&&!block.slice(block.indexOf('@@ ')).split('\n').some(l=>l.startsWith('-'));};
 const changedExistingTests=additiveTests.some(p=>!additionsOnly(p)||existingTests?.[p]===false);
 if(changedExistingTests)reasons.push('Existing tests changed or could not be confirmed unchanged');
 if(paths.some(p=>/(^|\/)(\.github|\.circleci)(\/|$)|(^|\/)(playbook[^/]*|.*lock[^/]*|Jenkinsfile|\.gitlab-ci\.yml)$/i.test(p)))reasons.push('Playbook, CI or lockfiles changed');
 if(changedLines>cap.lines||paths.length>cap.files)reasons.push('Diff exceeds '+cap.lines+' lines or '+cap.files+' files');
 if(isTamperingEvidence(check?.testTampering)&&check.testTampering.status!=='CLEAR')reasons.push(check.testTampering.status==='FLAGGED'?'Test-tampering flag':'Test-tampering check unavailable');
 if(isTestWriterEvidence(check?.testWriter)&&writerWarnings(check.testWriter).length)reasons.push('Independent test fails on this change');
 const gates=isQualityEvidence(check?.qualityGates)?check.qualityGates.gates:undefined;
 if(gates?.some(g=>g.status==='FAIL'||g.findings.length>0))reasons.push('New quality-gate finding');
 if(check?.verdict==='FAILED')reasons.push('Protected checks failed');
 let color:ReviewRisk['color']=reasons.length?'RED':!additiveTests.length&&check?.verdict==='VERIFIED'&&Array.isArray(check.gaps)&&check.gaps.length===0&&gates?.length&&gates.every(g=>g.status==='PASS')&&isTamperingEvidence(check.testTampering)&&check.testTampering.status==='CLEAR'?'GREEN':'AMBER';
 const rank={GREEN:0,AMBER:1,RED:2};
 for(const rule of policy?.rules??[]){
  const report=isChangeClassification(policy?.classification)?policy.classification:null;
  const matched=paths.some(path=>matchesGlob(path,rule.path)&&(!rule.kind||(report?report.files.find(f=>f.path===path)?.hunks.some(h=>h.kind===rule.kind):rule.kind==='logic')));
  if(!matched)continue;
  if(rank[rule.raiseTo]>rank[color])color=rule.raiseTo;
  if(rule.raiseTo!=='GREEN')reasons.push('Project rule: '+rule.message);
 }
 return {color,reason:reasons.join('; ')||(color==='GREEN'?'Protected checks and gates passed; no flags; small diff.':additiveTests.length?'New tests or test cases added; inspect the diff.':'Checks have gaps or incomplete evidence; inspect the diff.'),files:paths.length,changedLines,cap};
}
