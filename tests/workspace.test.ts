import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspace} from '../apps/web/src/useWorkspace.ts';
const project=(id:string)=>({id,displayName:id,repoRoot:'/allowed/'+id,registeredHead:'a'.repeat(40),registeredBranch:'main',createdAt:'2026-01-01T00:00:00Z'});
const mission={id:'m',projectId:'a',originalIntent:'Fix login.',phase:'DRAFT',createdAt:'2026-01-01T00:00:00Z'};
const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('one stalled optional Mission list is bounded and preserves successful Project/Mission reads',async t=>{
 const deadlines:AbortController[]=[];t.mock.method(AbortSignal,'timeout',(ms:number)=>{assert.equal(ms,20000);const c=new AbortController();deadlines.push(c);return c.signal;});
 let started!:()=>void;const pending=new Promise<void>(resolve=>{started=resolve;});
 const request:typeof fetch=async(input,init)=>{
  if(String(input)==='/api/projects')return json({projects:[project('a'),project('b')],allowedRoots:['/allowed']});
  if(String(input).includes('/a/'))return json({missions:[mission]});
  return new Promise<Response>((_,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new DOMException('Timed out','TimeoutError')),{once:true});started();});
 };
 const loading=loadWorkspace(new AbortController().signal,request);await pending;deadlines.at(-1)!.abort();const data=await loading;
 assert.equal(data.projects.length,2);assert.deepEqual(data.missions.a,[mission]);assert.equal(data.missions.b,null);
});
test('an invalid cross-project Mission list becomes unavailable rather than fabricated data',async()=>{
 const request:typeof fetch=async input=>String(input)==='/api/projects'?json({projects:[project('b')],allowedRoots:['/allowed']}):json({missions:[mission]});
 const data=await loadWorkspace(new AbortController().signal,request);assert.equal(data.missions.b,null);assert.equal(data.projects[0]?.id,'b');
});
