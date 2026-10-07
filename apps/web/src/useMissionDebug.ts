import {useEffect,useRef,useState} from 'react';
import type {DebugView} from '../../../packages/shared/debug.ts';
import {isDebugView} from '../../../packages/shared/debug-validation.ts';
import {debugActive} from './debug-presentation.ts';
type State={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:DebugView};
async function read(response:Response):Promise<DebugView>{const data:unknown=await response.json();if(!response.ok)throw new Error('Debug outcome could not be confirmed. Refresh before retrying.');if(!isDebugView(data))throw new Error('Debug records could not be validated.');return data;}
export function useMissionDebug(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<State>({kind:'loading'}),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[key,setKey]=useState(0);
 const view=useRef<DebugView|null>(null),generation=useRef(0),posting=useRef(false),changed=useRef(onChanged);changed.current=onChanged;
 const url='/api/missions/'+encodeURIComponent(id)+'/debug';
 function accept(data:DebugView){const previous=view.current;view.current=data;setState({kind:'loaded',data});if(previous&&JSON.stringify(previous.session)!==JSON.stringify(data.session))changed.current?.();}
 useEffect(()=>{view.current=null;posting.current=false;setPending(false);setState({kind:'loading'});setError(null);},[id]);
 useEffect(()=>{const current=++generation.current,controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function poll(){try{const data=await read(await fetch(url,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])}));if(controller.signal.aborted||generation.current!==current)return;setError(null);accept(data);if(debugActive(data.session))timer=setTimeout(()=>void poll(),1000);}catch(problem){if(controller.signal.aborted||generation.current!==current)return;setError(problem instanceof Error?problem.message:'Debug unavailable.');setState({kind:'failed'});if(debugActive(view.current?.session))timer=setTimeout(()=>void poll(),1000);}}
 void poll();return()=>{controller.abort();clearTimeout(timer);generation.current++;};},[url,revision,key]);
 async function post(path:string,body:unknown){if(posting.current)return;posting.current=true;setPending(true);setError(null);const current=generation.current;try{const data=await read(await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)}));if(current===generation.current){accept(data);setKey(k=>k+1);}}catch(problem){if(current===generation.current){setState({kind:'failed'});setError(problem instanceof Error?problem.message:'Debug outcome unconfirmed.');setKey(k=>k+1);}}finally{if(current===generation.current){posting.current=false;setPending(false);}}}
 return {state,pending,error,refresh:()=>setKey(k=>k+1),start:(verificationRunId:string)=>{if(state.kind==='loaded'&&view.current?.eligible&&!debugActive(view.current.session))return post('/api/missions/'+encodeURIComponent(id)+'/debug-sessions',{verificationRunId});},stop:()=>{if(state.kind==='loaded'&&debugActive(view.current?.session))return post('/api/debug-sessions/'+encodeURIComponent(view.current!.session!.id)+'/stop',{});}};
}
export type DebugControl=ReturnType<typeof useMissionDebug>;
