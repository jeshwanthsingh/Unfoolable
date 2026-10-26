import {extraProtectedPaths} from './builder-private-paths.ts';
import {resolve} from 'node:path';
import {failure} from './errors.ts';
import {homedir} from 'node:os';
import {statSync} from 'node:fs';
import {absoluteRepoPath} from './repository.ts';
export type AppConfig=Readonly<{port:number;dataDir:string;webRoot:string;development:boolean;projectRoots:readonly string[]}>;
export function loadConfig(env:NodeJS.ProcessEnv=process.env,projectRoot=process.cwd()):AppConfig {
 try{extraProtectedPaths(env);}catch{throw failure('INVALID_CONFIG','COMMAND_CENTER_EXTRA_PROTECTED_PATHS must be a JSON array of at most 64 absolute or ~/ paths');}
 const raw=env.COMMAND_CENTER_PORT??'3210';
 if(!/^\d+$/.test(raw)||Number(raw)<1024||Number(raw)>65535)throw failure('INVALID_CONFIG','COMMAND_CENTER_PORT must be an integer between 1024 and 65535');
 const data=env.COMMAND_CENTER_DATA_DIR??'data';
 if(!data.trim()||data.includes('\0'))throw failure('INVALID_CONFIG','COMMAND_CENTER_DATA_DIR must be a nonempty filesystem path');
 let projectRoots: string[];
 try {
  const configured:unknown=env.COMMAND_CENTER_PROJECT_ROOTS===undefined?[resolve(homedir(),'Projects')]:JSON.parse(env.COMMAND_CENTER_PROJECT_ROOTS);
  if(!Array.isArray(configured)||!configured.length||configured.length>16)throw new Error('Invalid roots');
  projectRoots=[...new Set(configured.map(absoluteRepoPath))];
  if(projectRoots.some(root=>!statSync(root).isDirectory()))throw new Error('Invalid directory');
 }catch{throw failure('INVALID_CONFIG','COMMAND_CENTER_PROJECT_ROOTS must be a JSON array of existing absolute or ~/ directory paths');}
 return {port:Number(raw),dataDir:resolve(projectRoot,data),webRoot:resolve(projectRoot,'dist/web'),development:env.NODE_ENV==='development',projectRoots};
}
