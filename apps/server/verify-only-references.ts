import {runCodexJson} from './codex-json.ts';
import {canonicalContractJson} from './contract-store.ts';
import type {VerifyBinding} from '../../packages/shared/verify-only.ts';
import type {oracleSource} from './oracle-source.ts';
import {writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
export type ReferenceEdit={path:string;before:string;after:string};
export type VerifyReferences={correct:ReferenceEdit[];wrong:{label:string;edits:ReferenceEdit[]}[]};
const str=(max:number)=>({type:'string',minLength:1,maxLength:max});
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const edits={type:'array',minItems:1,maxItems:8,items:obj({path:str(500),before:str(4096),after:str(4096)})};
const schema=obj({correct:edits,wrong:{type:'array',minItems:1,maxItems:3,items:obj({label:str(300),edits})}});
const prompt=`Independently write reference implementations from this public engineering request and committed BASE source only. You are a separate read-only, tool-free thread. You have no Candidate or check code and must not request them. Return exact before/after replacement hunks: every before must be a unique verbatim contiguous BASE snippet. Preserve untouched source, public APIs and existing tests. Reuse the exact supplied BASE calling conventions; never invent keyword arguments or unseen APIs. Never modify tests, dependencies, import machinery, builtins, native frameworks or observation channels. Correct must implement every requested behavior. Also supply 1-3 realistic wrong variants, each independently based on BASE (not on correct); cover different plausible omissions from the request so each requested new behavior has a counterexample. Wrong variants still preserve unrelated functionality, and must not merely crash startup. For concurrency a wrong implementation should retain the losing-request race (or return duplicate rows), not mock the database or the caller. For UI change real application/store code, not fixtures. No filesystem writes, shell, browsing or tools. This is reference authoring, not a Builder run. No check assertions are supplied or may be inferred from external files.`;
export async function authorVerifyReferences(input:VerifyBinding,source:Awaited<ReturnType<typeof oracleSource>>,directory:string,signal:AbortSignal):Promise<VerifyReferences>{
 const packet={intent:input.intent,baseCommit:input.baseCommit,runnerDirectory:source.directory,source:source.source};
 mkdirSync(directory,{recursive:true,mode:0o700});const inputPath=join(directory,'reference-input.json'),encoded=canonicalContractJson(packet);if(existsSync(inputPath)){if(readFileSync(inputPath,'utf8')!==encoded)throw Error('Reference retry input changed');}else writeFileSync(inputPath,encoded,{flag:'wx',mode:0o600});
 const response=await runCodexJson(packet,signal,undefined,prompt,schema,canonicalContractJson,undefined,directory);
 writeFileSync(join(directory,'reference-proposal.json'),canonicalContractJson(response.output),{flag:'wx',mode:0o600});
 const refs=response.output as VerifyReferences;
 const validate=(list:ReferenceEdit[])=>{if(!Array.isArray(list)||!list.length||list.length>8)throw Error('Invalid independent reference edits');for(const e of list){if(!Object.hasOwn(source.source,e.path)||/(?:^|\/)(?:tests|__tests__)\/|\.test\.|\.spec\.|(?:package|pyproject)\./.test(e.path)||typeof e.before!=='string'||!e.before||e.before.length>4096||typeof e.after!=='string'||!e.after||e.after.length>4096||e.before===e.after)throw Error('Reference may edit supplied production source only');}};
 validate(refs.correct);if(!Array.isArray(refs.wrong)||!refs.wrong.length||refs.wrong.length>3)throw Error('Missing wrong reference');for(const wrong of refs.wrong){if(typeof wrong.label!=='string'||!wrong.label.trim())throw Error('Wrong reference needs an explicit defect');validate(wrong.edits);}
 return refs;
}
