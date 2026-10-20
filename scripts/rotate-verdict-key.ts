// Explicit local provisioning tool. Never exposed to an agent or HTTP endpoint.
import {readFileSync,writeFileSync,existsSync,mkdirSync,chmodSync,copyFileSync,renameSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';import {execFileSync} from 'node:child_process';import {verify} from 'node:crypto';
import {acquireDatabaseLock} from '../apps/server/database-lock.ts';
import {publicKeyId,pae} from '../apps/server/attestation-format.ts';
import type {VerificationKeys} from '../apps/server/verification-keys.ts';
const [data,binary]=process.argv.slice(2);if(!data||!binary||process.argv.length!==4)throw Error('Usage: node scripts/rotate-verdict-key.ts <data-dir> <compiled-helper>');
const folder=join(resolve(data),'signing');mkdirSync(folder,{recursive:true,mode:0o700});
if(lstatSync(folder).isSymbolicLink()||(lstatSync(folder).mode&0o077)!==0)throw Error('Signing folder must be a real private directory');
const release=acquireDatabaseLock(resolve(data));
try{
const blob=join(folder,'device-key.blob'),helper=join(folder,'enclave-seal');
if(existsSync(blob))throw Error('Hardware key already exists; explicit recovery required, never overwritten');
const registryPath=resolve('docs/VERIFY_KEYS.json');
const oldPublic=readFileSync(resolve('docs/VERIFY_KEY.pem'),'utf8');
const history:VerificationKeys=existsSync(registryPath)?JSON.parse(readFileSync(registryPath,'utf8')):{current:publicKeyId(oldPublic),keys:[{id:publicKeyId(oldPublic),publicKey:oldPublic,validFrom:'1970-01-01T00:00:00.000Z',validUntil:null,mode:'P256_FILE_FALLBACK'}]};
const previous=history.keys.find(k=>k.id===history.current);if(!previous||previous.validUntil!==null)throw Error('Current key history is invalid');
const localPublic=join(folder,'public.pem');if(existsSync(localPublic)&&readFileSync(localPublic,'utf8')!==previous.publicKey)throw Error('Local signing identity differs from published history');
copyFileSync(resolve(binary),helper);chmodSync(helper,0o700);
const publicKey=execFileSync(helper,['create',blob],{encoding:'utf8',timeout:10000}).trim()+'\n';
const bytes=pae('application/vnd.in-toto+json',Buffer.from('{"rotationProbe":true}'));
const signature=Buffer.from(execFileSync(helper,['sign',blob],{input:bytes,timeout:10000}).toString().trim(),'base64');
if(!verify('sha256',bytes,publicKey,signature))throw Error('New hardware signature failed independent verification');
const now=new Date().toISOString();previous.validUntil=now;
const id=publicKeyId(publicKey);history.current=id;history.keys.push({id,publicKey,validFrom:now,validUntil:null,mode:'SECURE_ENCLAVE_P256'});
// The coordinator must be stopped during publication. Private deletion is a separate final step.
for(const [path,body,mode] of [[registryPath,JSON.stringify(history,null,2)+'\n',0o644],[localPublic,publicKey,0o444],[join(folder,'mode.json'),JSON.stringify({mode:'SECURE_ENCLAVE_P256',keyid:id,accessControl:'AfterFirstUnlockThisDeviceOnly + privateKeyUsage; no userPresence or biometrics'})+'\n',0o400]] as const){const temp=path+'.rotation-new';writeFileSync(temp,body,{flag:'wx',mode});renameSync(temp,path);}
console.log(JSON.stringify({previousKeyId:previous.id,currentKeyId:id,rotationTime:now,mode:'SECURE_ENCLAVE_P256',signatureVerified:true,softwarePrivateDeletion:'pending',privateKeyExported:false}));

}finally{release();}
