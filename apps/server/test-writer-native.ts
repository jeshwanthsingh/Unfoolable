import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {materializeOracleTree} from './oracle-tree.ts';
import {safeBuildGit} from './build-workspace.ts';
import {runWriterSession} from './test-writer-session.ts';
import type {JsonOwnership} from './codex-json.ts';
import type {WriterUsage} from '../../packages/shared/test-writer.ts';
export type NativeWriterFile={framework:'unittest'|'pytest'|'vitest'|'node';runnerDirectory:string;path:string;code:string;summary:string;complete:boolean;reason:string};
export type NativeWriterProposal={file:NativeWriterFile;usage:WriterUsage|null;sessionId:string|null;started:boolean};
const properties={path:{type:'string'},code:{type:'string'},summary:{type:'string'},complete:{type:'boolean'},reason:{type:'string'}};
const schema={type:'object',additionalProperties:false,properties,required:Object.keys(properties)};
export const NATIVE_WRITER_PROMPT=`Write ONE ordinary test file in the supplied native framework for the entire engineering request. Use read_base to inspect the complete immutable BASE repo and its existing tests/configuration. No Candidate, Builder session, truth labels, hidden graders or prior Candidate results are available. No shell, edits or network tools. Return the test file's relative path and complete source code; the coordinator alone writes it. Use the exact supplied filename. Native imports, unittest subtests, mocks, temporary fixtures and multiple test cases are permitted. Test public requested behavior, including positive, negative, isolation and edge cases. Do not implement the fix in the test or mock the behavior being tested. No vacuous assertions, skipping, xfail, process exit, framework manipulation or hardcoded replacement implementations. Use only existing installed dependencies and disposable test-local state. Existing protected tests already cover regressions, do not duplicate unrelated suites or add test-file-immutability constraints. Never execute project operational scripts against real personal data. Paths are relative to the native runnerDirectory. Every test name must start test_ for Python; Vitest uses test()/it() normally. State complete only if the tests cover the entire requested new behavior; disclose any missing obligation. If repairBaseError is supplied, fix setup/import/syntax using ONLY that BASE error and BASE reads; no Candidate feedback. If unsupported, code is empty with the precise reason. Return JSON only.`;
export async function nativeWriterLayout(repo:string,base:string){
 const paths=(await safeBuildGit(repo,['ls-tree','-r','--name-only',base],1048576)).toString().trim().split('\n');
 if(paths.includes('sdk/python/pyproject.toml'))return {framework:'unittest' as const,runnerDirectory:'sdk/python'};
 if(paths.includes('frontend/package.json'))return {framework:'vitest' as const,runnerDirectory:'frontend'};
 if(paths.some(p=>p.startsWith('tests/test_')&&p.endsWith('.py')))return {framework:'unittest' as const,runnerDirectory:'.'};
 if(paths.includes('package.json'))return {framework:'node' as const,runnerDirectory:'.'};
 throw Error('No configured native writer framework');
}
export async function authorNativeWriter(base:{repoRoot:string;baseCommit:string;intent:string},directory:string,signal:AbortSignal,ownership?:JsonOwnership,repairBaseError?:string):Promise<NativeWriterProposal>{
 mkdirSync(directory,{recursive:true,mode:0o700});const layout=await nativeWriterLayout(base.repoRoot,base.baseCommit),exportRoot=join(directory,'base-readonly');await materializeOracleTree(base.repoRoot,base.baseCommit,exportRoot);
 const path=layout.framework==='vitest'?'src/__tests__/cc-writer-'+randomUUID()+'.test.tsx':layout.framework==='node'?'cc-writer-'+randomUUID()+'.test.mjs':'tests/test_cc_writer_'+randomUUID().replaceAll('-','_')+'.py';
 const packet={request:base.intent,baseCommit:base.baseCommit,...layout,path,...(repairBaseError?{repairBaseError}:{})};writeFileSync(join(directory,'base-input.json'),JSON.stringify(packet),{mode:0o400,flag:'wx'});
 const result=await runWriterSession(exportRoot,packet,directory,signal,NATIVE_WRITER_PROMPT,schema,ownership);const output=result.output as Record<string,unknown>;
 if(!output||Object.keys(output).sort().join(',')!==Object.keys(properties).sort().join(',')||output.path!==path||typeof output.code!=='string'||Buffer.byteLength(output.code)>65536||typeof output.summary!=='string'||typeof output.complete!=='boolean'||typeof output.reason!=='string')throw Error('Malformed native test-file output');
 if(existsSync(join(exportRoot,layout.runnerDirectory,path)))throw Error('Writer test path already exists in BASE');
 const file={...layout,...output} as NativeWriterFile;writeFileSync(join(directory,'test-file.json'),JSON.stringify(file),{mode:0o400,flag:'wx'});writeFileSync(join(directory,'test-file.sha256'),createHash('sha256').update(file.code).digest('hex'),{mode:0o400});
 return {file,usage:result.usage??null,sessionId:result.sessionId??null,started:true};
}
