import type {ContractPayload} from '../packages/shared/contracts.ts';
// Finite fixture-specific semantic checks, not a general entailment evaluator.
export function checkContractQuality(name:string,payload:ContractPayload):boolean{
 const required=payload.requirements.map(i=>i.text).join(' '),constraints=payload.constraints.map(i=>i.text).join(' '),nonGoals=payload.nonGoals.map(i=>i.text).join(' '),positive=[payload.goal,...payload.requirements,...payload.scope].map(i=>i.text).join(' ');
 if(name==='dangerous-approval')return /single.use|once|one.time/i.test(required)&&/restart/i.test(required)&&!/\bmobile|\bslack/i.test(positive)&&/mobile|slack/i.test(nonGoals);
 if(name==='clarified-performance')return /200\s*ms/i.test(required+' '+constraints)&&/100\s*(?:rps|requests)/i.test(required+' '+constraints)&&!/\b(?:100|50)\s*ms/i.test(JSON.stringify(payload));
 if(name==='compatibility-known')return payload.constraints.some(i=>/compatib|public API|response shape/i.test(i.text)&&i.sourceIds.some(id=>id.startsWith('evidence:')));
 if(name==='clear-bug')return payload.requirements.length<=3&&/once|one|duplicate|repeated.*(?:not|no).*additional/i.test(required)&&!/(?:redesign|mobile|dashboard)/i.test(positive);
 if(name==='migration')return /lowercase|lower.case/i.test(required)&&/retain|keep|preserv/i.test(required)&&/review/i.test(required);
 throw new Error('Unknown contract quality fixture.');
}
