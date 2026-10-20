import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {CORE_VERSION,scoreVerdict,type VerdictFacts,type VerdictDecision} from '../../packages/shared/verdict-core.ts';
import type {TicketCheck} from './ticket-checker.ts';
export type VerdictSnapshotRef={path:string;hash:string;coreVersion:string};
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const extension=import.meta.url.endsWith('.ts')?'.ts':'.js';
const coreHash=()=>hash(readFileSync(new URL('../../packages/shared/verdict-core'+extension,import.meta.url)));
export function saveVerdictSnapshot(dataDir:string,facts:VerdictFacts):VerdictSnapshotRef{
 const decision=scoreVerdict(facts),body=JSON.stringify({format:1,coreVersion:CORE_VERSION,coreSourceHash:coreHash(),facts:decision.facts,decision}),digest=hash(body),folder=join(dataDir,'verdict-facts'),path=join(folder,digest+'.json');
 mkdirSync(folder,{recursive:true,mode:0o700});try{writeFileSync(path,body,{flag:'wx',mode:0o400});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST'||hash(readFileSync(path))!==digest)throw error;}
 return {path,hash:digest,coreVersion:CORE_VERSION};
}
export function loadVerdictSnapshot(ref:VerdictSnapshotRef):{facts:VerdictFacts;decision:VerdictDecision;coreVersion:string;coreSourceHash:string}{
 const raw=readFileSync(ref.path);if(hash(raw)!==ref.hash)throw Error('Verdict facts changed');const value=JSON.parse(raw.toString());if(value.format!==1||value.coreVersion!==ref.coreVersion||!value.facts||!value.decision||!Array.isArray(value.decision.trace))throw Error('Verdict facts unavailable');return value;
}
export function snapshotTicketCheck(dataDir:string,check:TicketCheck,fixture=false){
 const {coreFacts,...record}=check;
 // Only explicit injected test adapters may omit facts; production cannot silently do so.
 if(!coreFacts){if(fixture)return record;throw Error('Checker omitted replayable verdict facts');}
 const ref=saveVerdictSnapshot(dataDir,coreFacts),saved=loadVerdictSnapshot(ref);if(saved.decision.verdict!==check.verdict)throw Error('Core verdict differs from the checker result');return {...record,coreTrace:saved.decision.trace,verdictSnapshot:ref};
}
