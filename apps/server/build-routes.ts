import type {IncomingMessage} from 'node:http';
import type {createBuildStore} from './build-store.ts';
import {BuildError} from './build-errors.ts';
import {projectBody} from './project-body.ts';
export async function buildRoute(req:IncomingMessage,url:URL,store:ReturnType<typeof createBuildStore>){
 const decision=/^\/api\/runtime-permissions\/([^/]+)\/decision$/.exec(url.pathname);
 if(decision&&req.method==='POST'){
  const body=await projectBody(req,'runtime permission decision');
  if(Object.keys(body).some(k=>!['decision','payloadHash'].includes(k))||!['ALLOW','DENY'].includes(String(body.decision))||typeof body.payloadHash!=='string'||!/^[a-f0-9]{64}$/.test(body.payloadHash))throw new BuildError('INVALID_REQUEST','Choose Allow or Deny for the exact displayed request.',400);
  return {status:200,body:await store.decide(decision[1]!,body.decision as 'ALLOW'|'DENY',body.payloadHash)};
 }
 const control=/^\/api\/build-attempts\/([^/]+)\/(cancel|retry)$/.exec(url.pathname);
 if(control&&req.method==='POST'){
  if(Object.keys(await projectBody(req,'build control')).length)throw new BuildError('INVALID_REQUEST','Build control accepts only its Attempt identity.',400);
  return {status:202,body:await (control[2]==='cancel'?store.cancel(control[1]!):store.retry(control[1]!))};
 }
 const read=/^\/api\/missions\/([^/]+)\/build$/.exec(url.pathname);
 if(read&&req.method==='GET'){
  const cursor=url.searchParams.get('after')??'0';
  if(!/^\d{1,15}$/.test(cursor)||!Number.isSafeInteger(Number(cursor)))throw new BuildError('INVALID_REQUEST','Invalid activity cursor.',400);
  return {status:200,body:store.view(read[1]!,Number(cursor))};
 }
 const start=/^\/api\/missions\/([^/]+)\/build-attempts$/.exec(url.pathname);
 if(start&&req.method==='POST'){
  const body=await projectBody(req,'build request');
  if(Object.keys(body).some(k=>k!=='sliceId')||typeof body.sliceId!=='string'||!/^S[1-9][0-9]{0,2}$/.test(body.sliceId))throw new BuildError('INVALID_REQUEST','Select one accepted Slice to build.',400);
  return {status:202,body:await store.start(start[1]!,body.sliceId)};
 }
 return null;
}
