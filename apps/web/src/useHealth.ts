import {useCallback,useEffect,useState} from 'react';
import {isHealthResponse} from '../../../packages/shared/health.ts';
import type {HealthResponse} from '../../../packages/shared/health.ts';
type State={kind:'checking'}|{kind:'connected';health:HealthResponse}|{kind:'offline'};
export function useHealth(){
 const [state,setState]=useState<State>({kind:'checking'});const [revision,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(x=>x+1),[]);
 useEffect(()=>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),4000);let active=true;
  setState({kind:'checking'});
  void fetch('/api/health',{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const health:unknown=await response.json();if(!isHealthResponse(health))throw new Error('Invalid health response');
   if(active)setState({kind:'connected',health});
  }).catch(()=>{if(active)setState({kind:'offline'});}).finally(()=>clearTimeout(timeout));
  return ()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[revision]);
 useEffect(()=>{const timer=setInterval(refresh,15000);return ()=>clearInterval(timer);},[refresh]);
 return {state,refresh};
}
