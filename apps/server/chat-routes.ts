import type {IncomingMessage} from 'node:http';
import type {createChatService} from './chat-service.ts';
import type {createTicketService} from './ticket-service.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
export async function chatRoute(req:IncomingMessage,path:string,chat:ReturnType<typeof createChatService>,tickets:ReturnType<typeof createTicketService>){
 if(!path.startsWith('/api/chat'))return null;
 if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open Jarvis with ./cc chat.',403);
 if(path==='/api/chat'&&req.method==='GET')return {status:200,body:await chat.view()};
 if(path==='/api/chat/messages'&&req.method==='POST'){const body=await projectBody(req,'chat message',90000);if(Object.keys(body).some(k=>k!=='text'))throw new SpecError('INVALID_MESSAGE','Only text is accepted.',400);return {status:200,body:await chat.message(body.text)};}
 const d=/^\/api\/chat\/drafts\/([a-f0-9-]{36})\/(start|edit|cancel)$/.exec(path);
 if(d&&req.method==='POST'){const body=await projectBody(req,'chat draft',160000);if(d[2]!=='edit'&&Object.keys(body).some(k=>k!=='version'))throw new SpecError('INVALID_DRAFT','Only the reviewed draft version is accepted.',400);return {status:200,body:d[2]==='start'?await chat.start(d[1]!,body.version):d[2]==='cancel'?chat.cancel(d[1]!,body.version):chat.edit(d[1]!,body)};}
 const c=/^\/api\/chat\/cards\/([a-f0-9-]{36})\/action$/.exec(path);if(c&&req.method==='POST')return {status:200,body:await chat.action(c[1]!,await projectBody(req,'chat action'))};return null;
}
