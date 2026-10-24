import {mkdirSync,writeFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,join,relative,dirname,matchesGlob} from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {processRun,oracleSandbox} from './oracle-execution.ts';import {materializeOracleTree} from './oracle-tree.ts';import {safeBuildGit} from './build-workspace.ts';import {changedLines} from './quality-gates.ts';
import type {ProjectRule,ProjectRuleFinding,ProjectRuleEvidence} from '../../packages/shared/project-rules.ts';
const source=fileURLToPath(new URL('../../',import.meta.url)),root=existsSync(join(source,'scripts/quality-gates'))?source:process.cwd();
export async function runProjectRules(repo:string,base:string,candidate:string,rules:ProjectRule[],directory:string,signal:AbortSignal,exportFiles?:string[]):Promise<ProjectRuleEvidence>{
 if(!rules.length||rules.length>40)throw Error('Project rules require a bounded approved definition');
 mkdirSync(directory,{recursive:true,mode:0o700});const tools=realpathSync(join(root,'.work/quality-tools')),executable=join(tools,'bin/opengrep');
 const config=join(directory,'rules.json');writeFileSync(config,JSON.stringify({rules:rules.map(r=>({id:r.id,languages:[r.language],severity:'ERROR',message:r.message,paths:{include:[r.path]},...(r.pattern!==undefined?{pattern:r.pattern}:{'pattern-regex':r.patternRegex})}))}),{flag:'wx',mode:0o400});
 const diff=(await safeBuildGit(repo,['-c','core.quotePath=false','diff','--no-ext-diff','--no-textconv','--unified=0',base,candidate,'--'],4194304)).toString(),changed=changedLines(diff);
 const outside=[...changed.keys()].find(path=>rules.some(rule=>matchesGlob(path,rule.path))&&exportFiles&&!exportFiles.some(p=>path===p||path.startsWith(p+'/')));
 if(outside)throw Error('A project rule targets changed code outside the approved export; review the export scope.');
 const execute=async(commit:string,phase:string)=>{
  const workspace=join(directory,phase),scratch=join(directory,phase+'-scratch');mkdirSync(scratch);await materializeOracleTree(repo,commit,workspace,exportFiles);
  const launcher=join(scratch,'launch.py');writeFileSync(launcher,'import json,os,sys\nv=json.loads(sys.stdin.readline())\nos.chdir(v["cwd"])\nos.execve(v["argv"][0],v["argv"],v["env"])\n',{mode:0o400});
  const env={PATH:dirname(process.execPath)+':/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,SEMGREP_SEND_METRICS:'off',SEMGREP_ENABLE_VERSION_CHECK:'0',PYTHONDONTWRITEBYTECODE:'1',LANG:'C',LC_ALL:'C'};
  const argv=[executable,'scan','--config',config,'--json','--jobs','1','--timeout','10','--disable-version-check','--no-git-ignore','--disable-nosem','--x-ignore-semgrepignore-files','.'];
  const run=await processRun(['/usr/local/bin/python3',launcher],workspace,env,oracleSandbox([workspace,scratch,tools,config,dirname(process.execPath)],scratch,true,false,true),JSON.stringify({cwd:workspace,argv,env})+'\n',signal,{},60000);
  if(!run.cleanup.verified||run.cleanup.ambiguous||run.cleanup.remaining.length)throw Object.assign(Error('Project rule scanner cleanup uncertain'),{oracleCleanup:run.cleanup});
  writeFileSync(join(scratch,'execution.json'),JSON.stringify(run),{flag:'wx',mode:0o400});
  if(run.code===null||![0,1].includes(run.code)||run.limited||run.timedOut||run.interrupted)throw Error('Project rule scanner did not complete (see its protected execution record)');
  let report:any;try{report=JSON.parse(run.stdout);}catch{throw Error('Project rule scanner report unavailable');}
  if(!Array.isArray(report.results)||!Array.isArray(report.errors)||report.errors.length)throw Error('Project rule or source parsing failed');
  const findings:ProjectRuleFinding[]=report.results.map((r:any)=>{const rule=rules.find(x=>r.check_id===x.id||r.check_id?.endsWith('.'+x.id));const path=relative(workspace,resolve(workspace,String(r.path)));if(!rule||!path||path.startsWith('../')||!matchesGlob(path,rule.path)||!Number.isSafeInteger(r.start?.line)||r.start.line<1||!Number.isSafeInteger(r.end?.line)||r.end.line<r.start.line)throw Error('Project rule scanner binding invalid');return {rule:rule.id,path,line:r.start.line,endLine:r.end.line,message:rule.message};});
  if(run.code!==0&&!findings.length)throw Error('Project rule scanner failed without findings');
  writeFileSync(join(scratch,'report.json'),JSON.stringify({findings,cleanup:run.cleanup}),{flag:'wx',mode:0o400});return findings;
 };
 const preexisting=await execute(base,'base'),candidateFindings=await execute(candidate,'candidate'),notAdmitted=new Set(preexisting.map(f=>f.rule));
 const findings=candidateFindings.filter(f=>!notAdmitted.has(f.rule)&&[...(changed.get(f.path)??[])].some(line=>line>=f.line&&line<=f.endLine));
 const result:ProjectRuleEvidence={version:'project-rules-v1',base,candidate,rulesHash:createHash('sha256').update(JSON.stringify(rules)).digest('hex'),status:findings.length?'FAIL':'PASS',findings,preexisting};
 writeFileSync(join(directory,'project-rules.json'),JSON.stringify(result),{flag:'wx',mode:0o400});return result;
}
