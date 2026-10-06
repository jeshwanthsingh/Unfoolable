import {resolve} from 'node:path';
import {failure} from './errors.ts';
export type AppConfig=Readonly<{port:number;dataDir:string;webRoot:string;development:boolean}>;
export function loadConfig(env:NodeJS.ProcessEnv=process.env,projectRoot=process.cwd()):AppConfig {
 const raw=env.COMMAND_CENTER_PORT??'3210';
 if(!/^\d+$/.test(raw)||Number(raw)<1024||Number(raw)>65535)throw failure('INVALID_CONFIG','COMMAND_CENTER_PORT must be an integer between 1024 and 65535');
 const data=env.COMMAND_CENTER_DATA_DIR??'data';
 if(!data.trim()||data.includes('\0'))throw failure('INVALID_CONFIG','COMMAND_CENTER_DATA_DIR must be a nonempty filesystem path');
 return {port:Number(raw),dataDir:resolve(projectRoot,data),webRoot:resolve(projectRoot,'dist/web'),development:env.NODE_ENV==='development'};
}
