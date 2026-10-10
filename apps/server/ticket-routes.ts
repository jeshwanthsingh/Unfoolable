import type {IncomingMessage} from 'node:http';import type {createTicketService} from './ticket-service.ts';import {projectBody} from './project-body.ts';import {SpecError} from './spec-errors.ts';
export async function ticketRoute(req:IncomingMessage,path:string,service:ReturnType<typeof createTicketService>){
 if(!path.startsWith('/api/tickets'))return null;
 if(!service.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open tickets through the local cc command.',403);
 if(path==='/api/tickets'&&req.method==='GET')return {status:200,body:service.list()};
 if(path==='/api/tickets/stats'&&req.method==='GET')return {status:200,body:service.stats()};
 if(path==='/api/tickets'&&req.method==='POST')return {status:201,body:await service.create(await projectBody(req,'ticket',70000))};
 const match=/^\/api\/tickets\/([a-f0-9-]{36})(?:\/(keep|discard|retry|diff))?$/.exec(path);if(!match)return null;const id=match[1]!;
 if(!match[2]&&req.method==='GET')return {status:200,body:service.show(id)};
 if(match[2]==='diff'&&req.method==='GET')return {status:200,text:service.diff(id)};
 if(req.method==='POST'){const body=await projectBody(req,'ticket decision');if(match[2]==='retry')return {status:200,body:await service.retry(id)};if(match[2]==='keep'||match[2]==='discard'){if(Object.keys(body).some(k=>k!=='candidateCommit'))throw new SpecError('INVALID_REQUEST','Unexpected decision field.',400);return {status:200,body:await service.decide(id,match[2],body.candidateCommit)};}}
 return null;
}
