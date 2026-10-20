import {execFileSync,spawn} from 'node:child_process';
import {processIdentity,ownedProcessSnapshot,reconcileOwnedProcesses} from './build-processes.ts';
import type {ProcessRecord} from '../../packages/shared/build.ts';
export function onACPower(){try{return process.platform==='darwin'&&/Now drawing from 'AC Power'/.test(execFileSync('/usr/bin/pmset',['-g','batt'],{encoding:'utf8',timeout:2000,maxBuffer:8192}));}catch{return false;}}
/** A waiting helper is recorded before it is released to start caffeinate. */
export async function keepNightAwake(end:number):Promise<{records:ProcessRecord[];close:()=>Promise<void>}>{
 if(process.platform!=='darwin')throw Error('Night Shift requires macOS power controls.');
 const code=`let child;const startup=setTimeout(()=>process.exit(1),3000);startup.unref();process.stdin.setEncoding('utf8');process.stdin.once('data',()=>{clearTimeout(startup);child=require('node:child_process').spawn('/usr/bin/caffeinate',['-dims','-w',String(process.pid),'-t',String(Math.max(1,Math.ceil((${end}-Date.now())/1000)))],{stdio:'ignore'});child.once('spawn',()=>console.log('ready'));child.once('error',()=>process.exit(1));child.once('exit',()=>process.exit(0));});process.stdin.once('end',()=>process.exit(0));`;
 const child=spawn(process.execPath,['-e',code],{detached:true,stdio:['pipe','pipe','ignore']});let root:ProcessRecord|null=null;
 child.stdin.on('error',()=>{});child.on('error',()=>{});
 try{await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});root=processIdentity(child.pid!);if(!root||root.exitedAt)throw Error('Keep-awake ownership unavailable.');const ready=new Promise<void>((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Keep-awake startup timed out.')),2000);child.stdout.once('data',()=>{clearTimeout(t);resolve();});child.once('exit',()=>{clearTimeout(t);reject(Error('Keep-awake exited.'));});});child.stdin.write('start\n');await ready;const records=ownedProcessSnapshot(root.pid);if(!records.some(r=>r.birth===root!.birth&&r.pid===root!.pid)||!records.some(r=>r.executable==='/usr/bin/caffeinate'))throw Error('Keep-awake child ownership unavailable.');return {records,close:async()=>{const result=await reconcileOwnedProcesses(records);child.stdin.end();if(!result.verified||result.ambiguous||result.remaining.length)throw Error('Keep-awake cleanup is uncertain.');}};
 }catch(error){child.stdin.end();if(root){const result=await reconcileOwnedProcesses([root]);if(!result.verified)throw Error('Keep-awake cleanup is uncertain.');}throw error;}
}

export function notifyNightEnded(){execFileSync('/usr/bin/osascript',['-e','display notification "Night Shift stopped. Your work is waiting for review." with title "Unfoolable"'],{timeout:4000,maxBuffer:4096,stdio:'ignore'});}
