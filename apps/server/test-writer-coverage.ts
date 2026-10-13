import {isOracleTestPath} from './oracle-tree.ts';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';import {join,dirname} from 'node:path';
import {oracleSandbox,processRun,oracleScripts} from './oracle-execution.ts';
import type {WriterLineCoverage} from '../../packages/shared/test-writer.ts';
export type {WriterLineCoverage} from '../../packages/shared/test-writer.ts';
export function productionWriterDiff(diff:string){
 const blocks=diff.split(/(?=^diff --git )/m);
 return blocks.filter(block=>{const header=/^\+\+\+ (.+)$/m.exec(block)?.[1];if(!header||header==='/dev/null')return false;if(!header.startsWith('b/'))throw Error('Quoted diff paths are not supported for measured coverage');const path=header.slice(2);return /\.(?:py|[cm]?[jt]sx?)$/.test(path)&&!isOracleTestPath(path);}).join('');
}
export const writerTools=join(oracleScripts,'../../.work/evidence/tools');
export function writerCoverageCommands(framework:string,command:string[],root:string,scratch:string){
 if(framework==='unittest'){const config=join(scratch,'coverage.ini');writeFileSync(config,'[run]\nsource = '+root+'\ndata_file = '+join(scratch,'.coverage')+'\nparallel = true\npatch = subprocess\n',{mode:0o400});return {command:[join(writerTools,'python/bin/python'),'-I','-B','-m','coverage','run','--rcfile='+config,...command.slice(3)],reads:[join(writerTools,'python')]};}
 return {command,reads:[]};
}
export function normalizeDiffCoverage(report:any):Pick<WriterLineCoverage,'changedLines'|'coveredLines'|'percent'|'unmeasuredPaths'> {
 if(!report||!Number.isSafeInteger(report.total_num_lines)||!Number.isSafeInteger(report.total_num_violations)||report.total_num_lines<0||report.total_num_violations<0||report.total_num_violations>report.total_num_lines)throw Error('Invalid diff-cover counts');
 const changedLines=report.total_num_lines,coveredLines=changedLines-report.total_num_violations;
 return {changedLines,coveredLines,percent:changedLines?coveredLines*100/changedLines:null,unmeasuredPaths:[]};
}
export async function finishWriterCoverage(framework:string,root:string,scratch:string,directory:string,diff:string,signal:AbortSignal):Promise<WriterLineCoverage>{
 const tool=framework==='unittest'?'coverage.py' as const:'c8' as const;
 const unavailable=(reason:string):WriterLineCoverage=>({tool,changedLines:0,coveredLines:0,percent:null,unmeasuredPaths:[],reason,reportPath:null});
 diff=productionWriterDiff(diff);
 const patch=join(directory,'changed-lines.diff');writeFileSync(patch,diff,{mode:0o400,flag:'wx'});
 const launcher=join(directory,'coverage-launch.py');writeFileSync(launcher,'import json,os,sys\nv=json.loads(sys.stdin.readline())\nos.chdir(v["cwd"])\nos.execve(v["argv"][0],v["argv"],v["env"])\n',{mode:0o400});
 const python=join(writerTools,'python/bin/python'),cover=join(scratch,framework==='unittest'?'coverage.xml':'coverage/lcov.info'),native=join(scratch,'diff-coverage.json');
 const env={PATH:dirname(process.execPath)+':'+dirname(python)+':/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,TZ:'UTC',LANG:'C',LC_ALL:'C',PYTHONDONTWRITEBYTECODE:'1'};
 const profile=oracleSandbox([root,launcher,patch,join(oracleScripts,'writer-diff-cover.py'),dirname(process.execPath),join(writerTools,'js/node_modules'),join(writerTools,'python')],scratch,true,true,true);
 const run=async(argv:string[])=>{const result=await processRun(['/usr/local/bin/python3',launcher],root,env,profile,JSON.stringify({cwd:root,argv,env})+'\n',signal,{},15000);if(!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length)throw Error('Coverage cleanup not certified');if(result.code!==0||result.limited||result.timedOut||result.interrupted)throw Error('Coverage tool failed: '+result.stderr.slice(0,2000));};
 try{
  if(framework==='unittest'){await run([python,'-I','-B','-m','coverage','combine','--data-file='+join(scratch,'.coverage'),'--keep',scratch]);await run([python,'-I','-B','-m','coverage','xml','--data-file='+join(scratch,'.coverage'),'-o',cover]);}
  if(framework!=='unittest')await run([process.execPath,join(writerTools,'js/node_modules/c8/bin/c8.js'),'report','--temp-directory='+join(scratch,'v8'),'--reports-dir='+join(scratch,'coverage'),'--reporter=lcovonly','--exclude-after-remap']);
  if(!existsSync(cover))return unavailable('Native coverage report missing');
  await run([python,'-I','-B',join(oracleScripts,'writer-diff-cover.py'),root,cover,patch,native]);
  const payload=JSON.parse(readFileSync(native,'utf8')),counts=normalizeDiffCoverage(payload);const reportPath=join(directory,'measured-coverage.json');
  // diff-cover cannot count a source absent from the native report. Keep these
  // explicit and prevent a partial tool report from claiming full coverage.
  const changedPaths=[...diff.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(m=>m[1]!).filter(p=>/\.(?:py|[cm]?[jt]sx?)$/.test(p)&&!/(?:^|\/)(?:tests|__tests__)\/|\.(?:test|spec)\./.test(p));
  const xml=readFileSync(cover,'utf8');counts.unmeasuredPaths=changedPaths.filter(path=>!xml.includes(framework==='unittest'?'filename="'+path+'"':'SF:'+root+'/'+path)&&!xml.includes('SF:'+path));
  const result={tool,...counts,reason:counts.unmeasuredPaths.length?'Changed source missing from native coverage report':counts.percent===null?'No executable changed lines measured':null,reportPath};writeFileSync(reportPath,JSON.stringify({result,diffCover:payload}),{flag:'wx',mode:0o400});return result;
 }catch(e){if(signal.aborted||/cleanup not certified/.test((e as Error).message))throw e;return unavailable((e as Error).message);}
}
