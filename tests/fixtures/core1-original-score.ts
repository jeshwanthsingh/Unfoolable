import type {V1Layer,V1Gap,V1Verdict} from '../../packages/shared/verification-v1.ts';
export function originalScoreV1(layers:V1Layer[],gaps:V1Gap[]=[]):{verdict:V1Verdict;canLand:boolean}{
 const complete=[1,2,3].every(layer=>layers.filter(l=>l.layer===layer).length===1)&&layers.length===3;
 const errors=layers.some(l=>l.status==='ERROR'||l.checks.some(c=>c.status==='ERROR'));
 const failures=layers.some(l=>l.status==='FAIL'||l.checks.some(c=>c.status==='FAIL'));
 const gates=layers.filter(l=>l.layer===1||l.layer===2).every(l=>l.status==='PASS'&&l.checks.length>0&&l.checks.every(c=>c.status==='PASS'||l.layer===2&&c.status==='NOT CHECKED'&&c.baseStatus==='FAIL'));
 if(!complete||errors)return {verdict:'ERROR',canLand:false};
 if(failures||!gates)return {verdict:'FAILED',canLand:false};
 const hasGaps=gaps.length>0||layers.some(l=>l.gaps.length>0||l.status==='NOT CHECKED'||l.checks.some(c=>c.status==='NOT CHECKED'&&!(l.layer===2&&c.baseStatus==='FAIL')));
 return {verdict:hasGaps?'PASSED WITH GAPS':'VERIFIED',canLand:true};
}
