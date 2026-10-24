import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {VerdictFacts} from '../../packages/shared/verdict-core.ts';
import {currentCore,type CoreDecision} from './core-registry.ts';
import type {TicketCheck} from './ticket-checker.ts';
export type VerdictSnapshotRef={path:string;hash:string;coreVersion:string};
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
export function saveVerdictSnapshot(dataDir:string,facts:VerdictFacts):VerdictSnapshotRef{
 const core=currentCore(),decision=core.scoreVerdict(facts),body=JSON.stringify({format:1,coreVersion:core.version,coreSourceHash:core.sourceHash,facts:decision.facts,decision}),digest=hash(body),folder=join(dataDir,'verdict-facts'),path=join(folder,digest+'.json');
 mkdirSync(folder,{recursive:true,mode:0o700});try{writeFileSync(path,body,{flag:'wx',mode:0o400});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST'||hash(readFileSync(path))!==digest)throw error;}
 return {path,hash:digest,coreVersion:core.version};
}
export function loadVerdictSnapshot(ref:VerdictSnapshotRef):{facts:VerdictFacts;decision:CoreDecision;coreVersion:string;coreSourceHash:string}{
 const raw=readFileSync(ref.path);if(hash(raw)!==ref.hash)throw Error('Verdict facts changed');const value=JSON.parse(raw.toString());if(value.format!==1||value.coreVersion!==ref.coreVersion||!value.facts||!value.decision||!Array.isArray(value.decision.trace))throw Error('Verdict facts unavailable');return value;
}
export function snapshotTicketCheck(dataDir:string,check:TicketCheck,fixture=false){
 const {coreFacts,...record}=check;
 // Only explicit injected test adapters may omit facts; production cannot silently do so.
 if(!coreFacts){if(fixture)return record;throw Error('Checker omitted replayable verdict facts');}
 const ref=saveVerdictSnapshot(dataDir,coreFacts),saved=loadVerdictSnapshot(ref);if(saved.decision.verdict!==check.verdict)throw Error('Core verdict differs from the checker result');return {...record,coreTrace:saved.decision.trace,verdictSnapshot:ref};
}
