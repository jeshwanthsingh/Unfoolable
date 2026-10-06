import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {loadConfig} from '../apps/server/config.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=loadConfig(process.env,root);
const env={...process.env,NODE_ENV:'development',COMMAND_CENTER_PORT:String(config.port)};
const children=[spawn(process.execPath,['--watch','apps/server/main.ts'],{cwd:root,env,stdio:'inherit',detached:true}),spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--config','apps/web/vite.config.ts'],{cwd:root,env,stdio:'inherit',detached:true})];
console.log(JSON.stringify({event:'development.started',web:'http://127.0.0.1:5173',coordinator:`http://127.0.0.1:${config.port}`}));
let stopping=false;
function signalOwned(child,signal){try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}}
function stop(code){if(stopping)return;stopping=true;process.exitCode=code;for(const child of children)signalOwned(child,'SIGTERM');const timer=setTimeout(()=>{for(const child of children)if(child.exitCode===null&&child.signalCode===null)signalOwned(child,'SIGKILL');},3500);timer.unref();}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>{if(!stopping)stop(code??1);});}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
