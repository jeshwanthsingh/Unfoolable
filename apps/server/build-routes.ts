import type {IncomingMessage} from 'node:http';
import type {createBuildStore} from './build-store.ts';
import {BuildError} from './build-errors.ts';
import {projectBody} from './project-body.ts';
export async function buildRoute(req:IncomingMessage,url:URL,store:ReturnType<typeof createBuildStore>){
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
