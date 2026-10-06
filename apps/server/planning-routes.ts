import type {IncomingMessage} from 'node:http';
import type {createPlanningStore} from './planning-store.ts';
import {projectBody} from './project-body.ts';
import {PlanningError} from './planning-errors.ts';
type Store=ReturnType<typeof createPlanningStore>;
const empty=(body:Record<string,unknown>)=>{if(Object.keys(body).length)throw new PlanningError('INVALID_REQUEST','This planning command accepts an empty JSON object only.',400);};
export async function planningRoute(req:IncomingMessage,path:string,store:Store){
 const read=/^\/api\/missions\/([^/]+)\/planning$/.exec(path);
 if(read&&req.method==='GET')return {status:200,body:store.view(read[1]!)};
 const history=/^\/api\/missions\/([^/]+)\/plans\/([^/]+)$/.exec(path);
 if(history&&req.method==='GET')return {status:200,body:store.pair(history[1]!,history[2]!)};
 const draft=/^\/api\/missions\/([^/]+)\/plan-drafts$/.exec(path);
 if(draft&&req.method==='POST'){empty(await projectBody(req,'planning'));return {status:201,body:await store.compile(draft[1]!)};}
 const change=/^\/api\/plan-drafts\/([^/]+)\/(edit|accept)$/.exec(path);
 if(change&&req.method==='POST'){
  const body=await projectBody(req,'plan review',change[2]==='edit'?131072:16384);
  if(change[2]==='accept'){empty(body);return {status:200,body:store.accept(change[1]!)};}
  if(Object.keys(body).length!==1||!Object.hasOwn(body,'payload'))throw new PlanningError('INVALID_REQUEST','Only the complete structured planning payload is accepted.',400);
  return {status:201,body:store.edit(change[1]!,{payload:body.payload})};
 }
 const revise=/^\/api\/missions\/([^/]+)\/plan-revisions$/.exec(path);
 if(revise&&req.method==='POST'){const body=await projectBody(req,'plan revision');if(Object.keys(body).length!==1||typeof body.pairId!=='string'||body.pairId.length>100)throw new PlanningError('INVALID_REQUEST','Choose the accepted pair to revise.',400);return {status:201,body:store.revise(revise[1]!,body.pairId)};}
 return null;
}
