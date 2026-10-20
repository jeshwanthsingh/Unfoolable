import {stripVTControlCharacters} from 'node:util';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {SpecError} from './spec-errors.ts';
export const BUG_LOG_LIMIT=19000;
export const BUG_LOG_PREFIX='Bug from this log:\n';
export type BugSignature={exceptionType:string;message:string;frame:{file:string;function:string;line:number}};
export type BugLog={text:string;redactedLines:number[];signature:BugSignature|null};
/** Literal traceback extraction, never executable content or grader instructions. */
export function bugSignature(text:string):BugSignature|null{
 const exceptions=[...text.matchAll(/^([A-Za-z_][\w.]*(?:Error|Exception)):\s*(.{1,240})$/gm)];const error=exceptions.at(-1);
 const frames=[...text.matchAll(/^\s*File "([^"\n]+)", line (\d+), in ([\w.<>]+)\s*$/gm)].filter(m=>!/(?:site-packages|unittest|test_[^/]*\.py)/.test(m[1]!));
 const frame=frames.at(-1);if(!error||!frame||error[2]!.includes('[redacted]'))return null;
 return {exceptionType:error[1]!,message:error[2]!,frame:{file:frame[1]!.replaceAll('\\','/'),function:frame[3]!,line:Number(frame[2])}};
}
export function matchesBugFailure(signature:BugSignature,trace:string){
 const actual=bugSignature(trace);return !!actual&&actual.exceptionType===signature.exceptionType&&actual.message===signature.message&&(actual.frame.file===signature.frame.file||actual.frame.file.endsWith('/'+signature.frame.file))&&actual.frame.function===signature.frame.function&&actual.frame.line===signature.frame.line;
}
export function looksLikeBugLog(text:string){return text.startsWith(BUG_LOG_PREFIX)||/Traceback \(most recent call last\):/.test(text)||/^\w*(?:Error|Exception):[^\n]+\n\s+at /m.test(text);}
/** Both existing scanners run locally before persistence or any model call. */
export function redactBugLog(dataDir:string,input:unknown):BugLog{
 if(typeof input!=='string'||!input.trim()||Buffer.byteLength(input)>BUG_LOG_LIMIT||input.includes('\0'))throw new SpecError('INVALID_BUG_LOG','Paste an error log smaller than 19 KB.',400);
 const text=stripVTControlCharacters(input),parent=join(dataDir,'bug-intake');mkdirSync(parent,{recursive:true,mode:0o700});const scratch=mkdtempSync(join(parent,'scan-'));
 try{
  writeFileSync(join(scratch,'input.log'),text,{mode:0o600});const tools=resolve('.work/quality-tools'),env={PATH:'/usr/local/bin:/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,LANG:'C',TZ:'UTC'};
  const leaks=spawnSync(join(tools,'bin/gitleaks'),['dir','--config',resolve('scripts/quality-gates/gitleaks.toml'),'--no-banner','--ignore-gitleaks-allow','--gitleaks-ignore-path',join(scratch,'no-ignore'),'--redact','--report-format=json','--report-path',join(scratch,'report.json'),scratch],{cwd:scratch,env,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  if(leaks.error||![0,1].includes(leaks.status!))throw Error('Gitleaks scan failed');
  const first=JSON.parse(readFileSync(join(scratch,'report.json'),'utf8')) as {File:string;StartLine:number;EndLine:number}[];
  // Scan only the original file; the first scanner report must not become input.
  rmSync(join(scratch,'report.json'));
  const secrets=spawnSync(join(tools,'python/bin/detect-secrets'),['scan','--all-files','--no-verify','--disable-filter','detect_secrets.filters.allowlist.is_line_allowlisted','input.log'],{cwd:scratch,env,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  if(secrets.error||secrets.status!==0)throw Error('detect-secrets scan failed');
  const second=JSON.parse(secrets.stdout),lines=new Set<number>();for(const r of first)for(let n=r.StartLine;n<=r.EndLine;n++)lines.add(n);
  for(const rows of Object.values(second.results??{}) as {line_number:number}[][])for(const r of rows)lines.add(r.line_number);
  const clean=text.split('\n').map((line,i)=>lines.has(i+1)?'[redacted]':line).join('\n');return {text:clean,redactedLines:[...lines].sort((a,b)=>a-b),signature:bugSignature(clean)};
 }catch{throw new SpecError('BUG_SCAN_FAILED','The log could not be checked for secrets. Nothing was sent to the AI; try again.',503);}finally{rmSync(scratch,{recursive:true,force:true});}
}
