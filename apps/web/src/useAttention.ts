import {useEffect,useState} from 'react';
import {isAttentionResponse} from '../../../packages/shared/attention.ts';
import type {AttentionResponse} from '../../../packages/shared/attention.ts';
export type AttentionState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:AttentionResponse};
export function useAttention(revision:number){
 const [state,setState]=useState<AttentionState>({kind:'loading'});
 useEffect(()=>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function poll(){try{const r=await fetch('/api/attention',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)]),cache:'no-store'});const data:unknown=await r.json();if(!r.ok||!isAttentionResponse(data))throw new Error();if(!controller.signal.aborted)setState({kind:'loaded',data});}catch{if(!controller.signal.aborted)setState({kind:'failed'});}finally{if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),1000);}}
 void poll();return ()=>{controller.abort();clearTimeout(timer);};},[revision]);
 return state;
}
