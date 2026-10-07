import type {IncomingMessage} from 'node:http';
import {projectBody} from './project-body.ts';
import {BuildError} from './build-errors.ts';
import type {createVerificationStore} from './verification-store.ts';
export async function verificationRoute(req:IncomingMessage,url:URL,store:ReturnType<typeof createVerificationStore>){
 const artifact=/^\/api\/verification-runs\/([^/]+)\/evidence\/([^/]+)$/.exec(url.pathname);
 if(artifact&&req.method==='GET')return {status:200,body:store.readEvidence(artifact[1]!,artifact[2]!)};
 const read=/^\/api\/missions\/([^/]+)\/verification$/.exec(url.pathname);
 if(read&&req.method==='GET')return {status:200,body:store.view(read[1]!)};
 const start=/^\/api\/missions\/([^/]+)\/verification-runs$/.exec(url.pathname);
 if(start&&req.method==='POST'){
  if(Object.keys(await projectBody(req,'verification')).length)throw new BuildError('INVALID_REQUEST','Verification accepts only the Mission identity.',400);
  return {status:202,body:await store.start(start[1]!)};
 }
 const stop=/^\/api\/verification-runs\/([^/]+)\/stop$/.exec(url.pathname);
 if(stop&&req.method==='POST'){
  if(Object.keys(await projectBody(req,'verification control')).length)throw new BuildError('INVALID_REQUEST','Stop accepts only the Run identity.',400);
  return {status:200,body:await store.stop(stop[1]!)};
 }
 const manual=/^\/api\/verification-runs\/([^/]+)\/claims\/([^/]+)\/decision$/.exec(url.pathname);
 if(manual&&req.method==='POST'){
  const body=await projectBody(req,'manual evaluation');
  if(Object.keys(body).some(k=>!['status','note'].includes(k))||!['PASS','FAIL','INCONCLUSIVE'].includes(String(body.status))||typeof body.note!=='string'||!body.note.trim()||body.note.length>4000)throw new BuildError('INVALID_REQUEST','Choose a result and give a short evidence note.',400);
  return {status:200,body:await store.decide(manual[1]!,manual[2]!,body.status as 'PASS'|'FAIL'|'INCONCLUSIVE',body.note)};
 }
 return null;
}
