import {fixtureApprovalsEnabled} from './data-mode.ts';
import {loadVerificationKeys,verifyWithKeyHistory,type VerificationKeys} from './verification-keys.ts';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import type {DatabaseSync} from 'node:sqlite';
import {scoreVerdict,CORE_VERSION} from '../../packages/shared/verdict-core.ts';import {loadVerdictSnapshot,type VerdictSnapshotRef} from './verdict-snapshot.ts';
import {createAttestation,publicKeyId,sha256} from './attestation-format.ts';import {signingKey} from './signing-key.ts';import {verifyEventChain} from './event-chain.ts';
const directories=new WeakMap<DatabaseSync,string>();
export function registerVerdictSealing(db:DatabaseSync,dataDir:string){directories.set(db,dataDir);}
const coreHash=()=>sha256(readFileSync(new URL('../../packages/shared/verdict-core'+(import.meta.url.endsWith('.ts')?'.ts':'.js'),import.meta.url)));
/** Trusted shell only. No agent tool or API can sign; failures never rewrite the core verdict. */
export function sealCheckEvent(db:DatabaseSync,id:string,eventId:number,data:Record<string,unknown>,time:string){
 const dir=directories.get(db);if(!dir||!data.verdictSnapshot)return false;
 try{const snapshot=loadVerdictSnapshot(data.verdictSnapshot as VerdictSnapshotRef),decision=scoreVerdict(snapshot.facts);if(decision.verdict!==data.verdict||JSON.stringify(decision)!==JSON.stringify(snapshot.decision))throw Error('Stored facts do not reproduce the check');
 const ticket=db.prepare('SELECT * FROM tickets WHERE id=?').get(id)!;const frozen=db.prepare("SELECT data_json FROM ticket_events WHERE ticket_id=? AND kind='candidate_frozen' AND sequence<? ORDER BY sequence DESC LIMIT 1").get(id,eventId);const candidate=frozen?JSON.parse(String(frozen.data_json)).candidate:null;
 if(candidate&&candidate.commit!==data.candidate)throw Error('Frozen change does not match this check');
 const chain=db.prepare('SELECT event_hash FROM event_chain WHERE sequence=?').get(eventId);if(!chain)throw Error('Event is not in the hash chain');
 const versionsUrl=new URL('../../artifacts/quality-gates/TOOLS.json',import.meta.url);const versions=JSON.parse(readFileSync(existsSync(versionsUrl)?versionsUrl:join(process.cwd(),'artifacts/quality-gates/TOOLS.json'),'utf8'));
 const diff=candidate?readFileSync(candidate.diffPath):Buffer.alloc(0),diffHash=sha256(diff);mkdirSync(join(dir,'sealed-diffs'),{recursive:true,mode:0o700});const diffFile=join(dir,'sealed-diffs',diffHash+'.patch');if(!existsSync(diffFile))writeFileSync(diffFile,diff,{flag:'wx',mode:0o400});if(sha256(readFileSync(diffFile))!==diffHash)throw Error('Stored diff changed');
 const envelope=createAttestation({ticketId:id,eventId,verdict:String(data.verdict),factsHash:sha256(JSON.stringify(snapshot.facts)),snapshotHash:(data.verdictSnapshot as VerdictSnapshotRef).hash,traceHash:sha256(JSON.stringify(decision.trace)),coreVersion:snapshot.coreVersion,coreSourceHash:snapshot.coreSourceHash,baseCommit:String(ticket.base_commit),candidateCommit:String(data.candidate??ticket.base_commit),candidateDiffHash:diffHash,gateToolVersions:versions,time,eventHash:String(chain.event_hash)},signingKey(dir));
 db.prepare('INSERT INTO verdict_attestations VALUES(?,?,?)').run(eventId,id,JSON.stringify(envelope));return sha256(JSON.stringify(envelope));
 }catch(error){db.prepare('INSERT INTO seal_errors VALUES(?,?)').run(eventId,(error as Error).message);return false;}
}
export type SealStatus={state:'SEALED'|'BROKEN'|'OLDER'|'UNSEALED';label:string;replays:boolean;eventId:number|null;reason?:string};
export function verifyTicketSeal(db:DatabaseSync,dir:string,id:string):SealStatus{
 const version=Number(db.prepare('SELECT max(version) AS n FROM schema_migrations').get()!.n);
 const checks=db.prepare("SELECT * FROM ticket_events WHERE ticket_id=? AND kind='check_result' ORDER BY sequence").all(id),last=checks.at(-1);
 try{if(version<21)return {state:'OLDER',label:'Not sealed (older than SIGN-1)',replays:false,eventId:last?Number(last.sequence):null};const chain=verifyEventChain(db);if(!last)return {state:'UNSEALED',label:'No check has been sealed',replays:false,eventId:null};let sealed=false;for(const event of checks){const sequence=Number(event.sequence);if(sequence<=chain.legacySequence)continue;
 const row=db.prepare('SELECT * FROM verdict_attestations WHERE event_sequence=?').get(sequence);if(!row)throw Error('Event '+sequence+' has no seal: '+String(db.prepare('SELECT reason FROM seal_errors WHERE event_sequence=?').get(sequence)?.reason??'protected facts unavailable'));
 const data=JSON.parse(String(event.data_json)),p=verifyWithKeyHistory(JSON.parse(String(row.dsse_json)),verificationHistory(dir),{ticketId:id,eventId:sequence});
 if(row.ticket_id!==id||p.verdict!==data.verdict||p.time!==event.created_at||p.baseCommit!==db.prepare('SELECT base_commit FROM tickets WHERE id=?').get(id)?.base_commit||p.candidateCommit!==String(data.candidate??p.baseCommit))throw Error('Event '+sequence+' binding changed');
 const ref=data.verdictSnapshot as VerdictSnapshotRef;if(ref.hash!==p.snapshotHash)throw Error('Stored snapshot reference changed');const snapshot=loadVerdictSnapshot({...ref,path:join(dir,'verdict-facts',ref.hash+'.json')});
 if(sha256(JSON.stringify(snapshot.facts))!==p.factsHash)throw Error('Stored facts hash changed');const decision=scoreVerdict(snapshot.facts);
 if(snapshot.coreVersion!==p.coreVersion||p.coreVersion!==CORE_VERSION||snapshot.coreSourceHash!==p.coreSourceHash||p.coreSourceHash!==coreHash())throw Error('Core version or source changed');
 if(decision.verdict!==p.verdict||sha256(JSON.stringify(decision.trace))!==p.traceHash||JSON.stringify(snapshot.decision)!==JSON.stringify(decision)||data.coreTrace&&sha256(JSON.stringify(data.coreTrace))!==p.traceHash)throw Error('Stored facts no longer replay the same');
 if(p.eventHash!==db.prepare('SELECT event_hash FROM event_chain WHERE sequence=?').get(sequence)?.event_hash)throw Error('Signed event hash changed');
 if(sha256(readFileSync(join(dir,'sealed-diffs',p.candidateDiffHash+'.patch')))!==p.candidateDiffHash)throw Error('Sealed diff changed');
 const frozen=db.prepare("SELECT data_json FROM ticket_events WHERE ticket_id=? AND kind='candidate_frozen' AND sequence<? ORDER BY sequence DESC LIMIT 1").get(id,sequence);const c=frozen?JSON.parse(String(frozen.data_json)).candidate:null;if(c&&existsSync(c.diffPath)&&sha256(readFileSync(c.diffPath))!==p.candidateDiffHash)throw Error('Frozen change diff changed');sealed=true;
 }
 if(Number(last.sequence)<=chain.legacySequence)return {state:'OLDER',label:'Not sealed (older than SIGN-1)',replays:false,eventId:Number(last.sequence)};
 return {state:sealed?'SEALED':'UNSEALED',label:sealed?'Sealed':'Not sealed',replays:sealed,eventId:Number(last.sequence)};
 }catch(error){return {state:'BROKEN',label:'Seal broken',reason:(error as Error).message,replays:false,eventId:last?Number(last.sequence):null};}
}

function verificationHistory(dir:string):VerificationKeys{
 if(fixtureApprovalsEnabled(dir)){
  const key=readFileSync(join(dir,'signing/public.pem'),'utf8'),id=publicKeyId(key);
  return {current:id,keys:[{id,publicKey:key,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null,mode:'ISOLATED_TEST'}]};
 }
 // Published key history verifies old seals even after the local private key is gone.
 return loadVerificationKeys();
}
