import type {IncomingMessage} from 'node:http';
import type {createChatService} from './chat-service.ts';
import type {createTicketService} from './ticket-service.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
export async function chatRoute(req:IncomingMessage,path:string,chat:ReturnType<typeof createChatService>,tickets:ReturnType<typeof createTicketService>){
 if(!path.startsWith('/api/chat'))return null;
 if(!tickets.authorized(req.headers['x-cc-operator']))throw new SpecError('OPERATOR_REQUIRED','Open Jarvis with ./cc chat.',403);
 if(path==='/api/chat'&&req.method==='GET')return {status:200,body:await chat.view()};
 if(path==='/api/chat/messages'&&req.method==='POST'){const body=await projectBody(req,'chat message',90000);if(Object.keys(body).some(k=>k!=='text'))throw new SpecError('INVALID_MESSAGE','Only text is accepted.',400);if(req.headers.prefer==='respond-async'){
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>20000||body.text.includes('\0'))throw new SpecError('INVALID_MESSAGE','Describe what you want to work on.',400);
 if(chat.isDrafting())throw new SpecError('DRAFT_IN_PROGRESS','Your request is still being prepared.',409);
 void chat.message(body.text).catch(()=>{});return {status:202,body:{accepted:true}};
 }return {status:200,body:await chat.message(body.text)};}
 const d=/^\/api\/chat\/drafts\/([a-f0-9-]{36})\/(start|edit|cancel)$/.exec(path);
 if(d&&req.method==='POST'){const body=await projectBody(req,'chat draft',160000);if(d[2]!=='edit'&&Object.keys(body).some(k=>k!=='version'))throw new SpecError('INVALID_DRAFT','Only the reviewed draft version is accepted.',400);return {status:200,body:d[2]==='start'?await chat.start(d[1]!,body.version):d[2]==='cancel'?chat.cancel(d[1]!,body.version):chat.edit(d[1]!,body)};}
 const c=/^\/api\/chat\/cards\/([a-f0-9-]{36})\/action$/.exec(path);if(c&&req.method==='POST')return {status:200,body:await chat.action(c[1]!,await projectBody(req,'chat action'))};return null;
}
