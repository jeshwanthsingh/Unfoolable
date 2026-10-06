import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {payloadHash} from '../apps/server/context-observation.ts';
import {validateContractPayload} from '../apps/server/contract-validation.ts';
import {isContractView,type ContractInput,type ContractPayload} from '../packages/shared/contracts.ts';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/contract-quality.json',import.meta.url),'utf8')) as {name:string;input:ContractInput;payload:ContractPayload;expected:{requirementsContain:string[];constraintsContain?:string[];nonGoalsContain?:string[]}}[];
for(const f of fixtures)test('quality: '+f.name,()=>{const result=validateContractPayload(f.payload,f.input);for(const [field,terms] of Object.entries(f.expected)){const section=field.replace('Contain','') as keyof ContractPayload;const values=result[section];const text=(Array.isArray(values)?values:[values]).map(x=>x.text).join(' ');for(const term of terms)assert.match(text,new RegExp(term,'i'));}});
const f=()=>structuredClone(fixtures[0]!);
test('rejects unexpected fields, IDs, blanks, counts and invented sources atomically',()=>{for(const mutate of [(p:any)=>p.extra=true,(p:any)=>p.requirements[0].id='R2',(p:any)=>p.goal.text=' ',(p:any)=>p.goal.sourceIds=[],(p:any)=>p.goal.sourceIds=['intent','intent'],(p:any)=>p.goal.sourceIds=['evidence:invented'],(p:any)=>p.requirements=Array(21).fill(p.requirements[0])]){const {payload,input}=f();mutate(payload);assert.throws(()=>validateContractPayload(payload,input),{code:'INVALID_CONTRACT_OUTPUT'});}});
test('detects unsupported implementation and positive mobile scope, including defaults misuse',()=>{for(const statement of ['Use Redis distributed locks.','Create ApprovalRepository class.','Add table approval_events.','Modify auth.ts line 52.','Run npm test.','Build an iOS approval interface.','Create a mobile interface.','Implementation plan: create services.']){const {payload,input}=f();payload.requirements[0]!.text=statement;assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});}const {payload,input}=f();payload.requirements[0]!.sourceIds=['default:tests'];assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});});
test('explicit cited technology constraint permits constrained behavior',()=>{const {payload,input}=f();input.sources.push({id:'answer:tech',type:'CLARIFICATION_ANSWER',question:'Which lock?',questionId:'tech',updatedAt:'1',text:'Use Redis distributed locks.'});payload.constraints=[{id:'C1',text:'Use Redis distributed locks.',sourceIds:['answer:tech']}];assert.doesNotThrow(()=>validateContractPayload(payload,input));});
test('USER_EDIT requires an authorized server source, never model-provided provenance',()=>{const {payload,input}=f();payload.requirements[0]={id:'R1',text:'Operator denies execution.',sourceIds:['user-edit:R1']};const edits=[{id:'user-edit:R1',type:'USER_EDIT' as const,text:payload.requirements[0].text}];assert.throws(()=>validateContractPayload(payload,input,edits),{code:'INVALID_CONTRACT_OUTPUT'});assert.doesNotThrow(()=>validateContractPayload(payload,input,edits,true));assert.throws(()=>validateContractPayload(payload,input,[{...edits[0]!,text:'different'}],true),{code:'INVALID_CONTRACT_OUTPUT'});});
test('runtime guard rejects malformed view',()=>{assert.equal(isContractView({}),false);assert.equal(isContractView({draft:null,operation:null,accepted:null,current:false,draftStale:false,acceptedStale:false,eligible:true,phase:'CLARIFIED'}),true);assert.equal(isContractView({draft:null,operation:null,accepted:null,current:true,draftStale:false,acceptedStale:false,eligible:true,phase:'CONTRACT_READY'}),false);});

test('an exclusion source does not authorize positive mobile scope',()=>{const {payload,input}=f();payload.requirements[0]={id:'R1',text:'Build a mobile approval interface.',sourceIds:['answer:q2']};assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});});
test('implementation nouns cannot evade the detector by changing verb order',()=>{for(const text of ['Redis distributed locks coordinate approvals.','Create an ApprovalRepository class.','Implement distributed locking using Redis.']){const {payload,input}=f();payload.requirements[0]!.text=text;assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});}});

