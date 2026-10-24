import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {CORE_VERSION,type VerdictDecision} from '../../packages/shared/verdict-core.ts';
import type {VerdictDecision as LegacyDecision} from '../../packages/shared/cores/verdict-core-v1.ts';
export type CoreDecision=VerdictDecision|LegacyDecision;
const requireCore=createRequire(import.meta.url);
// Fixed trusted paths only: a seal or registry row cannot choose an executable filename.
const files={
 'verdict-core-v1':'packages/shared/cores/verdict-core-v1.ts',
 'verdict-core-v2':'packages/shared/verdict-core.ts',
} as const;
type Entry={version:string;source:string;sha256:string;becameCurrent:string;description:string};
function registry():{current:string;versions:Entry[]}{
 try{const value=JSON.parse(readFileSync(new URL('../../docs/CORE_VERSIONS.json',import.meta.url),'utf8'));
  if(value.format!==1||!Array.isArray(value.versions)||typeof value.current!=='string')throw Error();return value;
 }catch{throw Error('unknown core');}
}
/** Never substitute today's policy for a sealed historical decision. Recheck bytes on every use. */
export function resolveCore(version:string,sourceHash:string){
 try{
  if(!Object.hasOwn(files,version)||!/^[a-f0-9]{64}$/.test(sourceHash))throw Error();
  const path=files[version as keyof typeof files],entries=registry().versions.filter(e=>e.version===version);
  if(entries.length!==1||entries[0]!.source!==path||entries[0]!.sha256!==sourceHash)throw Error();
  const file=new URL('../../'+path,import.meta.url);
  if(createHash('sha256').update(readFileSync(file)).digest('hex')!==sourceHash)throw Error();
  // Node 24 runs these pure files with native type stripping, including in the built app.
  // Thus the checked source bytes are the executed policy, not an unbound compiled sibling.
  const core=requireCore(fileURLToPath(file)) as {CORE_VERSION:string;scoreVerdict:(facts:unknown)=>CoreDecision};
  if(core.CORE_VERSION!==version||typeof core.scoreVerdict!=='function')throw Error();
  return {version,sourceHash,scoreVerdict:core.scoreVerdict};
 }catch{throw Error('unknown core');}
}
export function currentCore(){
 const value=registry();if(value.current!==CORE_VERSION)throw Error('unknown core');
 const entries=value.versions.filter(e=>e.version===CORE_VERSION);if(entries.length!==1)throw Error('unknown core');
 return resolveCore(CORE_VERSION,entries[0]!.sha256);
}
