import {existsSync,mkdirSync,readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {join,resolve,relative,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {processRun,oracleSandbox} from './oracle-execution.ts';
import {safeBuildGit} from './build-workspace.ts';
import {materializeOracleTree} from './oracle-tree.ts';
import type {QualityGateName,QualityFinding,QualityGateResult,QualityGateEvidence} from '../../packages/shared/quality-gates.ts';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url))),tools=join(root,'.work/quality-tools');
const py=(name:string)=>join(tools,'python/bin',name),js=(name:string)=>join(tools,'js/node_modules/.bin',name),bin=(name:string)=>join(tools,'bin',name);
export function changedLines(diff:string){const lines=new Map<string,Set<number>>();let path='';for(const line of diff.split('\n')){if(line.startsWith('+++ b/')){path=line.slice(6);lines.set(path,new Set());}const m=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);if(m&&path){const start=Number(m[1]),count=m[2]===undefined?1:Number(m[2]);for(let n=start;n<start+count;n++)lines.get(path)!.add(n);}}return lines;}
const key=(f:QualityFinding)=>JSON.stringify([f.path,f.rule,f.message]);
export function newQualityFindings(base:QualityFinding[],candidate:QualityFinding[],changed:Map<string,Set<number>>){const counts=new Map<string,number>();for(const f of base)counts.set(key(f),(counts.get(key(f))??0)+1);return candidate.filter(f=>{const k=key(f),n=counts.get(k)??0;if(n){counts.set(k,n-1);return false;}return changed.get(f.path)?.has(f.line)??false;});}
export function proposeQualityGates(paths:string[]):QualityGateName[]{const gates:QualityGateName[]=['opengrep','gitleaks','detect-secrets','osv'];if(paths.some(p=>p.endsWith('.py')))gates.unshift('ruff','pyright','bandit');if(paths.some(p=>/\.[cm]?[jt]sx?$/.test(p))){gates.unshift(paths.some(p=>/(^|\/)(eslint\.config\.|\.eslintrc)/.test(p))?'eslint':'oxlint');if(paths.some(p=>/(^|\/)tsconfig[^/]*\.json$/.test(p)))gates.push('tsc');}return gates;}
function records(gate:QualityGateName,text:string,workspace:string):QualityFinding[]{
 const path=(v:string)=>{const p=relative(workspace,resolve(workspace,v));if(p.startsWith('../'))throw Error('Tool diagnostic escaped export');return p;};
 const row=(p:string,n:number,r:string,m:string):QualityFinding=>({path:path(p),line:n,rule:r,message:m});
 if(gate==='tsc')return text.split('\n').filter(Boolean).map(s=>{const m=/^(.+)\((\d+),\d+\): error (TS\d+): (.+)$/.exec(s);if(!m)throw Error('TypeScript setup/configuration diagnostic');return row(m[1]!,+m[2]!,m[3]!,m[4]!);});
 const v=JSON.parse(text);
 if(gate==='pyright'&&!(v.summary?.filesAnalyzed>0))throw Error('Pyright analyzed zero files');
 if(gate==='ruff')return v.map((x:any)=>row(x.filename,x.location.row,x.code,x.message));
 if(gate==='pyright'){if(!Array.isArray(v.generalDiagnostics))throw Error('Pyright report missing');return v.generalDiagnostics.map((x:any)=>row(x.file,x.range.start.line+1,x.rule??x.severity,x.message));}
 if(gate==='bandit'){if(v.errors?.length)throw Error('Bandit parse/setup failure');return v.results.map((x:any)=>row(x.filename,x.line_number,x.test_id,x.issue_text));}
 if(gate==='opengrep'){if(v.errors?.length)throw Error('Opengrep rule or parse failure');return v.results.map((x:any)=>row(x.path,x.start.line,x.check_id,x.extra.message));}
 if(gate==='gitleaks')return (v??[]).map((x:any)=>row(x.File,x.StartLine,x.RuleID,'Potential secret (value redacted)'));
 if(gate==='detect-secrets')return Object.entries(v.results).flatMap(([p,items])=>(items as any[]).map(x=>row(p,x.line_number,x.type,'Potential secret (value redacted)')));
 if(gate==='eslint')return v.flatMap((x:any)=>{if(x.fatalErrorCount)throw Error('ESLint setup/parse error');return x.messages.map((m:any)=>row(x.filePath,m.line,m.ruleId??'parse',m.message));});
 if(gate==='oxlint')return v.diagnostics.map((x:any)=>row(x.filename,(x.labels?.[0]?.span?.line??1),x.code??'lint',x.message));
 if(gate==='osv')return (v.results??[]).flatMap((x:any)=>(x.packages??[]).flatMap((p:any)=>(p.vulnerabilities??[]).map((v:any)=>row(x.source.path,1,v.id,p.package.name+' '+p.package.version+': vulnerable dependency'))));
 throw Error('Unsupported quality report');
}
export async function runQualityGates(repo:string,base:string,candidate:string,gates:QualityGateName[],directory:string,signal:AbortSignal,exportFiles?:string[]):Promise<QualityGateEvidence>{
 const start=performance.now();mkdirSync(directory,{recursive:true,mode:0o700});const baseDir=join(directory,'base'),candidateDir=join(directory,'candidate');await materializeOracleTree(repo,base,baseDir,exportFiles);await materializeOracleTree(repo,candidate,candidateDir,exportFiles);
 const changed=changedLines((await safeBuildGit(repo,['diff','--no-ext-diff','--unified=0',base,candidate,'--'],4*1024*1024)).toString());
 const allPaths=[...new Set((await safeBuildGit(repo,['ls-tree','-r','--name-only',base],1024*1024)).toString().split('\n').concat((await safeBuildGit(repo,['ls-tree','-r','--name-only',candidate],1024*1024)).toString().split('\n')))].filter(p=>!exportFiles||exportFiles.some(e=>p===e||p.startsWith(e+'/')));
 const results:QualityGateResult[]=[];
 for(const gate of gates){const began=performance.now();let baseline:QualityFinding[]=[];let baseAdmitted=false;try{
  const execute=async(workspace:string)=>{const scratch=join(directory,gate+'-'+randomUUID());mkdirSync(scratch);const report=join(scratch,'report.json');const pythonFiles=allPaths.filter(p=>p.endsWith('.py')&&existsSync(join(workspace,p)));const jsFiles=allPaths.filter(p=>/\.[cm]?[jt]sx?$/.test(p)&&existsSync(join(workspace,p)));let argv:string[];
   switch(gate){
    case 'ruff':if(!pythonFiles.length)throw Error('No changed Python files');argv=[py('ruff'),'check','--isolated','--no-cache','--output-format=json',...pythonFiles];break;
    case 'pyright':if(!pythonFiles.length)throw Error('No changed Python files');writeFileSync(join(scratch,'pyright.json'),JSON.stringify({include:pythonFiles.map(p=>relative(scratch,join(workspace,p))),exclude:[],pythonVersion:'3.12',typeCheckingMode:'basic'}));argv=[process.execPath,realpathSync(js('pyright')),'--outputjson','--project',join(scratch,'pyright.json')];break;
    case 'bandit':if(!pythonFiles.length)throw Error('No changed Python files');argv=[py('bandit'),'-f','json','--ignore-nosec','-q',...pythonFiles];break;
    case 'oxlint':if(!jsFiles.length)throw Error('No changed JS/TS files');argv=[js('oxlint'),'--format=json','--disable-nested-config',...jsFiles];break;
    case 'eslint':if(!jsFiles.length)throw Error('No changed JS/TS files');argv=[process.execPath,realpathSync(js('eslint')),'--format=json',...jsFiles];break;
    case 'tsc':{const config=allPaths.find(p=>/(^|\/)tsconfig\.json$/.test(p));if(!config)throw Error('No BASE tsconfig');argv=[process.execPath,realpathSync(js('tsc')),'--noEmit','--pretty','false','--incremental','false','-p',config];break;}
    case 'opengrep':argv=[bin('opengrep'),'scan','--config',join(root,'scripts/quality-gates/opengrep.yaml'),'--json','--disable-version-check','--no-git-ignore','--disable-nosem','.'];break;
    case 'gitleaks':argv=[bin('gitleaks'),'dir','--config',join(root,'scripts/quality-gates/gitleaks.toml'),'--no-banner','--redact','--report-format=json','--report-path',report,'.'];break;
    case 'detect-secrets':argv=[py('detect-secrets'),'scan','--all-files','--no-verify','.'];break;
    case 'osv':{const locks=allPaths.filter(p=>/(^|\/)(package-lock\.json|requirements[^/]*\.txt|poetry\.lock|uv\.lock|Pipfile\.lock)$/.test(p));if(!locks.length)throw Error('No supported dependency lockfile');argv=[bin('osv-scanner'),'scan','source','--offline','--no-resolve','--format=json',...locks.flatMap(p=>['--lockfile',join(workspace,p)])];break;}
   }
   const env:NodeJS.ProcessEnv={PATH:dirname(process.execPath)+':/usr/local/bin:/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,LANG:'C',LC_ALL:'C',TZ:'UTC',PYTHONDONTWRITEBYTECODE:'1',PYRIGHT_PYTHON_GLOBAL_NODE:'on',XDG_CACHE_HOME:join(tools,'cache'),OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY:join(tools,'osv-db'),SEMGREP_SEND_METRICS:'off',SEMGREP_ENABLE_VERSION_CHECK:'0'};
   const launcher=join(scratch,'launch.py');writeFileSync(launcher,'import json,os,sys\nv=json.loads(sys.stdin.readline())\nos.chdir(v["cwd"])\nos.execve(v["argv"][0],v["argv"],v["env"])\n');
   const execution=await processRun(['/usr/local/bin/python3','-I',launcher],scratch,env,oracleSandbox([workspace,tools,join(root,'scripts/quality-gates'),dirname(process.execPath)],scratch,true,false,true),JSON.stringify({argv,cwd:workspace,env})+'\n',signal,{},60000);
   if(!execution.cleanup.verified||execution.cleanup.ambiguous||execution.cleanup.remaining.length||execution.limited||execution.timedOut||execution.interrupted||execution.code===null||![0,1].includes(execution.code)&&!(gate==='pyright'&&execution.code===2))throw Error('Gate execution/setup incomplete');
   const text=gate==='gitleaks'?readFileSync(report,'utf8'):execution.stdout;
   if(gate==='detect-secrets')writeFileSync(join(scratch,'detect-secrets.baseline'),text,{mode:0o400});
   const findings=records(gate,text,workspace);if(gate==='osv')for(const f of findings)f.line=[...(changed.get(f.path)??[])][0]??1;if(execution.code!==0&&!findings.length)throw Error('Gate failed without structured findings');return findings;
  };
  baseline=await execute(baseDir);baseAdmitted=true;const found=await execute(candidateDir),introduced=newQualityFindings(baseline,found,changed);
  results.push({gate,status:introduced.length?'FAIL':'PASS',findings:introduced,baselineCount:baseline.length,durationMs:performance.now()-began});
 }catch(error){if(signal.aborted)throw error;results.push({gate,status:baseAdmitted?'ERROR':'NOT APPLICABLE',reason:baseAdmitted?'Candidate check could not run: '+(error as Error).message:'BASE check could not run cleanly: '+(error as Error).message,findings:[],baselineCount:baseline.length,durationMs:performance.now()-began});}}
 const evidence:QualityGateEvidence={version:'quality-gates-v1',base,candidate,gates:results,durationMs:performance.now()-start};writeFileSync(join(directory,'quality-gates.json'),JSON.stringify(evidence,null,2),{flag:'wx',mode:0o400});return evidence;
}
