import {cpSync,mkdirSync} from 'node:fs';
import {loadProbeManifest} from './probe-manifest.ts';
// Compiled maintenance uses the same immutable inventory as the source CLI.
const {identity}=loadProbeManifest();
mkdirSync('dist/server/scripts/probe-manifests',{recursive:true});
cpSync('scripts/probe-manifests','dist/server/scripts/probe-manifests',{recursive:true});
console.log('Protected-path manifest packaged: '+identity.version+' ('+identity.count+')');
