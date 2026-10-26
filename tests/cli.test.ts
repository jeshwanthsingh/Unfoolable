import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer,connect} from 'node:net';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {once} from 'node:events';

test('CLI absorbs repeated shutdown signals and releases its lock before exit',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-cli-'));const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const addr=reservation.address();assert.ok(addr&&typeof addr!=='string');const port=addr.port;await new Promise<void>(resolve=>reservation.close(()=>resolve()));
 const child=spawn(process.execPath,[fileURLToPath(new URL('../apps/server/main.ts',import.meta.url))],{env:{...process.env,COMMAND_CENTER_DATA_DIR:dir,COMMAND_CENTER_PROJECT_ROOTS:JSON.stringify([dir]),COMMAND_CENTER_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 const exit=once(child,'exit');const events:string[]=[];let readyResolve:()=>void=()=>{};let stoppingResolve:()=>void=()=>{};
 const ready=new Promise<void>(resolve=>readyResolve=resolve),stopping=new Promise<void>(resolve=>stoppingResolve=resolve);
 createInterface({input:child.stdout}).on('line',line=>{try{const e=JSON.parse(line) as {event:string};events.push(e.event);if(e.event==='server.started')readyResolve();if(e.event==='shutdown.started')stoppingResolve();}catch{}});
 const timer=setTimeout(()=>child.kill('SIGKILL'),7000);
 try{
  await Promise.race([ready,exit.then(()=>{throw new Error('CLI failed startup');})]);
  // An incomplete request keeps shutdown in flight so the second signal is real.
  const held=connect(port,'127.0.0.1');held.on('error',()=>{});await once(held,'connect');held.write('GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\n');
  child.kill('SIGTERM');await Promise.race([stopping,exit.then(()=>{throw new Error('No shutdown event');})]);child.kill('SIGTERM');
  const [code,signal]=await exit;held.destroy();assert.equal(signal,null);assert.equal(code,0);assert.ok(events.includes('shutdown.completed'));assert.equal(existsSync(join(dir,'.coordinator.lock')),false);
 }finally{clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exit;}rmSync(dir,{recursive:true});}
});
