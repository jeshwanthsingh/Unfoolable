import type {IncomingMessage} from 'node:http';
import type {createMissionWorkflow} from './mission-workflow.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
export async function specRoute(req:IncomingMessage,path:string,store:ReturnType<typeof createMissionWorkflow>){
 const match=/^\/api\/missions\/([^/]+)\/spec(?:\/(accept|land|abandon|retry))?$/.exec(path);if(!match)return null;
 const id=match[1]!,action=match[2];if(!action&&req.method==='GET')return {status:200,body:store.view(id)};
 if(req.method!=='POST')return null;const body=await projectBody(req,'Spec decision');
 if(action==='accept'){if(Object.keys(body).length!==1||typeof body.specId!=='string'||body.specId.length>200)throw new SpecError('INVALID_SPEC_DECISION','Approve the exact displayed Spec.',400);return {status:202,body:store.approve(id,body.specId)};}
 if(action==='land'){if(Object.keys(body).length!==1||typeof body.runId!=='string'||body.runId.length>200)throw new SpecError('INVALID_LAND_DECISION','Land the exact current passed check run.',400);return {status:200,body:await store.land(id,body.runId)};}
 if(action==='abandon'||action==='retry'){if(Object.keys(body).length)throw new SpecError('INVALID_SPEC_DECISION','This command takes only the Mission identity.',400);if(action==='abandon')return {status:200,body:await store.abandon(id)};await store.retry(id);return {status:202,body:store.view(id)};}
 return null;
}
