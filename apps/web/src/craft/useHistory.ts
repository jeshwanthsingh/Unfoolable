import {useEffect,useState} from 'react';
import {bootstrapTicketOperator} from '../TicketPanel.tsx';
import {readCraftDetail,type CraftDetail} from './projection.ts';
export function useHistory(){
 const [key]=useState(bootstrapTicketOperator),[data,setData]=useState<CraftDetail[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!key){setError('Open your private Command Center with ./cc chat, then return here.');setLoading(false);return;}const abort=new AbortController();
 const get=async(path:string)=>{const r=await fetch(path,{headers:{'X-CC-Operator':key},signal:abort.signal,cache:'no-store'});if(!r.ok)throw Error('Recorded history could not be loaded ('+r.status+').');return r.json() as Promise<unknown>;};
 void(async()=>{try{const v=await get('/api/tickets') as {tickets?:{id:string}[]};if(!Array.isArray(v.tickets))throw Error('Ticket list is unavailable.');const rows=await Promise.all(v.tickets.slice(0,32).map(async t=>readCraftDetail(await get('/api/tickets/'+encodeURIComponent(t.id)))));if(!abort.signal.aborted)setData(rows);}catch(e){if(!abort.signal.aborted)setError((e as Error).message);}finally{if(!abort.signal.aborted)setLoading(false);}})();return()=>abort.abort();},[key]);
 return {data,error,loading};
}
