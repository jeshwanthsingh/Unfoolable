import {useEffect,useState} from 'react';
import {isContextResponse} from '../../../packages/shared/context.ts';
import type {ContextResponse} from '../../../packages/shared/context.ts';
import type {ContextFact} from './presentation.ts';
export type ContextState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:ContextResponse};
async function readContext(missionId:string,signal:AbortSignal):Promise<ContextResponse>{
 const r=await fetch(`/api/missions/${encodeURIComponent(missionId)}/context-snapshots`,{signal,cache:'no-store'});const data:unknown=await r.json();
 if(!r.ok||!isContextResponse(data)||(data.latest&&data.latest.missionId!==missionId))throw new Error('Context could not be loaded.');return data;
}
export function useProjectContext(missionId:string,phaseRevision:string|number=0){
 const [state,setState]=useState<ContextState>({kind:'loading'}),[revision,setRevision]=useState(0);
 const [pending]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  void readContext(missionId,controller.signal).then(data=>{if(active)setState({kind:'loaded',data});}).catch(()=>{if(active)setState({kind:'failed'});});
  return ()=>{active=false;controller.abort();};
 },[missionId,revision,phaseRevision]);
 const fact:ContextFact=state.kind==='loaded'?(state.data.latest?'captured':'absent'):state.kind;
 return {state,pending,error,fact,refresh:()=>{setError(null);setRevision(x=>x+1);}};
}
export type ContextControl=ReturnType<typeof useProjectContext>;
