// Trusted, offline signing helper. Never offered as an agent tool or HTTP endpoint.
import {readFileSync,lstatSync} from 'node:fs';import {sign} from 'node:crypto';
const path=process.argv[2];if(process.argv.length!==3||!path)throw Error('Protected signing key required');
const st=lstatSync(path);if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o777)!==0o600)throw Error('Signing key permissions changed');
let data=Buffer.alloc(0);for await(const chunk of process.stdin){data=Buffer.concat([data,chunk]);if(data.length>1048576)throw Error('Signing input exceeds limit');}
if(!data.subarray(0,7).equals(Buffer.from('DSSEv1 ')))throw Error('Only DSSE messages are signed');
process.stdout.write(sign('sha256',data,readFileSync(path)).toString('base64'));
