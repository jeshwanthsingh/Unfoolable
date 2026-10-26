import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export type ProbeManifest={version:string;targets:{id:string;root:'home'|'data'|'repo'|'probe';path:string;kind:'file'|'directory'}[];endpoints:string[]};
const directory=new URL('./probe-manifests/',import.meta.url);
export function validateProbeEvolution(previous:ProbeManifest,next:ProbeManifest){
 const changed=JSON.stringify(previous)!==JSON.stringify(next);
 if(changed&&previous.version===next.version)throw Error('Manifest changes require a new version.');
 // Removing or replacing a released target requires an explicit owner-approved baseline migration.
 for(const old of previous.targets)if(!next.targets.some(t=>JSON.stringify(t)===JSON.stringify(old)))throw Error('Target removal requires owner approval and a documented CI baseline migration.');
 for(const path of previous.endpoints)if(!next.endpoints.includes(path))throw Error('Endpoint removal requires owner approval.');
}
export function loadProbeManifest(version?:string){
 const registry=JSON.parse(readFileSync(new URL('registry.json',directory),'utf8'));
 const release=registry.releases.find((r:{version:string})=>r.version===(version??registry.current));
 if(!release||!/^[a-z0-9-]+\.json$/.test(release.file))throw Error('Unknown probe manifest.');
 const bytes=readFileSync(new URL(release.file,directory)),sha256=createHash('sha256').update(bytes).digest('hex');
 const manifest=JSON.parse(bytes.toString()) as ProbeManifest;
 if(sha256!==release.sha256||manifest.version!==release.version||manifest.targets.length!==release.count||new Set(manifest.targets.map(t=>t.id)).size!==manifest.targets.length)throw Error('Probe manifest identity changed.');
 for(const t of manifest.targets)if(!['home','data','repo','probe'].includes(t.root)||!['file','directory'].includes(t.kind)||t.path.startsWith('/')||t.path.split('/').includes('..'))throw Error('Invalid probe target.');
 return {manifest,identity:{version:manifest.version,sha256,count:manifest.targets.length},path:fileURLToPath(new URL(release.file,directory))};
}
