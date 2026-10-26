import {extraProtectedPaths} from '../apps/server/builder-private-paths.ts';
import {statSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';import {loadProbeManifest} from './probe-manifest.ts';
export type ReadTarget={label:string;path:string;kind:'directory'|'file';present:boolean};
/** Count and identity come from a released inventory, never directory discovery. */
export async function readGuardTargets(repository:string,liveData:string,home=homedir(),probeData=liveData){
 const roots={repo:repository,data:liveData,home,probe:probeData};
 const base=loadProbeManifest().manifest.targets.map(t=>{const path=join(roots[t.root],t.path);let present=false;try{present=statSync(path)[t.kind==='directory'?'isDirectory':'isFile']();}catch{}return {label:t.id,path,kind:t.kind,present};});
 return [...base,...extraProtectedPaths().map((path,index)=>{let present=false,kind:'file'|'directory'='file';try{const stat=statSync(path);present=true;kind=stat.isDirectory()?'directory':'file';}catch{}return {label:'Extra protected path '+(index+1),path,kind,present};})];
}
