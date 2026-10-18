import {existsSync,mkdirSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';import {spawn} from 'node:child_process';
import {processIdentity} from '../apps/server/build-processes.ts';
export async function ensureCoordinator(root:string,dataDir:string,port:string|number){
 const url='http://localhost:'+port;
 async function healthy(){try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(700)});const b=await r.json();return r.ok&&b.status==='ok'&&b.coordinator==='online';}catch{return false;}}
 if(await healthy())return;
 const folder=join(root,'.work/launcher');mkdirSync(folder,{recursive:true,mode:0o700});
 if(!existsSync(join(root,'dist/web/index.html')))await new Promise<void>((resolve,reject)=>{const p=spawn(join(process.execPath,'..','npm'),['run','build'],{cwd:root,stdio:'inherit'});p.once('error',reject);p.once('exit',c=>c===0?resolve():reject(Error('Unfoolable could not build. Run npm run build, then try again.')));});
 const log=openSync(join(folder,'coordinator-'+port+'.log'),'a',0o600);
 const child=spawn(process.execPath,[join(root,'scripts/local-coordinator.ts')],{cwd:root,detached:true,stdio:['ignore',log,log,'ipc'],env:{...process.env,COMMAND_CENTER_PORT:String(port),COMMAND_CENTER_DATA_DIR:dataDir}});closeSync(log);
 let spawnError=false;child.once('error',()=>{spawnError=true;});
 let identity=null;for(let n=0;n<20&&!spawnError;n++){if(child.pid){try{identity=processIdentity(child.pid);}catch{}if(identity)break;}await new Promise(r=>setTimeout(r,50));}
 if(!identity){child.disconnect?.();child.unref();throw Error('Unfoolable could not track its coordinator. Nothing was started.');}
 writeFileSync(join(folder,'coordinator-'+port+'.json'),JSON.stringify(identity),{mode:0o600});
 child.send('start');child.unref();
 for(let n=0;n<100;n++){if(await healthy())return;await new Promise(r=>setTimeout(r,100));}
 throw Error('Unfoolable could not start. See the local coordinator log, then run unfool again.');
}
