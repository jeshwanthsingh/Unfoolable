import type {PlanningPayload} from '../packages/shared/planning.ts';
// Fixture-specific checks supplement structural coverage; they are not a general semantic evaluator.
export function checkPlanningQuality(name:string,payload:PlanningPayload):boolean{
 const slices=payload.plan.verticalSlices,claims=payload.evaluationContract.claims;
 if(name==='dangerous approval')return slices.length>=2&&claims.some(c=>c.requirementIds.includes('R2'))&&claims.some(c=>c.requirementIds.includes('R3'))&&claims.some(c=>c.requirementIds.includes('R4')&&c.verificationType==='recovery');
 if(name==='clear small bug')return slices.length<=2&&claims.some(c=>c.requirementIds.includes('R1')&&/logical|duplicate|repeat/i.test(c.claim+' '+c.requiredEvidence.join(' ')));
 if(name==='browser confirmation')return slices.some(s=>/cancel/i.test(s.userVisibleFlow.join(' '))&&/confirm/i.test(s.userVisibleFlow.join(' ')))&&claims.some(c=>c.verificationType==='browser');
 if(name==='explicit performance')return claims.some(c=>c.verificationType==='performance'&&/100\s*(?:rps|requests per second)/i.test(c.claim+' '+c.requiredEvidence.join(' '))&&/200\s*(?:ms|milliseconds)/i.test(c.claim+' '+c.requiredEvidence.join(' ')));
 if(name==='existing and new record migration'){const text=claims.map(c=>c.claim+' '+c.requiredEvidence.join(' ')).join(' ');return /existing|old/i.test(text)&&/new/i.test(text);}
 if(name==='cross-cutting compatibility')return claims.some(c=>c.constraintIds.includes('C1')&&/compatib|public API|existing callers|protocol/i.test(c.claim+' '+c.requiredEvidence.join(' ')))&&slices.every(s=>s.requirementIds.includes('R1'))&&slices.length<=2;
 throw new Error('Unknown planning quality fixture.');
}
