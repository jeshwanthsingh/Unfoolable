import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {acquireDatabaseLock} from '../apps/server/database-lock.ts';
test('database ownership rejects live/reused or ambiguous PID without changing its lock',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-lock-'));try{
  for(const old of [JSON.stringify({pid:process.pid,id:'other'}),'malformed',JSON.stringify({pid:-1})]){
   writeFileSync(join(dir,'.coordinator.lock'),old);assert.throws(()=>acquireDatabaseLock(dir));assert.equal(readFileSync(join(dir,'.coordinator.lock'),'utf8'),old);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('confirmed dead coordinator lock is replaced atomically and released by its new owner',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cc-lock-'));try{
  const child=spawn(process.execPath,['-e','process.exit(0)']);await once(child,'exit');
  writeFileSync(join(dir,'.coordinator.lock'),JSON.stringify({pid:child.pid,id:'dead'}));
  const release=acquireDatabaseLock(dir);assert.equal(JSON.parse(readFileSync(join(dir,'.coordinator.lock'),'utf8')).pid,process.pid);assert.throws(()=>acquireDatabaseLock(dir));release();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
