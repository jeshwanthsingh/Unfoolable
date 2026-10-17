import type {IncomingMessage} from 'node:http';import type {createTicketService} from './ticket-service.ts';import {projectBody} from './project-body.ts';import {SpecError} from './spec-errors.ts';
export async function ticketRoute(req:IncomingMessage,path:string,service:ReturnType<typeof createTicketService>){
 if(!path.startsWith('/api/tickets')&&!path.startsWith('/api/playbooks/'))return null;
 if(!service.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open tickets through the local cc command.',403);
 if(path.startsWith('/api/playbooks/')&&req.method==='POST'){const body=await projectBody(req,'project playbook',40000);if(path==='/api/playbooks/show')return {status:200,body:await service.playbookShow(body.repoPath)};if(path==='/api/playbooks/edit')return {status:200,body:await service.playbookEdit(body.repoPath,body.definition,body.expectedHash)};if(path==='/api/playbooks/approve'&&Object.keys(body).some(k=>!['repoPath','expectedHash'].includes(k)))throw new SpecError('INVALID_REQUEST','Only the exact repository and reviewed hash are accepted.',400);if(path==='/api/playbooks/approve')return {status:200,body:await service.playbookApprove(body.repoPath,body.expectedHash)};}
 if(path==='/api/tickets'&&req.method==='GET')return {status:200,body:service.list()};
 if(path==='/api/tickets/stats'&&req.method==='GET')return {status:200,body:service.stats()};
 if(path==='/api/tickets'&&req.method==='POST')return {status:201,body:await service.create(await projectBody(req,'ticket',70000))};
 const match=/^\/api\/tickets\/([a-f0-9-]{36})(?:\/(keep|discard|retry|recheck|diff|diff-view))?$/.exec(path);if(!match)return null;const id=match[1]!;
 if(!match[2]&&req.method==='GET')return {status:200,body:service.show(id)};
 if(match[2]==='diff'&&req.method==='GET')return {status:200,text:service.diff(id)};
 if(req.method==='POST'){const body=await projectBody(req,'ticket decision');if(match[2]==='diff-view')return {status:200,body:await service.viewDiff(id,body)};if(match[2]==='recheck'){if(Object.keys(body).some(k=>k!=='candidateCommit'))throw new SpecError('INVALID_REQUEST','Only the current Candidate is accepted.',400);return {status:202,body:service.recheck(id,body.candidateCommit)};}if(match[2]==='retry')return {status:200,body:await service.retry(id)};if(match[2]==='keep'||match[2]==='discard'){if(Object.keys(body).some(k=>k!=='candidateCommit'))throw new SpecError('INVALID_REQUEST','Unexpected decision field.',400);return {status:200,body:await service.decide(id,match[2],body.candidateCommit)};}}
 return null;
}
