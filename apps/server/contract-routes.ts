import type {IncomingMessage} from 'node:http';
import type {createContractStore} from './contract-store.ts';
import {projectBody} from './project-body.ts';
import {ContractError} from './contract-errors.ts';
type Store=ReturnType<typeof createContractStore>;
const empty=(body:Record<string,unknown>)=>{if(Object.keys(body).length)throw new ContractError('INVALID_REQUEST','This command accepts an empty JSON object only.',400);};
export async function contractRoute(req:IncomingMessage,path:string,store:Store){
 const read=/^\/api\/missions\/([^/]+)\/contract$/.exec(path);
 if(read&&req.method==='GET')return {status:200,body:store.view(read[1]!)};
 const draft=/^\/api\/missions\/([^/]+)\/contract-drafts$/.exec(path);
 if(draft&&req.method==='POST'){empty(await projectBody(req,'contract drafting'));return {status:201,body:await store.compile(draft[1]!)};}
 const change=/^\/api\/contract-drafts\/([^/]+)\/(edit|accept)$/.exec(path);
 if(change&&req.method==='POST'){
  const body=await projectBody(req,'contract review',change[2]==='edit'?65536:16384);
  if(change[2]==='accept'){empty(body);return {status:200,body:store.accept(change[1]!)};}
  if(Object.keys(body).length!==1||!Object.hasOwn(body,'payload'))throw new ContractError('INVALID_REQUEST','Only the complete structured draft payload is accepted.',400);
  return {status:201,body:store.edit(change[1]!,{payload:body.payload})};
 }
 const revise=/^\/api\/missions\/([^/]+)\/contract-revisions$/.exec(path);
 if(revise&&req.method==='POST'){const body=await projectBody(req,'contract revision');if(Object.keys(body).length!==1||typeof body.revisionId!=='string'||body.revisionId.length>100)throw new ContractError('INVALID_REQUEST','Choose the accepted revision to revise.',400);return {status:201,body:store.revise(revise[1]!,body.revisionId)};}
 return null;
}
