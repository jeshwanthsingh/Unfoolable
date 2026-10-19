import {phoneMode,phoneLocked} from './phone-client.ts';
import {startAuthentication} from '@simplewebauthn/browser';

type PendingOperation={path:string;body:unknown};
export type HumanRequest={id:string;status?:string;options:Parameters<typeof startAuthentication>[0]['optionsJSON'];operation:PendingOperation;evidenceHash:string;expiresAt:number};
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null;}
export async function humanRequest(key:string,path:string,body?:unknown,confirmation?:string):Promise<unknown>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'X-CC-Operator':key,...(body===undefined?{}:{'Content-Type':'application/json'}),...(confirmation?{'X-CC-Confirmation':confirmation}:{})},cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)})});
 phoneLocked(response);
 const value:unknown=await response.json();
 if(!response.ok)throw Error(record(value)&&record(value.error)&&typeof value.error.message==='string'?value.error.message:'Human confirmation request failed ('+response.status+').');
 return value;
}
export function passkeyOrigin(key:string):void{
 if(!phoneMode()&&window.location.hostname!=='localhost'){
  const next=new URL(window.location.href);next.hostname='localhost';next.hash='operator='+encodeURIComponent(key);
  window.location.replace(next.href);throw Error('Opening the private localhost passkey page. Confirm there with Touch ID.');
 }
}
export function isHumanRequest(value:unknown):value is HumanRequest{
 return record(value)&&typeof value.id==='string'&&record(value.options)&&typeof value.options.challenge==='string'&&record(value.operation)&&typeof value.operation.path==='string'&&value.operation.path.startsWith('/api/')&&typeof value.evidenceHash==='string'&&typeof value.expiresAt==='number'&&Number.isFinite(value.expiresAt);
}
export async function confirmPendingOperation(key:string,pending:HumanRequest):Promise<unknown>{
 passkeyOrigin(key);
 // User verification is required by the server's challenge and verification policy.
 const response=await startAuthentication({optionsJSON:pending.options});
 await humanRequest(key,'/api/human/confirm',{id:pending.id,response});
 return humanRequest(key,pending.operation.path,pending.operation.body,pending.id);
}
export async function confirmedDecision(key:string,path:string,body:unknown):Promise<unknown>{
 passkeyOrigin(key);
 const pending=await humanRequest(key,'/api/human/options',{path,body});
 if(!isHumanRequest(pending))throw Error('The exact decision could not be confirmed.');
 return confirmPendingOperation(key,pending);
}

// Legacy screens keep their response validators; only their explicit decisions use this helper.
export async function confirmedResponse(path:string,body:unknown):Promise<Response>{
 let key:string|null=null;try{key=sessionStorage.getItem('cc-ticket-key');}catch{}
 if(!key||! /^[a-f0-9]+$/i.test(key))throw Error('Open ./cc chat first to use your private passkey decision buttons.');
 const value=await confirmedDecision(key,path,body);
 return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
}
