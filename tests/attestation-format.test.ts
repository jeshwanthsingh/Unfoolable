import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';import {pae,createAttestation,verifyAttestation,type AttestationFacts} from '../apps/server/attestation-format.ts';
const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicKey=keys.publicKey.export({format:'pem',type:'spki'}).toString();
const facts:AttestationFacts={ticketId:'ticket-a',eventId:3,verdict:'NOT CHECKED',factsHash:'a'.repeat(64),snapshotHash:'b'.repeat(64),traceHash:'c'.repeat(64),coreVersion:'verdict-core-v1',coreSourceHash:'d'.repeat(64),baseCommit:'e'.repeat(40),candidateCommit:'f'.repeat(40),candidateDiffHash:'1'.repeat(64),gateToolVersions:[],time:'2026-10-20T00:00:00Z',eventHash:'2'.repeat(64)};
const make=()=>createAttestation(facts,{publicKey,sign:b=>sign('sha256',b,keys.privateKey)});
test('DSSE PAE uses byte lengths and unambiguous separators',()=>{assert.equal(pae('é',Buffer.from('abc')).toString(),'DSSEv1 2 é 3 abc');});
test('in-toto v1 signature binds all facts and exact ticket/event; swapped or edited payload fails',()=>{const e=make();assert.deepEqual(verifyAttestation(e,publicKey,{ticketId:'ticket-a',eventId:3}),facts);for(const change of [{verdict:'VERIFIED'},{factsHash:'0'.repeat(64)},{eventId:4},{ticketId:'ticket-b'}]){const statement=JSON.parse(Buffer.from(e.payload,'base64').toString());Object.assign(statement.predicate,change);assert.throws(()=>verifyAttestation({...e,payload:Buffer.from(JSON.stringify(statement)).toString('base64')},publicKey,{ticketId:'ticket-a',eventId:3}));}assert.throws(()=>verifyAttestation(e,publicKey,{ticketId:'other',eventId:3}));assert.throws(()=>verifyAttestation({...e,payloadType:'other'},publicKey,{ticketId:'ticket-a',eventId:3}));});

test('v2 binds the request and trusted Builder identity; old v1 remains verifiable',()=>{
 const builder={model:'gpt-6.1-sol',modelVersion:'unknown',codexCliVersion:'0.160.0',source:'certified-runtime' as const};
 const v2={...facts,formatVersion:2 as const,requestHash:'3'.repeat(64),builder};const e=createAttestation(v2,{publicKey,sign:b=>sign('sha256',b,keys.privateKey)});
 const statement=JSON.parse(Buffer.from(e.payload,'base64').toString());assert.match(statement.predicateType,/\/v2$/);assert.deepEqual(verifyAttestation(e,publicKey,{ticketId:facts.ticketId,eventId:3}),v2);
 assert.deepEqual(verifyAttestation(make(),publicKey,{ticketId:facts.ticketId,eventId:3}),facts);
 for(const change of [{requestHash:'4'.repeat(64)},{builder:{...builder,model:'other'}}]){const p=structuredClone(statement);Object.assign(p.predicate,change);assert.throws(()=>verifyAttestation({...e,payload:Buffer.from(JSON.stringify(p)).toString('base64')},publicKey,{ticketId:facts.ticketId,eventId:3}));}
});
