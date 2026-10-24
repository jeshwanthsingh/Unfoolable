import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeBuildGit} from './build-workspace.ts';
import {oracleSandbox,processRun} from './oracle-execution.ts';
import {isChangeClassification,type ChangeClassification,type ClassifiedHunk} from '../../packages/shared/change-classification.ts';
const sourceRoot=fileURLToPath(new URL('../../',import.meta.url));
const root=existsSync(join(sourceRoot,'scripts/protected-verification/classify-changes.py'))?sourceRoot:process.cwd();
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function classifyChange(repo:string,baseCommit:string,candidateCommit:string,output:string,signal:AbortSignal):Promise<ChangeClassification>{
 if(![baseCommit,candidateCommit].every(c=>/^[a-f0-9]{40,64}$/.test(c)))throw Error('Classification requires frozen commit identities');
 const paths=(await safeBuildGit(repo,['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',baseCommit,candidateCommit],1048576)).toString().split('\0').filter(Boolean);
 if(paths.length>200)throw Error('Classification file bound exceeded; inspect the full diff');
 const files:{path:string;before:string;after:string;hunks:Pick<ClassifiedHunk,'oldStart'|'oldLines'|'newStart'|'newLines'>[];unknown:boolean}[]=[];
 for(const path of paths){
  const blob=async(ref:string)=>{const present=(await safeBuildGit(repo,['ls-tree','-z',ref,'--',path],16384)).toString();if(!present)return '';if(!/^100(?:644|755) blob /.test(present))throw Error('Non-regular changed file');return (await safeBuildGit(repo,['show',ref+':'+path],1048576)).toString('utf8');};
  let before='',after='',unknown=false;try{before=await blob(baseCommit);after=await blob(candidateCommit);}catch{unknown=true;}
  const diff=(await safeBuildGit(repo,['diff','--no-ext-diff','--no-textconv','--no-renames','--unified=0',baseCommit,candidateCommit,'--',path],1048576)).toString();
  const hunks=[...diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map(m=>({oldStart:Number(m[1]),oldLines:Number(m[2]??1),newStart:Number(m[3]),newLines:Number(m[4]??1)}));
  files.push({path,before,after,hunks:hunks.length&&!unknown?hunks:[{oldStart:0,oldLines:0,newStart:0,newLines:0}],unknown:unknown||!hunks.length});
 }
 const scratch=resolve(output,randomUUID());mkdirSync(scratch,{recursive:true,mode:0o700});
 let report:ChangeClassification;
 try{
  const python=join(root,'.work/tools/tree-sitter/bin/python'),script=join(root,'scripts/protected-verification/classify-changes.py'),tools=realpathSync(join(root,'.work/tools/tree-sitter'));
  const packet=JSON.stringify({files:files.map(({unknown,...file})=>file)});if(Buffer.byteLength(packet)>8388608)throw Error('Classification input bound exceeded');
  const env={PATH:'/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1'};
  const run=await processRun([python,'-I',script],scratch,env,oracleSandbox([tools,script,dirname(realpathSync(python))],scratch,false),packet,signal,{},15000);
  if(!run.cleanup.verified||run.cleanup.ambiguous||run.cleanup.remaining.length)throw Object.assign(Error('Classification cleanup uncertain'),{oracleCleanup:run.cleanup});
  if(run.code!==0||run.limited||run.timedOut||run.interrupted)throw Error('Syntax classification unavailable');
  report={...JSON.parse(run.stdout),baseCommit,candidateCommit};if(!isChangeClassification(report)||report.files.length!==files.length||report.files.some((f,i)=>f.path!==files[i]!.path||f.beforeHash!==hash(files[i]!.before)||f.afterHash!==hash(files[i]!.after)))throw Error('Classification binding changed');
  for(const [i,f]of report.files.entries())if(files[i]!.unknown)for(const h of f.hunks){h.kind='logic';h.reason='Non-text, non-regular or unavailable content; inspect the complete change.';}
 }catch(error){
  if(signal.aborted||(error as {oracleCleanup?:{verified:boolean;ambiguous:boolean;remaining:unknown[]}}).oracleCleanup)throw error;
  report={version:'change-classification-v1',baseCommit,candidateCommit,parserVersions:{},files:files.map(f=>({path:f.path,beforeHash:hash(f.before),afterHash:hash(f.after),hunks:f.hunks.map(h=>({...h,kind:'logic' as const,functions:[],reason:'Syntax classification unavailable; inspect the complete change.'}))}))};
 }
 writeFileSync(join(scratch,'classification.json'),JSON.stringify(report),{flag:'wx',mode:0o400});return report;
}
