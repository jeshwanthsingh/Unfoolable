import type {IncomingMessage} from 'node:http';
import type {createVerifyOnly} from './verify-only.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
export async function verifyOnlyRoute(req:IncomingMessage,path:string,store:ReturnType<typeof createVerifyOnly>){
 if(path==='/api/verify-only'&&req.method==='POST')return {status:202,body:await store.create(await projectBody(req,'Verify-only'))};
 if(path==='/api/verify-only'&&req.method==='GET')return {status:200,body:{requests:store.list()}};
 const match=/^\/api\/verify-only\/([^/]+)(?:\/(approve|abandon|waive))?$/.exec(path);if(!match)return null;
 if(req.method==='GET'&&!match[2])return {status:200,body:store.view(match[1]!)};
 if(req.method==='POST'&&match[2]==='abandon'){const body=await projectBody(req,'Verification abandonment');if(Object.keys(body).length)throw new SpecError('INVALID_VERIFY_ABANDON','Abandonment takes no extra fields.',400);return {status:200,body:await store.abandon(match[1]!)};}
 if(req.method==='POST'&&match[2]==='waive'){const body=await projectBody(req,'Human waiver');if(Object.keys(body).sort().join(',')!=='claimIds,reason,reviewHash')throw new SpecError('INVALID_VERIFY_WAIVER','Provide exact review, unmet claims and reason.',400);return {status:200,body:store.waive(match[1]!,body)};}
 if(req.method==='POST'&&match[2]==='approve'){const body=await projectBody(req,'Oracle approval');if(Object.keys(body).join(',')!=='reviewHash')throw new SpecError('INVALID_VERIFY_APPROVAL','Approve the exact review hash.',400);return {status:202,body:store.approve(match[1]!,body.reviewHash)};}
 return null;
}
