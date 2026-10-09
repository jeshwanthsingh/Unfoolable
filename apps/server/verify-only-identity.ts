import {createHash} from 'node:crypto';
import {readdirSync,lstatSync,readFileSync,realpathSync} from 'node:fs';
import {join,relative} from 'node:path';
import {canonicalContractJson} from './contract-store.ts';
export const verifyHash=(value:unknown)=>createHash('sha256').update(canonicalContractJson(value)).digest('hex');
export function verifyTreeHash(root:string,trustedLinks:Record<string,string>={}):string{
 const files:{path:string;sha256:string;bytes:number;mode:number}[]=[];let total=0,count=0;
 const walk=(dir:string)=>{for(const name of readdirSync(dir).sort()){const full=join(dir,name),path=relative(root,full),stat=lstatSync(full);if(++count>20000)throw Error('Unsafe evidence inventory');if(stat.isSymbolicLink()){if(!trustedLinks[path]||realpathSync(full)!==trustedLinks[path])throw Error('Unsafe evidence link');files.push({path,bytes:0,mode:0,sha256:verifyHash({trustedDependency:trustedLinks[path]})});continue;}if(!stat.isFile()&&!stat.isDirectory())throw Error('Unsafe evidence inventory');if(stat.isDirectory())walk(full);else{total+=stat.size;if(stat.size>8*1024*1024||total>64*1024*1024)throw Error('Evidence inventory exceeds bounds');files.push({path,bytes:stat.size,mode:stat.mode&0o777,sha256:createHash('sha256').update(readFileSync(full)).digest('hex')});}}};walk(root);return verifyHash(files);
}
