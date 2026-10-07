import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {release} from 'node:os';
import {canonicalContractJson} from './contract-store.ts';
/** Stable identity of the actual local verifier toolchain; no inherited secrets or transient run paths. */
export function verifierEnvironment():{hash:string;manifest:Record<string,unknown>} {
 const version=(executable:string,argv:string[],path:string)=>{
  try{const output=execFileSync(executable,argv,{env:{PATH:path,HOME:'/nonexistent',LANG:'C',LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},timeout:3000,maxBuffer:1024,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();return output&&Buffer.byteLength(output)<=1024?output:'unavailable';}catch{return 'unavailable';}
 };
 const manifest={version:'verifier-environment-v1',platform:process.platform,architecture:process.arch,osRelease:release(),nodeVersion:process.version,nodeExecutable:process.execPath,gitVersion:version('git',['--version'],process.env.PATH??'/usr/bin:/bin'),pythonExecutable:'/usr/local/bin/python3',pythonVersion:version('/usr/local/bin/python3',['-I','--version'],'/usr/bin:/bin')};
 return {hash:createHash('sha256').update(canonicalContractJson(manifest)).digest('hex'),manifest};
}
