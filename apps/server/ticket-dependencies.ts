import {safeBuildGit} from './build-workspace.ts';
import {existsSync,lstatSync,readFileSync,mkdirSync,writeFileSync,cpSync} from 'node:fs';import {join,resolve,relative,isAbsolute,dirname} from 'node:path';import {execFileSync} from 'node:child_process';import type {ProjectPlaybookDefinition} from '../../packages/shared/playbooks.ts';import type {ticketWorkspace} from './ticket-workspace.ts';import {ProjectPlaybookError} from './project-playbooks.ts';
import {oracleSandbox,processRun} from './oracle-execution.ts';
export function npmLockInputs(directory:string){
 const manifest=join(directory,'package.json'),lock=join(directory,'package-lock.json');if(!existsSync(manifest))return null;
 if(!existsSync(lock))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Dependencies need a committed package-lock.json before building.');
 for(const path of [manifest,lock])if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()||lstatSync(path).size>8*1024*1024)throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Dependency inputs must be bounded regular BASE files.');
 const packageText=readFileSync(manifest,'utf8'),lockText=readFileSync(lock,'utf8');let parsed:any;try{JSON.parse(packageText);parsed=JSON.parse(lockText);}catch{throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Dependency manifest or lockfile is invalid.');}
 if(![2,3].includes(parsed.lockfileVersion)||!parsed.packages||typeof parsed.packages!=='object')throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Use an npm version 2 or 3 lockfile.');
 for(const [path,value] of Object.entries(parsed.packages) as [string,any][]){if(path==='')continue;if(!path.startsWith('node_modules/')||path.split('/').some(p=>p==='..'||p==='.'))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Workspace/local dependencies require a reviewed setup; they are not downloaded automatically.');
 if(value?.link||typeof value?.resolved!=='string'||!value.resolved.startsWith('https://registry.npmjs.org/')||typeof value.integrity!=='string'||!/^sha(?:256|512)-/.test(value.integrity))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Only integrity-pinned npm registry packages may be prepared automatically.');}
 return {packageText,lockText};
}
export function pythonLockInputs(directory:string){
 const path=['requirements.lock','requirements.txt'].map(p=>join(directory,p)).find(existsSync);if(!path){if(['uv.lock','poetry.lock'].some(p=>existsSync(join(directory,p))))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','This Python lock format needs an explicit reviewed preparation path.');return null;}
 if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()||lstatSync(path).size>1024*1024)throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Python lock must be a bounded regular BASE file.');
 const text=readFileSync(path,'utf8'),lines=text.replace(/\\\r?\n/g,' ').split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
 if(!lines.length)return null;
 if(lines.some(l=>!/^[-a-zA-Z0-9_.]+==[a-zA-Z0-9_.+!-]+(?:\s+--hash=sha256:[a-f0-9]{64})+$/.test(l)))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Python dependencies must have exact versions and SHA256 hashes; source packages, URLs and installer options are not allowed.');
 return lines.join('\n')+'\n';
}
async function requireBaseInput(owned:Awaited<ReturnType<typeof ticketWorkspace>>,directory:string,name:string){
 const file=join(directory,name),path=relative(owned.workspace,file).split('\\').join('/');
 let base:Buffer;try{base=await safeBuildGit(owned.clone,['show',owned.base+':'+path],8*1024*1024);}catch{throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Dependency inputs must be present in the ticket BASE.');}
 if(!base.equals(readFileSync(file)))throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Dependency inputs changed from BASE; preparation needs human review before another build.');
}
async function installPinned(argv:string[],staging:string,env:NodeJS.ProcessEnv,signal:AbortSignal){
 const python=execFileSync('/usr/bin/which',['python3'],{encoding:'utf8'}).trim(),launcher=join(staging,'install-launch.py');
 // Hold on stdin until the existing supervisor has certified PID + kernel start time.
 // This trusted parent stays alive while the package manager runs, so cleanup is owned.
 writeFileSync(launcher,'import json,subprocess,sys\nv=json.loads(sys.stdin.readline())\np=subprocess.run(v)\nsys.exit(p.returncode)\n');
 const reads=[staging,dirname(python),...argv.filter(p=>p.startsWith('/')&&existsSync(p)).map(dirname),...env.PATH!.split(':')];
 const npmRoot=execFileSync('/usr/bin/which',['npm'],{encoding:'utf8'}).trim();reads.push(resolve(dirname(npmRoot),'../lib/node_modules/npm'));
 // Only this coordinator installer profile has network. Builder/verifier profiles are unchanged.
 const profile=oracleSandbox(reads,staging,true,false,true).replace('(deny network*)','');
 const result=await processRun([python,launcher],staging,env,profile,JSON.stringify(argv)+'\n',signal,{onProcesses:records=>{writeFileSync(join(staging,'install-owner.json'),JSON.stringify(records));}},180000);
 writeFileSync(join(staging,'install-result.json'),JSON.stringify({exitCode:result.code,limited:result.limited,timedOut:result.timedOut,interrupted:result.interrupted,cleanup:result.cleanup}));
 if(result.code!==0||result.limited||result.timedOut||result.interrupted||!result.cleanup.verified||result.cleanup.ambiguous||result.cleanup.remaining.length)throw Error('Owned dependency preparation failed');
}
/** Coordinator-only, before the model starts. Never executes repository lifecycle scripts. */
export async function prepareTicketDependencies(owned:Awaited<ReturnType<typeof ticketWorkspace>>,definition:ProjectPlaybookDefinition,signal:AbortSignal){
 const prepared:string[]=[],managed:string[]=[];const directories=[...new Set(definition.tests.map(c=>c.cwd))];
 for(const cwd of directories){if(signal.aborted)throw Error('Dependency preparation interrupted');const directory=resolve(owned.workspace,cwd),rel=relative(owned.workspace,directory);if(isAbsolute(rel)||rel==='..'||rel.startsWith('../'))throw Error('Dependency cwd escaped');
 const inputs=npmLockInputs(directory);if(!inputs){const pythonLock=pythonLockInputs(directory);if(!pythonLock)continue;await requireBaseInput(owned,directory,existsSync(join(directory,'requirements.lock'))?'requirements.lock':'requirements.txt');
 const staging=join(owned.artifactDir,'dependency-preparation','python-'+prepared.length);mkdirSync(staging,{recursive:true,mode:0o700});const lock=join(staging,'requirements.lock');writeFileSync(lock,pythonLock);const scratch=join(staging,'scratch');mkdirSync(scratch);const python=execFileSync('/usr/bin/which',['python3'],{encoding:'utf8'}).trim(),target=join(staging,'site-packages');
 try{await installPinned([python,'-m','pip','install','--isolated','--require-hashes','--only-binary=:all:','--no-compile','--disable-pip-version-check','--index-url=https://pypi.org/simple','--target='+target,'-r',lock],staging,{PATH:dirname(python)+':/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,LANG:'C',PIP_CONFIG_FILE:'/dev/null'},signal);}catch{throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Pinned wheel preparation failed; Builder was not started.');}
 cpSync(target,join(owned.workspace,'.cc-runtime/python-site'),{recursive:true});prepared.push(cwd);continue;}
 await requireBaseInput(owned,directory,'package.json');await requireBaseInput(owned,directory,'package-lock.json');
 const staging=join(owned.artifactDir,'dependency-preparation',String(prepared.length));mkdirSync(staging,{recursive:true,mode:0o700});writeFileSync(join(staging,'package.json'),inputs.packageText);writeFileSync(join(staging,'package-lock.json'),inputs.lockText);const empty=join(staging,'empty.npmrc'),globalConfig=join(staging,'global.npmrc');writeFileSync(empty,'');writeFileSync(globalConfig,'');const scratch=join(staging,'scratch');mkdirSync(scratch);
 const npm=execFileSync('/usr/bin/which',['npm'],{encoding:'utf8'}).trim(),node=execFileSync('/usr/bin/which',['node'],{encoding:'utf8'}).trim();
 try{await installPinned([npm,'ci','--ignore-scripts','--no-audit','--no-fund','--userconfig='+empty,'--globalconfig='+globalConfig,'--cache='+join(staging,'cache')],staging,{PATH:dirname(node)+':/usr/bin:/bin',HOME:scratch,TMPDIR:scratch,LANG:'C',CI:'1'},signal);}catch{throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Pinned dependency preparation failed; Builder was not started. Review setup before retrying.');}
 const installedPath=relative(owned.workspace,join(directory,'node_modules')).split('\\').join('/');if((await safeBuildGit(owned.clone,['ls-tree','-r','--name-only',owned.base,'--',installedPath],65536)).length)throw new ProjectPlaybookError('PLAYBOOK_REQUIRED','Tracked dependency directories need a reviewed preparation path.');
 if(existsSync(join(staging,'node_modules'))){managed.push(installedPath);cpSync(join(staging,'node_modules'),join(directory,'node_modules'),{recursive:true,errorOnExist:true,force:false});}prepared.push(cwd);
 }
 writeFileSync(join(owned.artifactDir,'managed-dependencies.json'),JSON.stringify({paths:managed}),{flag:'wx',mode:0o400});
 return {prepared,networkOwner:'coordinator',lifecycleScripts:false};
}
