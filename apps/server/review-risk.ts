import {writerWarnings,isTestWriterEvidence} from '../../packages/shared/test-writer.ts';
import {isQualityEvidence,isTamperingEvidence} from '../../packages/shared/quality-gates.ts';
import type {ReviewRisk} from '../../packages/shared/review-risk.ts';
export function reviewRisk(check:Record<string,unknown>|undefined,paths:string[],diff:string,cap={lines:400,files:15}):ReviewRisk {
 let changedLines=0,inHunk=false;for(const line of diff.split('\n')){if(line.startsWith('diff --git '))inHunk=false;else if(line.startsWith('@@ '))inHunk=true;else if(inHunk&&(line.startsWith('+')||line.startsWith('-')))changedLines++;}
 const reasons:string[]=[];if(/GIT binary patch|^Binary files /m.test(diff))reasons.push('Binary diff cannot be measured as changed text lines');
 if(paths.some(p=>/(^|\/)(test_[^/]+|[^/]+_test)\.[^/]+$/.test(p)||/(^|\/)(tests?|__tests__|\.github|\.circleci)(\/|$)|(^|\/)[^/]*[._-](test|spec)\.[^/]+$|(^|\/)(playbook[^/]*|.*lock[^/]*|Jenkinsfile|\.gitlab-ci\.yml)$/i.test(p)))reasons.push('Tests, playbook, CI or lockfiles changed');
 if(changedLines>cap.lines||paths.length>cap.files)reasons.push('Diff exceeds '+cap.lines+' lines or '+cap.files+' files');
 if(isTamperingEvidence(check?.testTampering)&&check.testTampering.status!=='CLEAR')reasons.push(check.testTampering.status==='FLAGGED'?'Test-tampering flag':'Test-tampering check unavailable');
 if(isTestWriterEvidence(check?.testWriter)&&writerWarnings(check.testWriter).length)reasons.push('Independent test fails on this change');
 const gates=isQualityEvidence(check?.qualityGates)?check.qualityGates.gates:undefined;
 if(gates?.some(g=>g.status==='FAIL'||g.findings.length>0))reasons.push('New quality-gate finding');
 if(check?.verdict==='FAILED')reasons.push('Protected checks failed');
 const color:ReviewRisk['color']=reasons.length?'RED':check?.verdict==='VERIFIED'&&Array.isArray(check.gaps)&&check.gaps.length===0&&gates?.length&&gates.every(g=>g.status==='PASS')&&isTamperingEvidence(check.testTampering)&&check.testTampering.status==='CLEAR'?'GREEN':'AMBER';
 return {color,reason:reasons.join('; ')||(color==='GREEN'?'Protected checks and gates passed; no flags; small diff.':'Checks have gaps or incomplete evidence; inspect the diff.'),files:paths.length,changedLines,cap};
}
