import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {SpecError} from './spec-errors.ts';
const source=fileURLToPath(new URL('../../scripts/passkey-bootstrap.jxa',import.meta.url));
export const bootstrapScript=existsSync(source)?source:fileURLToPath(new URL('../../../../scripts/passkey-bootstrap.jxa',import.meta.url));
export async function confirmOwnerEnrollment(digest:string){
 if(process.platform!=='darwin')throw new SpecError('OWNER_ENROLLMENT_REQUIRED','Owner enrollment requires this Mac. Phone setup is not implemented.',403);
 const enrollment=digest.slice(0,12);
 await new Promise<void>((resolve,reject)=>execFile('/usr/bin/osascript',['-l','JavaScript',bootstrapScript,enrollment],{timeout:115000,maxBuffer:4096},(error,output)=>{if(error){reject(new SpecError('OWNER_ENROLLMENT_REQUIRED','Initial owner enrollment was not confirmed by macOS biometrics.',403));return;}try{const v=JSON.parse(output.trim());if(v.approved!==true||v.enrollment!==enrollment)throw Error();resolve();}catch{reject(new SpecError('OWNER_ENROLLMENT_REQUIRED','Initial owner enrollment could not be certified.',403));}}));
}
