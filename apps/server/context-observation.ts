import {createHash} from 'node:crypto';
import {CONTEXT_LIMITS} from '../../packages/shared/context.ts';
import type {ProjectContextPayload,WorkingChange,ChangeCategory} from '../../packages/shared/context.ts';
import {ContextError} from './context-errors.ts';
export function canonicalJson(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonicalJson).sort().join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson((value as Record<string,unknown>)[key])).join(',')+'}';
 const encoded=JSON.stringify(value);if(encoded===undefined)throw new Error('Invalid canonical value');return encoded;
}
export const payloadHash=(value:unknown):string=>createHash('sha256').update(canonicalJson(value)).digest('hex');
export const trackedPathHash=(paths:readonly string[]):string=>createHash('sha256').update([...new Set(paths)].sort().join('\0')).digest('hex');
export type RepositoryObservation={baseHead:string;branch:string|null;changes:WorkingChange[];trackedPaths:string[]};
const limitError=()=>new ContextError('CONTEXT_CAPTURE_LIMIT','Project context exceeded the safe capture limit.',422);
export function checkedPaths(paths:string[]):string[]{
 if(paths.length>CONTEXT_LIMITS.trackedEntries)throw limitError();
 if(paths.some(p=>p.length>CONTEXT_LIMITS.pathCharacters))throw limitError();
 if(paths.some(p=>!p||p.startsWith('/')||p.split('/').includes('..')||p.includes('\0')))throw new ContextError('CONTEXT_CAPTURE_FAILED','Git returned an invalid repository path.',422);
 return [...new Set(paths)].sort();
}
export function parseStatus(raw:string):WorkingChange[]{
 const tokens=raw.split('\0');if(tokens.pop()!=='')throw new ContextError('CONTEXT_CAPTURE_FAILED','Git returned incomplete working-tree metadata.',422);
 const changes:WorkingChange[]=[];
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i]!;if(token.length<4||token[2]!==' ')throw new ContextError('CONTEXT_CAPTURE_FAILED','Git returned invalid working-tree metadata.',422);
  const status=token.slice(0,2),path=token.slice(3);
  let category:ChangeCategory=status==='??'?'untracked':status.includes('U')||['AA','DD'].includes(status)?'conflicted':status.includes('R')?'renamed':status.includes('A')||status.includes('C')?'added':status.includes('D')?'deleted':'modified';
  const change:WorkingChange={path,category,status};
  if(status.includes('R')||status.includes('C')){const from=tokens[++i];if(!from)throw new ContextError('CONTEXT_CAPTURE_FAILED','Git returned incomplete rename metadata.',422);change.from=from;}
  changes.push(change);if(changes.length>CONTEXT_LIMITS.changeEntries)throw limitError();
 }
 checkedPaths(changes.flatMap(c=>c.from?[c.path,c.from]:[c.path]));return changes;
}
const manifests=new Set(['package.json','pnpm-workspace.yaml','pyproject.toml','requirements.txt','go.mod','Cargo.toml','Makefile','CMakeLists.txt','Dockerfile','compose.yaml','compose.yml','docker-compose.yml','tsconfig.json']);
function summarizePaths(paths:readonly string[],cap:number){const sorted=[...new Set(paths)].sort();return {paths:sorted.slice(0,cap),total:sorted.length,truncated:sorted.length>cap};}
function derive(state:RepositoryObservation):ProjectContextPayload {
 const paths=checkedPaths(state.trackedPaths);const groups=new Map<string,{path:string;kind:'file'|'directory';count:number}>();
 for(const path of paths){const directory=path.includes('/');const key=directory?path.split('/')[0]!+'/':path;const group=groups.get(key)??{path:key,kind:directory?'directory':'file',count:0};group.count++;groups.set(key,group);}
 const structure=[...groups.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const summary:Record<ChangeCategory,number>={modified:0,added:0,deleted:0,renamed:0,untracked:0,conflicted:0};for(const change of state.changes)summary[change.category]++;
 const changes=[...state.changes].sort((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:canonicalJson(a)>canonicalJson(b)?1:0);
 const manifestPaths=paths.filter(p=>manifests.has(p.split('/').at(-1)!));
 const important=paths.filter(p=>/^(README(?:\..*)?|AGENTS\.md|CLAUDE\.md)$/i.test(p.split('/').at(-1)!)||manifests.has(p.split('/').at(-1)!));
 const tests=paths.filter(p=>p.split('/').some(part=>['test','tests','__tests__','spec'].includes(part))||/\.(test|spec)\.[^/]+$/.test(p));
 return {baseHead:state.baseHead,branch:state.branch,workingTree:{clean:changes.length===0,count:changes.length,summary,changes:changes.slice(0,CONTEXT_LIMITS.dirtyPaths),truncated:changes.length>CONTEXT_LIMITS.dirtyPaths},trackedFiles:{count:paths.length,pathSetHash:trackedPathHash(paths)},structure:{entries:structure.slice(0,CONTEXT_LIMITS.structure),total:structure.length,truncated:structure.length>CONTEXT_LIMITS.structure},importantPaths:summarizePaths(important,CONTEXT_LIMITS.importantPaths),manifestPaths:summarizePaths(manifestPaths,CONTEXT_LIMITS.manifestPaths),testLikePaths:summarizePaths(tests,CONTEXT_LIMITS.testLikePaths),limits:CONTEXT_LIMITS};
}
// A narrow observation boundary permits deterministic consistency tests without timing hooks.
export async function captureStableObservation(read:()=>Promise<RepositoryObservation>):Promise<ProjectContextPayload>{
 const before=await read();const payload=derive(before);const after=await read();
 if(before.baseHead!==after.baseHead||before.branch!==after.branch||payloadHash(before.changes)!==payloadHash(after.changes)||trackedPathHash(before.trackedPaths)!==trackedPathHash(checkedPaths(after.trackedPaths)))
  throw new ContextError('REPOSITORY_CHANGED_DURING_CAPTURE','The repository changed while context was being captured. Try again.',409);
 return payload;
}
