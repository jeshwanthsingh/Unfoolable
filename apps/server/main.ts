import {loadConfig} from './config.ts';
import {createApplication} from './application.ts';
import {log} from './log.ts';
import {publicStartupError} from './errors.ts';

try{
 const app=createApplication(loadConfig());await app.start();
 const stop=()=>{void app.close().then(()=>{process.exitCode=0;}).catch(error=>{log({level:'error',event:'shutdown.failed',...publicStartupError(error)});process.exitCode=1;});};
 // npm/supervisors can forward a second signal while HTTP is draining.
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(error){log({level:'error',event:'server.start_failed',...publicStartupError(error)});process.exitCode=1;}
