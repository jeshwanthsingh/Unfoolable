// Only opens the isolated read-only preview; never starts or mutates the real app.
import {readFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),active=JSON.parse(readFileSync(resolve(root,'.work/ticket-loop-v1/ACTIVE.json'),'utf8')),data=active.dataDir??active.config?.dataDir;
if(typeof data!=='string')throw Error('Read the active app data directory from ACTIVE.json before opening this private preview.');
const key=readFileSync(resolve(data,'ticket-operator.key'),'utf8').trim();
execFileSync('/usr/bin/open',['http://localhost:3260/#operator='+encodeURIComponent(key)],{stdio:'ignore'});console.log('Opened http://localhost:3260/ — read-only design preview.');
