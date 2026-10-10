import type {IncomingMessage} from 'node:http';
import type {createVerifyOnly} from './verify-only.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
export async function verifyOnlyRoute(req:IncomingMessage,path:string,store:ReturnType<typeof createVerifyOnly>){
 const project=/^\/api\/projects\/([^/]+)\/verification-recipes$/.exec(path);if(project&&req.method==='GET')return {status:200,body:{recipes:store.projectRecipes(project[1]!)}};
 if(path==='/api/verify-only'&&req.method==='POST')return {status:202,body:await store.create(await projectBody(req,'Verify-only'))};
 if(path==='/api/verify-only'&&req.method==='GET')return {status:200,body:{requests:store.list()}};
 const match=/^\/api\/verify-only\/([^/]+)(?:\/(abandon|land))?$/.exec(path);if(!match)return null;
 if(req.method==='GET'&&!match[2])return {status:200,body:store.view(match[1]!)};
 if(req.method==='POST'&&match[2]==='abandon'){const body=await projectBody(req,'Verification abandonment');if(Object.keys(body).length)throw new SpecError('INVALID_VERIFY_ABANDON','Abandonment takes no extra fields.',400);return {status:200,body:await store.abandon(match[1]!)};}
 if(req.method==='POST'&&match[2]==='land'){const body=await projectBody(req,'Land candidate');if(Object.keys(body).join(',')!=='evidenceHash')throw new SpecError('INVALID_LAND','Provide exact evidence hash.',400);return {status:200,body:await store.land(match[1]!,body.evidenceHash)};}
 return null;
}
