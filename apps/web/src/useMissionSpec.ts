import {useEffect,useRef,useState} from 'react';
import {isSpecView,type SpecView} from '../../../packages/shared/spec.ts';
import {canAcceptSpec,canLandMission} from './spec-presentation.ts';
export type SpecState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:SpecView};
async function read(response:Response,id:string):Promise<SpecView>{const data:unknown=await response.json();if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Mission outcome could not be confirmed. Refresh before retrying.');}if(!isSpecView(data)||data.missionId!==id)throw new Error('Spec response could not be confirmed.');return data;}
export function useMissionSpec(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<SpecState>({kind:'loading'}),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[key,setKey]=useState(0);
 const view=useRef<SpecView|null>(null),generation=useRef(0),posting=useRef(false),changed=useRef(onChanged);changed.current=onChanged;
 const url='/api/missions/'+encodeURIComponent(id)+'/spec';
 function accept(data:SpecView){const previous=view.current;view.current=data;setState({kind:'loaded',data});if(previous&&JSON.stringify(previous)!==JSON.stringify(data))changed.current?.();}
 useEffect(()=>{view.current=null;posting.current=false;setPending(false);setError(null);setState({kind:'loading'});},[id]);
 useEffect(()=>{const current=++generation.current,controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function poll(){try{const data=await read(await fetch(url,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])}),id);if(controller.signal.aborted||current!==generation.current)return;accept(data);if(!['LANDED','ABANDONED'].includes(data.phase))timer=setTimeout(()=>void poll(),1000);}catch(problem){if(controller.signal.aborted||current!==generation.current)return;setState({kind:'failed'});setError(problem instanceof Error?problem.message:'Spec unavailable.');}}
 void poll();return()=>{controller.abort();clearTimeout(timer);generation.current++;};},[url,revision,key]);
 async function post(path:string,body:unknown){if(posting.current)return;posting.current=true;setPending(true);setError(null);const current=generation.current;try{const data=await read(await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}),id);if(current===generation.current){accept(data);changed.current?.();setKey(k=>k+1);}}catch(problem){if(current===generation.current){setError(problem instanceof Error?problem.message:'Mission decision outcome unconfirmed.');setKey(k=>k+1);}}finally{if(current===generation.current){posting.current=false;setPending(false);}}}
 return {state,pending,error,refresh:()=>setKey(k=>k+1),retry:()=>{const current=view.current;if(current?.phase==='NEEDS_YOU')return post(url+'/retry',{});},accept:()=>{const current=view.current;if(current&&canAcceptSpec(current))return post(url+'/accept',{specId:current.specId});},land:()=>{const current=view.current;if(current&&canLandMission(current))return post(url+'/land',{runId:current.runId});},abandon:()=>{const current=view.current;if(current&&!['LANDED','ABANDONED'].includes(current.phase))return post(url+'/abandon',{});}};
}
export type SpecControl=ReturnType<typeof useMissionSpec>;
