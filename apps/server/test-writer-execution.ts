import {writerCoverageCommands,finishWriterCoverage,type WriterLineCoverage} from './test-writer-coverage.ts';
import {mkdirSync,writeFileSync,existsSync,realpathSync,symlinkSync,lstatSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {oracleSandbox,processRun,oracleScripts} from './oracle-execution.ts';
import type {NativeWriterFile} from './test-writer-native.ts';
export type WriterNativeResult={status:'PASS'|'ASSERTION_FAIL'|'ERROR';tests:{id:string;status:string;reason?:string}[];reason:string|null;setupError?:boolean;reportPath:string;lineCoverage?:WriterLineCoverage};
// Vitest renders failed .resolves/.rejects expectations as Error rather than
// AssertionError. Require its actual expectation frame; arbitrary project errors
// and setup/import exceptions remain ERROR.
export function nativeVitestAssertion(message:string){
 return /^AssertionError(?: \[[^\]]+\])?:/.test(message)||/^Error: promise (?:rejected .* instead of resolving|resolved .* instead of rejecting)\n/.test(message)&&/\n\s+at _Assertion\.__VITEST_(?:RESOLVES|REJECTS)__ \(file:\/\/[^\n]+\/node_modules\/@vitest\/expect\/dist\/index\.js:\d+:\d+\)/.test(message);
}
export function classifyWriterNative(framework:NativeWriterFile['framework'],report:any,code:number|null):Omit<WriterNativeResult,'reportPath'>{
 let tests:WriterNativeResult['tests']=[];
 if(framework==='vitest'){
  if(!report||!Array.isArray(report.testResults)||report.numUnhandledErrors>0)return {status:'ERROR',tests,reason:'Native Vitest report unavailable or unhandled errors'};
  for(const file of report.testResults){if(!Array.isArray(file.assertionResults)||file.status==='failed'&&!file.assertionResults.length)return {status:'ERROR',tests,setupError:true,reason:'Native file setup failed: '+String(file.message??'No native detail')};for(const t of file.assertionResults){tests.push({id:t.fullName,status:t.status==='passed'?'PASS':t.status==='failed'&&Array.isArray(t.failureMessages)&&t.failureMessages.length>0&&t.failureMessages.every((s:string)=>nativeVitestAssertion(s))?'ASSERTION_FAIL':t.status==='failed'?'ERROR':'SKIPPED',reason:t.failureMessages?.join('\n')});}}
  if(report.numTotalTests!==tests.length)return {status:'ERROR',tests,reason:'Native collection count mismatch'};
 }else{if(!report||!Array.isArray(report.tests)||report.testsRun!==report.tests.length||report.error)return {status:'ERROR',tests,setupError:!!report?.error,reason:report?.error??'Native report unavailable or count mismatch'};tests=report.tests;}
 if(!tests.length||tests.some(t=>typeof t.id!=='string'||!t.id||!['PASS','ASSERTION_FAIL','ERROR','SKIPPED'].includes(t.status))||new Set(tests.map(t=>t.id)).size!==tests.length)return {status:'ERROR',tests,reason:'Zero, malformed or duplicate native tests'};
 if(tests.some(t=>t.status==='ERROR'||t.status==='SKIPPED'))return {status:'ERROR',tests,reason:tests.filter(t=>t.status!=='PASS').map(t=>t.id+': '+t.status+' '+(t.reason??'')).join('\n')};
 if(tests.some(t=>t.status==='ASSERTION_FAIL'))return code===1?{status:'ASSERTION_FAIL',tests,reason:tests.filter(t=>t.status==='ASSERTION_FAIL').map(t=>t.reason).join('\n')}:{status:'ERROR',tests,reason:'Assertion report and exit status disagree'};
 return code===0?{status:'PASS',tests,reason:null}:{status:'ERROR',tests,reason:'Native exit disagrees with report'};
}
export async function executeWriterNative(file:NativeWriterFile,workspace:string,directory:string,signal:AbortSignal,dependencyRoot?:string,measurement?:{diff:string}):Promise<WriterNativeResult>{
 mkdirSync(directory,{recursive:true,mode:0o700});directory=realpathSync(directory);workspace=realpathSync(workspace);const scratch=join(directory,'scratch');mkdirSync(scratch,{mode:0o700});const root=realpathSync(join(workspace,file.runnerDirectory));
 if(!file.path||file.path.startsWith('/')||file.path.includes('\\')||file.path.split('/').some(p=>!p||p==='.'||p==='..')||!file.code||Buffer.byteLength(file.code)>65536)throw Error('Invalid one-file writer export');
 const target=join(root,file.path);if(existsSync(target))throw Error('Writer cannot overwrite an exported file');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,file.code,{flag:'wx',mode:0o400});
 const launcher=join(directory,'launch.py');writeFileSync(launcher,'import json,os,sys\nv=json.loads(sys.stdin.readline())\nos.chdir(v["cwd"])\nos.execve(v["argv"][0],v["argv"],v["env"])\n',{mode:0o400});
 let command:string[],reads=[workspace,launcher,join(oracleScripts,file.framework==='unittest'?'writer-unittest.py':'writer-node-reporter.mjs'),dirname(process.execPath)];
 if(file.framework==='unittest'){command=['/usr/local/bin/python3','-I','-B',join(oracleScripts,'writer-unittest.py')];}
 else if(file.framework==='node'){command=[process.execPath,'--test','--test-reporter='+join(oracleScripts,'writer-node-reporter.mjs'),target];}
 else if(file.framework==='vitest'){
  if(!dependencyRoot)throw Error('Native dependency root unavailable');const deps=realpathSync(dependencyRoot);if(!existsSync(join(deps,'jsdom/package.json'))||!existsSync(join(deps,'vitest/vitest.mjs')))throw Error('Exact native Vitest/jsdom dependency unavailable');const link=join(root,'node_modules');if(existsSync(link)){if(!lstatSync(link).isSymbolicLink()||realpathSync(link)!==deps)throw Error('Existing native dependency link is not the approved read-only dependency');}else symlinkSync(deps,link);symlinkSync(deps,join(scratch,'node_modules'));writeFileSync(join(scratch,'package.json'),JSON.stringify({name:'cc-protected-native',type:'module'}),{mode:0o400});writeFileSync(join(scratch,'tsconfig.json'),JSON.stringify({compilerOptions:{}}),{mode:0o400});reads.push(deps);
  const coverageSetup=join(scratch,'coverage-setup.mjs');if(measurement)writeFileSync(coverageSetup,"import {afterAll} from 'vitest';import {takeCoverage} from 'node:v8';afterAll(()=>takeCoverage());\n",{mode:0o400});
  const config=join(scratch,'vitest.config.mjs');writeFileSync(config,'export default '+JSON.stringify({root,cacheDir:join(scratch,'vite-cache'),server:{host:'127.0.0.1'},resolve:{alias:{'@':join(root,'src')}},test:{include:[file.path],environment:'jsdom',globals:true,setupFiles:measurement?[coverageSetup]:[],watch:false,pool:'forks',maxWorkers:1,minWorkers:1,fileParallelism:false,cache:false}})+';\n',{mode:0o400});reads.push(config);
  command=[process.execPath,join(deps,'vitest/vitest.mjs'),'run','--config',config,'--configLoader=native','--reporter=json'];
 }else throw Error('Native pytest requires an approved pytest playbook; no pytest projects in this scoring set');
 if(measurement){const wrapped=writerCoverageCommands(file.framework,command,root,scratch);command=wrapped.command;reads.push(...wrapped.reads);}
 const env={PATH:dirname(process.execPath)+':/usr/local/bin:/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,TZ:'UTC',LANG:'C',LC_ALL:'C',HOST:'127.0.0.1',BIND_ADDRESS:'127.0.0.1',CI:'1',...(file.framework==='vitest'?{VITEST_SKIP_INSTALL_CHECKS:'1'}:{}),PYTHONDONTWRITEBYTECODE:'1',...(measurement&&file.framework!=='unittest'?{NODE_V8_COVERAGE:join(scratch,'v8')}:{})};
 const input=file.framework==='unittest'?JSON.stringify({root,path:file.path})+'\n':'';
 const driver=file.framework==='unittest'?command:['/usr/local/bin/python3',launcher];
 // Parent-owned report is outside both exports and denied-write to executed code. Native stdout is a pipe, not a Candidate-authored result file.
 const profile=oracleSandbox(reads,scratch,true,true,true);const result=await processRun(driver,root,env,profile,file.framework==='unittest'?input:JSON.stringify({cwd:root,argv:command,env})+'\n',signal,{},60000);
 if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length)throw Error('Writer native cleanup not certified');
 let classified:Omit<WriterNativeResult,'reportPath'>;try{if(result.limited||result.timedOut||result.interrupted)throw Error('Native writer output limit, deadline or interruption');classified=classifyWriterNative(file.framework,JSON.parse(result.stdout),result.code);}catch(e){classified={status:'ERROR',tests:[],reason:(e as Error).message+'; '+result.stderr.slice(0,6000)};}
 const lineCoverage=measurement?await finishWriterCoverage(file.framework,root,scratch,directory,measurement.diff,signal):undefined;
 const reportPath=join(directory,'native-report.json');writeFileSync(reportPath,JSON.stringify({framework:file.framework,exitCode:result.code,nativeOutput:result.stdout,stderr:result.stderr,cleanup:result.cleanup,...classified,...(lineCoverage?{lineCoverage}:{})}),{mode:0o400,flag:'wx'});return {...classified,reportPath,...(lineCoverage?{lineCoverage}:{})};
}
