import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {assertDataEntry} from './data-mode.ts';
export const reviewDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createDiffReviewStore(dataDir:string){
 const root=join(dataDir,'diff-reviews');assertDataEntry(root,'directory');mkdirSync(root,{recursive:true,mode:0o700});
 function file(ticketId:string,binding:string,path:string){if(!/^[a-f0-9-]{36}$/.test(ticketId)||!/^([a-f0-9]{64})$/.test(binding))throw Error('Invalid diff review identity');const dir=join(root,ticketId,binding);assertDataEntry(join(root,ticketId),'directory');assertDataEntry(dir,'directory');const file=join(dir,reviewDigest(path)+'.json');assertDataEntry(file,'file');return {dir,file};}
 function viewed(ticketId:string,binding:string,path:string){const location=file(ticketId,binding,path);if(!existsSync(location.file))return false;const record=JSON.parse(readFileSync(location.file,'utf8'));return record.ticketId===ticketId&&record.binding===binding&&record.path===path&&typeof record.viewedAt==='string';}
 function record(ticketId:string,binding:string,path:string){const location=file(ticketId,binding,path);mkdirSync(location.dir,{recursive:true,mode:0o700});if(viewed(ticketId,binding,path))return;writeFileSync(location.file,JSON.stringify({ticketId,binding,path,viewedAt:new Date().toISOString()}),{flag:'wx',mode:0o400});}
 return {viewed,record};
}
