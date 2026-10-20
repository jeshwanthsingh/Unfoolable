import {createHash,createPublicKey,verify,type KeyObject} from 'node:crypto';
export const PAYLOAD_TYPE='application/vnd.in-toto+json';
export const PREDICATE_TYPE='https://github.com/jeshwanthsingh/Unfoolable/attestation/verdict/v1';
export const sha256=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
/** DSSE v1 PAE counts bytes, not Unicode characters. */
export function pae(type:string,payload:Buffer){const t=Buffer.from(type);return Buffer.concat([Buffer.from('DSSEv1 '+t.length+' '),t,Buffer.from(' '+payload.length+' '),payload]);}
export function publicKeyId(publicKey:string|KeyObject){return sha256(createPublicKey(publicKey).export({format:'der',type:'spki'}));}
export type AttestationFacts={ticketId:string;eventId:number;verdict:string;factsHash:string;snapshotHash:string;traceHash:string;coreVersion:string;coreSourceHash:string;baseCommit:string;candidateCommit:string;candidateDiffHash:string;gateToolVersions:unknown;time:string;eventHash:string};
export type Envelope={payloadType:string;payload:string;signatures:{keyid:string;sig:string}[]};
export function createAttestation(facts:AttestationFacts,signer:{publicKey:string;sign:(bytes:Buffer)=>Buffer}):Envelope{
 const payload=Buffer.from(JSON.stringify({_type:'https://in-toto.io/Statement/v1',subject:[{name:facts.candidateCommit,digest:{sha256:facts.candidateDiffHash}}],predicateType:PREDICATE_TYPE,predicate:facts}));
 return {payloadType:PAYLOAD_TYPE,payload:payload.toString('base64'),signatures:[{keyid:publicKeyId(signer.publicKey),sig:signer.sign(pae(PAYLOAD_TYPE,payload)).toString('base64')}]};
}
export function verifyAttestation(envelope:Envelope,publicKey:string,expected:{ticketId:string;eventId:number}):AttestationFacts{
 if(envelope.payloadType!==PAYLOAD_TYPE||!Array.isArray(envelope.signatures)||envelope.signatures.length!==1)throw Error('Seal envelope changed');
 const payload=Buffer.from(envelope.payload,'base64'),signature=envelope.signatures[0]!;
 if(signature.keyid!==publicKeyId(publicKey)||payload.toString('base64')!==envelope.payload||!verify('sha256',pae(envelope.payloadType,payload),publicKey,Buffer.from(signature.sig,'base64')))throw Error('Seal signature is invalid');
 const statement=JSON.parse(payload.toString('utf8')),p=statement.predicate as AttestationFacts;
 if(statement._type!=='https://in-toto.io/Statement/v1'||statement.predicateType!==PREDICATE_TYPE||p.ticketId!==expected.ticketId||p.eventId!==expected.eventId||statement.subject?.length!==1||statement.subject[0].name!==p.candidateCommit||statement.subject[0].digest?.sha256!==p.candidateDiffHash)throw Error('Seal belongs to another record');
 return p;
}
