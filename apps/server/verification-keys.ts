import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {publicKeyId,type Envelope,type AttestationFacts,verifyAttestation} from './attestation-format.ts';
export type VerificationKey={id:string;publicKey:string;validFrom:string;validUntil:string|null;mode:string;status?:'ACTIVE'|'RETIRED'|'REVOKED'};
export type VerificationKeys={current:string;keys:VerificationKey[]};
export function loadVerificationKeys():VerificationKeys{
 const url=new URL('../../docs/VERIFY_KEYS.json',import.meta.url);
 return JSON.parse(readFileSync(existsSync(url)?url:join(process.cwd(),'docs/VERIFY_KEYS.json'),'utf8')) as VerificationKeys;
}
/** Key lifetimes are inclusive at creation and exclusive at retirement. */
export function verifyWithKeyHistory(envelope:Envelope,history:VerificationKeys,expected:{ticketId:string;eventId:number}):AttestationFacts{
 const key=history.keys.find(k=>k.id===envelope.signatures?.[0]?.keyid);
 if(!key||publicKeyId(key.publicKey)!==key.id)throw Error('Seal signing key is unknown');
 if(key.status==='REVOKED')throw Error('Seal signing key is revoked; no timestamp is accepted');
 const facts=verifyAttestation(envelope,key.publicKey,expected),time=Date.parse(facts.time),from=Date.parse(key.validFrom),until=key.validUntil===null?Infinity:Date.parse(key.validUntil);
 if(!Number.isFinite(time)||!Number.isFinite(from)||!(until>from)||time<from||time>=until)throw Error('Seal signing time is outside key validity');
 return facts;
}
