import {useEffect,useState} from 'react';
import {isContextResponse,isContextSnapshot} from '../../../packages/shared/context.ts';
import type {ContextResponse} from '../../../packages/shared/context.ts';
import type {ContextFact} from './presentation.ts';
export type ContextState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:ContextResponse};
async function readContext(missionId:string,signal:AbortSignal):Promise<ContextResponse>{
 const r=await fetch(`/api/missions/${encodeURIComponent(missionId)}/context-snapshots`,{signal,cache:'no-store'});const data:unknown=await r.json();
 if(!r.ok||!isContextResponse(data)||(data.latest&&data.latest.missionId!==missionId))throw new Error('Context could not be loaded.');return data;
}
export function useProjectContext(missionId:string){
 const [state,setState]=useState<ContextState>({kind:'loading'}),[revision,setRevision]=useState(0);
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  void readContext(missionId,controller.signal).then(data=>{if(active)setState({kind:'loaded',data});}).catch(()=>{if(active)setState({kind:'failed'});});
  return ()=>{active=false;controller.abort();};
 },[missionId,revision]);
 async function capture(){
  setPending(true);setError(null);
  try{
   const r=await fetch(`/api/missions/${encodeURIComponent(missionId)}/context-snapshots`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(60000)});const data:unknown=await r.json();
   if(!r.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Context capture could not be confirmed.');}
   if(!isContextSnapshot(data)||data.missionId!==missionId)throw new Error('Capture response could not be confirmed. Refresh context before retrying.');
   setState({kind:'loaded',data:await readContext(missionId,AbortSignal.timeout(20000))});
  }catch(problem){setError(problem instanceof Error&&problem.name!=='TypeError'&&problem.name!=='TimeoutError'?problem.message:'Capture could not be confirmed. Refresh context before retrying.');}
  finally{setPending(false);}
 }

 const fact:ContextFact=state.kind==='loaded'?(state.data.latest?'captured':'absent'):state.kind;
 return {state,pending,error,capture,fact,refresh:()=>{setError(null);setRevision(x=>x+1);}};
}
export type ContextControl=ReturnType<typeof useProjectContext>;
