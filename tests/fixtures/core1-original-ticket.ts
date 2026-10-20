// Verbatim policy blocks from 3c94150; generation provenance is in artifacts/core1/original-policy-source.json.
import type {V1Report} from '../../packages/shared/verification-v1.ts';
import type {Outcome} from '../../packages/shared/verdict-core.ts';
export function originalTicketResult(result:V1Report){const request={id:'fixture'},evidence={hash:'fixture'},view={error:null as string|null};
  if(result.verdict==='ERROR'){if(result.layers[0]?.status==='PASS'&&result.layers[1]?.gaps.some(g=>g.id==='project-recipes'))return {verdict:'NOT CHECKED',gaps:result.gaps.map(g=>g.reason),failures:[],verificationId:request.id,evidenceHash:evidence.hash};throw Error(view.error??result.layers.flatMap(l=>l.gaps.map(g=>g.reason)).join('; ')??'Checker harness error');}
  return {...(result.testWriter?{testWriter:result.testWriter}:{}),verdict:result.verdict,gaps:result.gaps.map(g=>g.id+': '+g.reason),failures:result.layers.flatMap(l=>l.checks.filter(c=>c.status==='FAIL').map(c=>c.id+': '+(c.reason??'protected assertion failed'))),verificationId:request.id,evidenceHash:evidence.hash};
}
export function originalCombine(native:Outcome,project:Outcome){const approved={hash:'fixture'};
if(native.verdict==='FAILED')return {...native,playbookHash:approved.hash};
return {...native,...project,verdict:project.verdict==='FAILED'?'FAILED':native.verdict==='NOT CHECKED'?'NOT CHECKED':project.verdict,gaps:[...native.gaps.map(g=>'Existing verifier: '+g),...project.gaps],failures:[...native.failures,...project.failures]};
}
