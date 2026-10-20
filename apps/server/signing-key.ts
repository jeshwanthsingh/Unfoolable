import {generateKeyPairSync,createPublicKey} from 'node:crypto';import {mkdirSync,existsSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {assertDataEntry,fixtureApprovalsEnabled} from './data-mode.ts';
import {publicKeyId} from './attestation-format.ts';import {loadVerificationKeys} from './verification-keys.ts';
export const SIGNING_MODE='P256_FILE_FALLBACK';
export const SIGNING_REASON='Software P-256 fallback for isolated fixtures or an explicitly retained legacy identity; never silently rotated.';
export function signingKey(dataDir:string){
 const folder=join(dataDir,'signing');assertDataEntry(folder,'directory');mkdirSync(folder,{recursive:true,mode:0o700});if((lstatSync(folder).mode&0o077)!==0)throw Error('Signing folder must be private (0700)');const keyPath=join(folder,'private.pem'),publicPath=join(folder,'public.pem');assertDataEntry(keyPath,'file');assertDataEntry(publicPath,'file');
 const modePath=join(folder,'mode.json');assertDataEntry(modePath,'file');
 const mode=existsSync(modePath)?JSON.parse(readFileSync(modePath,'utf8')).mode:SIGNING_MODE;
 if(mode==='SECURE_ENCLAVE_P256'){
  const blob=join(folder,'device-key.blob'),helper=join(folder,'enclave-seal');
  for(const path of [blob,helper,publicPath]){assertDataEntry(path,'file');if(!existsSync(path))throw Error('Hardware signing identity missing; refusing silent rotation');}
  if((lstatSync(blob).mode&0o777)!==0o600)throw Error('Signing blob must be private (0600)');
  const publicKey=readFileSync(publicPath,'utf8'),history=loadVerificationKeys(),key=history.keys.find(k=>k.id===history.current);
  if(!fixtureApprovalsEnabled(dataDir)&&(!key||key.validUntil!==null||key.publicKey!==publicKey||key.id!==publicKeyId(publicKey)))throw Error('Hardware identity differs from current trusted key');
  return {publicKey,keyPath:blob,mode,sign:(bytes:Buffer)=>Buffer.from(execFileSync(helper,['sign',blob],{input:bytes,timeout:5000,maxBuffer:8192,env:{PATH:'/usr/bin:/bin',HOME:folder,TMPDIR:folder,LANG:'C',TZ:'UTC'}}).toString().trim(),'base64')};
 }
 if(mode!==SIGNING_MODE)throw Error('Unknown signing mode');
 if(!existsSync(keyPath)){if(existsSync(publicPath))throw Error('Signing key missing; refusing silent rotation');const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});writeFileSync(keyPath,pair.privateKey.export({format:'pem',type:'pkcs8'}),{flag:'wx',mode:0o600});writeFileSync(publicPath,pair.publicKey.export({format:'pem',type:'spki'}),{flag:'wx',mode:0o444});writeFileSync(join(folder,'mode.json'),JSON.stringify({mode:SIGNING_MODE,reason:SIGNING_REASON}),{flag:'wx',mode:0o400});}
 if((lstatSync(keyPath).mode&0o777)!==0o600)throw Error('Signing key must be private (0600)');const publicKey=readFileSync(publicPath,'utf8');if(createPublicKey(readFileSync(keyPath)).export({format:'pem',type:'spki'}).toString()!==publicKey)throw Error('Signing key identity changed');
 const helper=(existsSync(fileURLToPath(new URL('../../scripts/seal-helper.mjs',import.meta.url)))?fileURLToPath(new URL('../../scripts/seal-helper.mjs',import.meta.url)):join(process.cwd(),'scripts/seal-helper.mjs'));
 return {publicKey,keyPath,mode:SIGNING_MODE,sign:(bytes:Buffer)=>Buffer.from(execFileSync(process.execPath,[helper,keyPath],{input:bytes,timeout:5000,maxBuffer:8192,env:{PATH:'/usr/bin:/bin',HOME:folder,TMPDIR:folder,LANG:'C',TZ:'UTC'}}).toString(),'base64')};
}
