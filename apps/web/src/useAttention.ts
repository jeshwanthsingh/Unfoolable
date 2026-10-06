import {useEffect,useState} from 'react';
import {isAttentionResponse} from '../../../packages/shared/planning.ts';
import type {AttentionResponse} from '../../../packages/shared/planning.ts';
export type AttentionState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:AttentionResponse};
export function useAttention(revision:number){
 const [state,setState]=useState<AttentionState>({kind:'loading'});
 useEffect(()=>{const controller=new AbortController();setState({kind:'loading'});
 void fetch('/api/attention',{signal:controller.signal,cache:'no-store'}).then(async r=>{const data:unknown=await r.json();if(!r.ok||!isAttentionResponse(data))throw new Error();if(!controller.signal.aborted)setState({kind:'loaded',data});}).catch(()=>{if(!controller.signal.aborted)setState({kind:'failed'});});
 return ()=>controller.abort();},[revision]);
 return state;
}
