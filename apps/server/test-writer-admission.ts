import {stripVTControlCharacters} from 'node:util';
import {remainingWriterTokens} from './test-writer-context.ts';
import {runWriterMutations} from './test-writer-mutation.ts';
import {safeBuildGit} from './build-workspace.ts';
import {mkdirSync,writeFileSync,readFileSync,existsSync,realpathSync} from 'node:fs';
import {join} from 'node:path';import {createHash} from 'node:crypto';
import {authorNativeWriter,type NativeWriterProposal} from './test-writer-native.ts';
import {executeWriterNative,type WriterNativeResult} from './test-writer-execution.ts';
import {materializeOracleTree,restoreBaseTests} from './oracle-tree.ts';import {verifyStep} from './verify-only-deadline.ts';
import type {JsonOwnership} from './codex-json.ts';import type {TestWriterEvidence,WriterUsage} from '../../packages/shared/test-writer.ts';
export const TEST_WRITER_POLICY:'EVIDENCE'|'ADVISORY'='ADVISORY';
export function writerPolicyForScore(confirmed:number,falseAccepts:number){return confirmed>=6&&falseAccepts===0?'EVIDENCE':'ADVISORY';}
export function nativeAdmission(base:WriterNativeResult,candidates:WriterNativeResult[]){
 const ids=(r:WriterNativeResult)=>r.tests.map(t=>t.id).sort().join('\n');
 return base.status==='ASSERTION_FAIL'&&candidates.length===2&&candidates.every(r=>r.status==='PASS'&&ids(r)===ids(base));
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function runNativeTestWriter(base:{repoRoot:string;baseCommit:string;intent:string},candidateCommit:string,directory:string,signal:AbortSignal,dependencies:{author?:typeof authorNativeWriter;execute?:typeof executeWriterNative;ownership?:JsonOwnership;mutate?:typeof runWriterMutations;playbookCommand?:string}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});const records:{path:string;hash:string}[]=[],evidence:TestWriterEvidence={version:'test-writer-v1',mode:'NATIVE',advisoryOnly:TEST_WRITER_POLICY==='ADVISORY',warnings:[],baseCommit:base.baseCommit,requestHash:hash(base.intent),inputHash:null,usage:null,sessionId:null,started:false,coverage:'NONE',checks:[],reason:null};
 let authored:NativeWriterProposal|null=null;let nextBaseError:string|undefined,mutationFeedback:string|undefined,repairUsed=false,mutationRetryUsed=false;let admittedBackup:TestWriterEvidence|null=null;const costs:(WriterUsage|null)[]=[];const retain=(path:string)=>{if(existsSync(path))records.push({path,hash:hash(readFileSync(path,'utf8'))});};
 try{
  for(let attempt=0;attempt<3;attempt++){
   const budget=remainingWriterTokens(costs);if(budget<1000){evidence.reason='Writer token budget exhausted or unknown; no further authoring';break;}
   const changedPaths=(await safeBuildGit(base.repoRoot,['diff','--no-ext-diff','--name-only',base.baseCommit,candidateCommit],262144)).toString().trim().split('\n').filter(Boolean);
   const authorDir=join(directory,'author-'+attempt);const baseError=nextBaseError;nextBaseError=undefined;
   // Reconstruct the capability input explicitly: Candidate identifiers/paths and labels cannot enter it.
   const onlyBase={repoRoot:base.repoRoot,baseCommit:base.baseCommit,intent:base.intent};
   authored=await verifyStep('Native Test Writer',190000,signal,s=>(dependencies.author??authorNativeWriter)(onlyBase,authorDir,s,dependencies.ownership,baseError,mutationFeedback,{changedPaths,playbookCommand:dependencies.playbookCommand??null,tokenBudget:budget}));costs.push(authored.usage);evidence.started ||= authored.started;evidence.sessionId=authored.sessionId;
   if(attempt===0&&existsSync(join(authorDir,'base-input.json')))evidence.inputHash=hash(readFileSync(join(authorDir,'base-input.json'),'utf8'));
   const row={id:'writer-file',testName:authored.file.path,summary:authored.file.summary,status:'NOT_ADMITTED' as const,base:[] as string[],candidate:'NOT CHECKED',candidateRuns:[] as string[],reason:null as string|null};evidence.checks=[row];
   if(!authored.file.code){row.reason=authored.file.reason||'Writer could not author a native test';break;}
   const execute=dependencies.execute??executeWriterNative;
   const relative=authored.file.runnerDirectory==='.'?[]:['--relative='+authored.file.runnerDirectory];
   const diff=(await safeBuildGit(base.repoRoot,['diff','--no-ext-diff','--no-textconv','--unified=0',...relative,base.baseCommit,candidateCommit],1048576)).toString();
   const run=async(phase:string,commit:string)=>{const folder=join(directory,'attempt-'+attempt+'-'+phase);mkdirSync(folder,{mode:0o700});const workspace=join(folder,'export');const sdk=authored!.file.runnerDirectory==='sdk/python';const revision=sdk?(await safeBuildGit(base.repoRoot,['rev-parse',commit+':sdk/python'],1000)).toString().trim():commit;await materializeOracleTree(base.repoRoot,revision,workspace);if(commit!==base.baseCommit){const baseRevision=sdk?(await safeBuildGit(base.repoRoot,['rev-parse',base.baseCommit+':sdk/python'],1000)).toString().trim():base.baseCommit;await restoreBaseTests(base.repoRoot,baseRevision,workspace);}const executionFile=sdk?{...authored!.file,runnerDirectory:'.'}:authored!.file;const deps=authored!.file.framework==='vitest'?realpathSync(join(base.repoRoot,authored!.file.runnerDirectory,'node_modules')):undefined;const result=await execute(executionFile,workspace,join(folder,'execution'),signal,deps,{diff});retain(result.reportPath);if(result.lineCoverage?.reportPath)retain(result.lineCoverage.reportPath);return result;};
   const baseline=await run('base',base.baseCommit);row.base.push(baseline.status==='ASSERTION_FAIL'?'FAIL':baseline.status);
   if(baseline.status==='ERROR'&&!repairUsed&&(baseline.setupError||baseline.tests.some(t=>t.status==='ERROR')||/ImportError|ModuleNotFoundError|SyntaxError|NameError|AttributeError|TypeError/.test(baseline.reason??''))){repairUsed=true;nextBaseError=(baseline.reason??'BASE setup error').slice(0,4000);writeFileSync(join(directory,'repair-base-error.txt'),nextBaseError,{mode:0o400});continue;}
   if(baseline.status!=='ASSERTION_FAIL'){row.reason='Not admitted: BASE '+baseline.status+'. Requires a real assertion failure; setup errors, skips and zero tests never count.';break;}
   const candidates:WriterNativeResult[]=[];for(let n=0;n<2;n++){const result=await run('candidate-'+n,candidateCommit);candidates.push(result);row.candidateRuns.push(result.status);if(result.status==='ASSERTION_FAIL')evidence.warnings!.push({testName:authored!.file.path,summary:authored!.file.summary.slice(0,1000)||'The requested behavior did not satisfy the independent test.',assertion:stripVTControlCharacters(result.tests.filter(t=>t.status==='ASSERTION_FAIL').map(t=>t.reason??t.id).join('\n')||result.reason||'An independent assertion failed.').slice(-4000)});if(result.status!=='PASS')break;}
   row.candidate=row.candidateRuns.every(s=>s==='PASS')&&row.candidateRuns.length===2?'PASS':row.candidateRuns.at(-1)??'NOT CHECKED';
   if(nativeAdmission(baseline,candidates)){(row as {status:string}).status='ADMITTED';const measured=candidates.map(r=>r.lineCoverage);const firstCoverage=measured.find(c=>c?.percent===null||c?.unmeasuredPaths.length)||measured.filter((c):c is NonNullable<typeof c>=>!!c).sort((a,b)=>(a.percent??-1)-(b.percent??-1))[0];if(firstCoverage)evidence.lineCoverage=firstCoverage;const full=measured.length===2&&measured.every(c=>c&&c.changedLines>0&&c.percent===100&&!c.unmeasuredPaths.length);evidence.coverage=full?'FULL':'PARTIAL';row.reason=full?null:'Changed-line coverage incomplete or unavailable; author-declared coverage does not count';}
   else row.reason="writer's test disagrees with this change - worth a look";
   if(nativeAdmission(baseline,candidates)){
    const sdk=authored.file.runnerDirectory==='sdk/python',executionFile=sdk?{...authored.file,runnerDirectory:'.'}:authored.file;
    const deps=authored.file.framework==='vitest'?realpathSync(join(base.repoRoot,authored.file.runnerDirectory,'node_modules')):undefined;
    evidence.mutation=await verifyStep('Advisory changed-line mutation',180000,signal,s=>(dependencies.mutate??runWriterMutations)(executionFile,join(directory,'attempt-'+attempt+'-candidate-1/export'),join(directory,'attempt-'+attempt+'-mutation'),diff,s,deps));retain(evidence.mutation.reportPath);
    admittedBackup=structuredClone(evidence);
    if(evidence.mutation.survivorLine!==null&&!mutationRetryUsed){mutationRetryUsed=true;mutationFeedback='mutant on line '+evidence.mutation.survivorLine+' survived';writeFileSync(join(directory,'mutation-feedback.txt'),mutationFeedback,{mode:0o400});continue;}
   }
   break;
  }
 }catch(e){if(signal.aborted||/cleanup.*not certified/.test((e as Error).message))throw e;evidence.reason='Native writer not admitted: '+(e as Error).message;}
 finally{
  for(let n=0;n<3;n++){const dir=join(directory,'author-'+n);for(const name of ['base-input.json','output.json','unvalidated-output.json','test-file.json','test-file.sha256','session.jsonl','cost.json'])retain(join(dir,name));if(existsSync(join(dir,'cost.json'))){const c=JSON.parse(readFileSync(join(dir,'cost.json'),'utf8'));evidence.started ||= c.started;if(costs.length<=n)costs.push(c.usage??null);}}
  evidence.usage=costs.length&&costs.every(c=>c!==null)?costs.reduce((sum,c)=>({inputTokens:sum!.inputTokens+c!.inputTokens,cachedInputTokens:sum!.cachedInputTokens+c!.cachedInputTokens,outputTokens:sum!.outputTokens+c!.outputTokens,totalTokens:sum!.totalTokens+c!.totalTokens}),{inputTokens:0,cachedInputTokens:0,outputTokens:0,totalTokens:0}):null;
 }
 if(admittedBackup&&evidence.checks[0]?.status!=='ADMITTED'){const usage=evidence.usage,warnings=evidence.warnings;Object.assign(evidence,admittedBackup,{usage,warnings,reason:'Mutation retry not admitted; retained the earlier admitted advisory check.'});}
 if(evidence.coverage!=='FULL'&&!evidence.reason)evidence.reason=evidence.checks[0]?.reason??'Requested behavior not fully covered by admitted writer tests';
 const path=join(directory,'report.json');writeFileSync(path,JSON.stringify(evidence),{flag:'wx',mode:0o400});retain(path);return {evidence,records,claims:[]};
}

export function writerPolicyForEvidenceSets(old:{correct:number;wrong:number;confirmed:number;falseAccepts:number},fresh:{correct:number;wrong:number;confirmed:number;falseAccepts:number},averageTokens:number|null){return old.correct===11&&old.wrong===8&&fresh.correct===6&&fresh.wrong===6&&old.confirmed*100>=old.correct*60&&fresh.confirmed*100>=fresh.correct*60&&old.falseAccepts===0&&fresh.falseAccepts===0&&averageTokens!==null&&Number.isFinite(averageTokens)&&averageTokens>=0&&averageTokens<40000?'EVIDENCE':'ADVISORY';}
