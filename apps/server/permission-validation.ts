import {createHash} from 'node:crypto';
import {lstatSync,realpathSync} from 'node:fs';
import {basename,dirname,join,resolve} from 'node:path';
import {BuildError} from './build-errors.ts';
import {sanitizeBuildValue} from './build-protocol.ts';
import type {PermissionEnvelope} from '../../packages/shared/permissions.ts';
const reject=():never=>{throw new BuildError('UNSUPPORTED_PERMISSION','Only an exact single-file write in this Attempt’s effects directory for the current turn is supported.');};
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return reject();return value as Record<string,unknown>;}
function keys(value:Record<string,unknown>,allowed:string[]){if(Object.keys(value).some(key=>!allowed.includes(key)))reject();}
export function canonical(value:unknown):string{
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
 return reject();
}
export function effectPath(path:string,dataDir:string,attemptId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId))reject();
 const root=realpathSync(dataDir),parent=join(root,'attempts',attemptId,'effects');
 if(resolve(path)!==path||dirname(path)!==parent||!basename(path)||basename(path)==='.'||basename(path)==='..')reject();
 for(const directory of [join(root,'attempts'),join(root,'attempts',attemptId),parent]){const s=lstatSync(directory);if(s.isSymbolicLink()||!s.isDirectory()||realpathSync(directory)!==directory)reject();}
 try{const s=lstatSync(path);if(s.isSymbolicLink()||!s.isFile())reject();}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return path;
}
export function validatePermission(envelope:PermissionEnvelope,dataDir:string,workspace:string){
 try{
 const {binding,request}=envelope;
 if(request.method!=='item/permissions/requestApproval'||!(typeof request.id==='string'&&request.id.length>0&&request.id.length<=200||typeof request.id==='number'&&Number.isSafeInteger(request.id)))reject();
 if(!binding.threadId||!binding.turnId||!Number.isFinite(Date.parse(envelope.receivedAt)))reject();
 const p=object(request.params);keys(p,['threadId','turnId','itemId','cwd','startedAtMs','reason','environmentId','permissions']);
 if(p.threadId!==binding.threadId||p.turnId!==binding.turnId||p.cwd!==workspace||typeof p.itemId!=='string'||!p.itemId||p.itemId.length>200)reject();
 if(p.startedAtMs!==undefined&&(typeof p.startedAtMs!=='number'||!Number.isSafeInteger(p.startedAtMs)||p.startedAtMs<0))reject();
 if(p.environmentId!==undefined&&p.environmentId!==null&&typeof p.environmentId!=='string')reject();
 if(p.reason!==undefined&&p.reason!==null&&typeof p.reason!=='string')reject();
 const permissions=object(p.permissions);keys(permissions,['fileSystem','network']);if(permissions.network!==undefined&&permissions.network!==null)reject();const fs=object(permissions.fileSystem);keys(fs,['read','write','entries']);
 if(fs.read!==null||!Array.isArray(fs.write)||fs.write.length!==1||typeof fs.write[0]!=='string'||!Array.isArray(fs.entries)||fs.entries.length!==1)reject();
 const entry=object((fs.entries as unknown[])[0]);keys(entry,['path','access']);const path=object(entry.path);keys(path,['type','path']);
 if(entry.access!=='write'||path.type!=='path'||path.path!==(fs.write as string[])[0])reject();
 const filename=effectPath((fs.write as string[])[0]!,dataDir,binding.attemptId),payloadCanonical=canonical(request.params);
 if(Buffer.byteLength(payloadCanonical)>16384||sanitizeBuildValue(payloadCanonical)!==payloadCanonical)reject();
 return {path:filename,payloadCanonical,payloadHash:createHash('sha256').update(payloadCanonical).digest('hex'),providerItemId:p.itemId as string,reason:typeof p.reason==='string'?String(sanitizeBuildValue(p.reason)).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,1000):''};
 }catch(error){if(error instanceof BuildError)throw error;return reject();}
}
