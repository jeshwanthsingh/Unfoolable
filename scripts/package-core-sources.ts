import {cpSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {currentCore,resolveCore} from '../apps/server/core-registry.ts';
// Deploy the canonical policy bytes, not regenerated lookalikes; Node 24 replays these directly.
const registry=JSON.parse(readFileSync('docs/CORE_VERSIONS.json','utf8'));
currentCore();
for(const entry of registry.versions){
 resolveCore(entry.version,entry.sha256);
 const target=resolve('dist/server',entry.source);mkdirSync(dirname(target),{recursive:true});cpSync(entry.source,target);
}
mkdirSync('dist/server/docs',{recursive:true});cpSync('docs/CORE_VERSIONS.json','dist/server/docs/CORE_VERSIONS.json');
console.log('Versioned core sources checked and packaged: '+registry.versions.length);
