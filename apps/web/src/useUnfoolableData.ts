import {plainError} from './plain-error.ts';
import {useEffect,useState} from 'react';
import {isTicket,isDetail,type Detail} from './TicketPanel.tsx';
import {isChatView,type ChatView} from '../../../packages/shared/chat.ts';
import type {Ticket} from '../../../packages/shared/tickets.ts';
export async function localRequest(key:string,path:string,body?:unknown,signal?:AbortSignal):Promise<unknown>{
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'X-CC-Operator':key,...(body===undefined?{}:{'Content-Type':'application/json'})},cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)}),...(signal?{signal}:{})});
 const value:unknown=await response.json();if(!response.ok)throw Error(plainError(typeof value==='object'&&value!==null&&'error' in value&&typeof value.error==='object'&&value.error!==null&&'code' in value.error?String(value.error.code):undefined));return value;
}
export function useUnfoolableData(key:string|null,revision:number){
 const [tickets,setTickets]=useState<Ticket[]>([]),[details,setDetails]=useState<Record<string,Detail>>({}),[chat,setChat]=useState<ChatView|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!key){setLoading(false);return;}const controller=new AbortController();let running=false;
  async function refresh(){if(running||document.hidden)return;running=true;try{
   const [list,conversation]=await Promise.all([localRequest(key!,'/api/tickets',undefined,controller.signal),localRequest(key!,'/api/chat',undefined,controller.signal)]);
   if(!list||typeof list!=='object'||!('tickets' in list)||!Array.isArray(list.tickets)||!list.tickets.every(isTicket)||!isChatView(conversation))throw Error('Stored task data could not be confirmed.');
   const items=list.tickets;const found=await Promise.all(items.map(t=>localRequest(key!,'/api/tickets/'+encodeURIComponent(t.id),undefined,controller.signal)));
   if(!found.every(isDetail))throw Error('Stored task details could not be confirmed.');
   if(!controller.signal.aborted){setTickets([...items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)));setDetails(Object.fromEntries(found.map(d=>[d.ticket.id,d])));setChat(conversation);setError(null);}
  }catch(cause){if(!controller.signal.aborted)setError((cause as Error).message);}finally{running=false;if(!controller.signal.aborted)setLoading(false);}}
  void refresh();const timer=setInterval(()=>void refresh(),2000);const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visible);return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[key,revision]);
 return {tickets,details,chat,error,loading};
}
