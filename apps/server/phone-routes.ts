import type {IncomingMessage,ServerResponse} from 'node:http';
import type {createPhoneAuth} from './phone-auth.ts';
import {privatePhoneStatus} from './phone-access.ts';
import {projectBody} from './project-body.ts';
import {SpecError} from './spec-errors.ts';
import type {RegistrationResponseJSON,AuthenticationResponseJSON} from '@simplewebauthn/server';
import type {HumanOperation} from './human-confirmation.ts';
export function phoneJson(res:ServerResponse,body:unknown){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
export function createPhoneRoutes(phone:ReturnType<typeof createPhoneAuth>,dataDir:string){
 return {
  async remote(req:IncomingMessage,res:ServerResponse,path:string,origin:string){
   const token=phone.token(req.headers.cookie);
   if(path==='/api/phone/session'&&req.method==='GET'){phoneJson(res,phone.status(token));return true;}
   if(['/api/phone/register/options','/api/phone/register/verify','/api/phone/login/options','/api/phone/login/verify'].includes(path)&&req.method==='POST'){
    const b=await projectBody(req,'phone passkey',160000);
    if(path.endsWith('/register/options'))phoneJson(res,await phone.registrationOptions(b.token,b.name,origin));
    else if(path.endsWith('/register/verify')){const result=await phone.register(String(b.id),b.response as RegistrationResponseJSON,b.name,origin);res.setHeader('Set-Cookie',result.setCookie);phoneJson(res,result.body);}
    else if(path.endsWith('/login/options'))phoneJson(res,await phone.loginOptions(origin));
    else{const result=await phone.login(String(b.id),b.response as AuthenticationResponseJSON,origin);res.setHeader('Set-Cookie',result.setCookie);phoneJson(res,result.body);}return true;
   }
   phone.session(token);
   if(path==='/api/human'&&req.method==='GET'){phoneJson(res,{registered:true});return true;}
   if(path==='/api/human/options'&&req.method==='POST'){const b=await projectBody(req,'phone decision',160000);if(typeof b.path!=='string'||!b.body||typeof b.body!=='object'||Array.isArray(b.body))throw new SpecError('INVALID_DECISION','Choose the current action button.',400);phoneJson(res,await phone.options(token,b as HumanOperation,origin));return true;}
   if(path==='/api/human/confirm'&&req.method==='POST'){const b=await projectBody(req,'phone confirmation',160000);phoneJson(res,await phone.confirm(token,String(b.id),b.response as AuthenticationResponseJSON,origin));return true;}
   if(path==='/api/phone/logout'&&req.method==='POST'){await projectBody(req,'phone lock');const result=phone.logout(token);res.setHeader('Set-Cookie',result.setCookie);phoneJson(res,result.body);return true;}
   if(path.startsWith('/api/phone/alerts'))return false;
   const allowed=req.method==='GET'?/^\/api\/(desk\/events|tickets(?:\/[^/]+(?:\/diff)?)?|chat)$/.test(path):req.method==='POST'&&(/^\/api\/tickets\/[^/]+\/(keep|discard|recheck|retry|continue|diff-view)$/.test(path)||/^\/api\/chat\/(messages|drafts\/[^/]+\/(start|edit|cancel)|cards\/[^/]+\/action)$/.test(path)||path==='/api/stop-all');
   if(!allowed)throw new SpecError('PHONE_ROUTE_DENIED','Use your Mac for this setting.',403);
   return false;
  },
  async owner(req:IncomingMessage,res:ServerResponse,path:string){
   if(!path.startsWith('/api/phone/'))return false;
   if(path==='/api/phone/settings'&&req.method==='GET'){phoneJson(res,{access:privatePhoneStatus(dataDir),devices:phone.devices(),waiting:phone.waiting()});return true;}
   if(path==='/api/phone/pairs'&&req.method==='POST'){await projectBody(req,'pair phone');const status=privatePhoneStatus(dataDir);if(!status.ready)throw new SpecError('PHONE_UNAVAILABLE',status.message,409);phoneJson(res,phone.createPair());return true;}
   const approve=/^\/api\/phone\/pairs\/([a-f0-9-]{36})\/approve$/.exec(path),remove=/^\/api\/phone\/devices\/([a-f0-9-]{36})\/remove$/.exec(path);
   if(req.method==='POST'&&(approve||remove)){const b=await projectBody(req,'phone approval');if(Object.keys(b).length)throw new SpecError('INVALID_REQUEST','Use the exact phone action.',400);phoneJson(res,approve?phone.approve(approve[1]!):phone.remove(remove![1]!));return true;}
   throw new SpecError('NOT_FOUND','Phone setting not found.',404);
  },
 };
}