test('fixtures bind real persisted-style analysis packets and preserve decisions',()=>{const raw=JSON.parse(readFileSync(new URL('./fixtures/contract-quality.json',import.meta.url),'utf8'));for(const f of raw){assert.equal(payloadHash(f.analysis.packet),f.input.bindings.packetHash);assert.equal(f.analysis.id,f.input.bindings.analysisId);assert.equal(f.analysis.snapshotId,f.input.bindings.snapshotId);assert.deepEqual(f.analysis.result.understanding,f.input.understanding);}const compatibility=raw.find((x:any)=>x.name==='compatibility-known');assert.deepEqual(compatibility.payload.constraints[0].sourceIds,['evidence:e1']);const clear=raw.find((x:any)=>x.name==='clear-bug');assert.equal(clear.input.bindings.answers.length,0);assert.equal(clear.analysis.result.questions.length,0);});

test('all four model source kinds retain their exact bound identities',()=>{const {payload,input}=f();payload.requirements[0]!.sourceIds=['intent','evidence:e1','answer:q1'];payload.constraints=input.sources.filter(s=>s.type==='ENGINEERING_DEFAULT').map((s,i)=>({id:'C'+(i+1),text:s.text,sourceIds:[s.id]}));assert.doesNotThrow(()=>validateContractPayload(payload,input));payload.requirements[0]!.sourceIds=['other-mission:answer:q1'];assert.throws(()=>validateContractPayload(payload,input),{code:'INVALID_CONTRACT_OUTPUT'});});
test('performance targets cannot invent a new supplied-workload number',()=>{const {input,payload}=structuredClone(fixtures[1]!);payload.requirements[0]!.text='At 100rps, endpoint p95 must be under 150ms.';assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});});
test('a cited technology exclusion cannot authorize its use as required behavior',()=>{
 const {payload,input}=f();input.sources.push({id:'answer:excluded',type:'CLARIFICATION_ANSWER',text:'No Redis distributed locks; they are out of scope.',questionId:'excluded',question:'Which technologies are excluded?',updatedAt:'1'});
 payload.requirements[0]={id:'R1',text:'Redis distributed locks coordinate approvals.',sourceIds:['answer:excluded']};
 assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});
});
test('a cited implementation prohibition cannot authorize the positive class prescription',()=>{
 const {payload,input}=f();input.sources.push({id:'answer:excluded',type:'CLARIFICATION_ANSWER',text:'Do not create ApprovalRepository class.',questionId:'excluded',question:'Which implementation is excluded?',updatedAt:'1'});
 payload.requirements[0]={id:'R1',text:'Create ApprovalRepository class.',sourceIds:['answer:excluded']};
 assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});
 payload.nonGoals=[{id:'NG1',text:'Create ApprovalRepository class.',sourceIds:['answer:excluded']}];payload.requirements=f().payload.requirements;
 assert.doesNotThrow(()=>validateContractPayload(payload,input));
});
test('percentage targets require a cited percentage rather than an invented number',()=>{
 const {input,payload}=structuredClone(fixtures[1]!);payload.requirements[0]!.text='Improve endpoint p95 by 99%.';
 assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});
 input.sources.find(s=>s.id==='answer:q1')!.text+=' Improve endpoint p95 by 99%.';
 assert.doesNotThrow(()=>validateContractPayload(payload,input));
 input.sources.find(s=>s.id==='answer:q1')!.text='99 rows exist, but no percentage target was chosen.';
 assert.throws(()=>validateContractPayload(payload,input),{code:'UNSUPPORTED_CONTRACT_CLAIM'});
});
test('equivalent numeric unit spelling and spacing preserve the supplied target',()=>{
 const {input,payload}=structuredClone(fixtures[1]!);payload.requirements[0]!.text='At 100 requests per second, endpoint p95 must be under 200 milliseconds.';
 assert.doesNotThrow(()=>validateContractPayload(payload,input));
});
