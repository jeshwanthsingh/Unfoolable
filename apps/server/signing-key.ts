import {generateKeyPairSync,createPublicKey} from 'node:crypto';import {mkdirSync,existsSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {assertDataEntry} from './data-mode.ts';
export const SIGNING_MODE='P256_FILE_FALLBACK';
export const SIGNING_REASON='Secure Enclave feasibility probe could not compile: this Mac has not accepted the Xcode licence. No licence or entitlement was changed.';
export function signingKey(dataDir:string){
 const folder=join(dataDir,'signing');assertDataEntry(folder,'directory');mkdirSync(folder,{recursive:true,mode:0o700});if((lstatSync(folder).mode&0o077)!==0)throw Error('Signing folder must be private (0700)');const keyPath=join(folder,'private.pem'),publicPath=join(folder,'public.pem');assertDataEntry(keyPath,'file');assertDataEntry(publicPath,'file');
 if(!existsSync(keyPath)){if(existsSync(publicPath))throw Error('Signing key missing; refusing silent rotation');const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});writeFileSync(keyPath,pair.privateKey.export({format:'pem',type:'pkcs8'}),{flag:'wx',mode:0o600});writeFileSync(publicPath,pair.publicKey.export({format:'pem',type:'spki'}),{flag:'wx',mode:0o444});writeFileSync(join(folder,'mode.json'),JSON.stringify({mode:SIGNING_MODE,reason:SIGNING_REASON}),{flag:'wx',mode:0o400});}
 if((lstatSync(keyPath).mode&0o777)!==0o600)throw Error('Signing key must be private (0600)');const publicKey=readFileSync(publicPath,'utf8');if(createPublicKey(readFileSync(keyPath)).export({format:'pem',type:'spki'}).toString()!==publicKey)throw Error('Signing key identity changed');
 const helper=(existsSync(fileURLToPath(new URL('../../scripts/seal-helper.mjs',import.meta.url)))?fileURLToPath(new URL('../../scripts/seal-helper.mjs',import.meta.url)):join(process.cwd(),'scripts/seal-helper.mjs'));
 return {publicKey,keyPath,mode:SIGNING_MODE,sign:(bytes:Buffer)=>Buffer.from(execFileSync(process.execPath,[helper,keyPath],{input:bytes,timeout:5000,maxBuffer:8192,env:{PATH:'/usr/bin:/bin',HOME:folder,TMPDIR:folder,LANG:'C',TZ:'UTC'}}).toString(),'base64')};
}
