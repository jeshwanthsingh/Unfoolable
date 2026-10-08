import {useEffect,useRef,useState} from 'react';
import type {BuildView} from '../../../packages/shared/build.ts';
import {buildActive,mergeBuildView} from './presentation.ts';
export type BuildState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:BuildView};
async function read(response:Response):Promise<BuildView>{
 const data=await response.json();
 if(!response.ok)throw new Error(typeof data?.error?.message==='string'?data.error.message:'Build outcome could not be confirmed. Refresh before retrying.');
 if(!data||!Array.isArray(data.events)||!Number.isSafeInteger(data.nextSequence)||data.nextSequence<0||typeof data.workerPresent!=='boolean'||typeof data.eligible!=='boolean'||typeof data.current!=='boolean'||typeof data.phase!=='string'||!(data.attempt===null||typeof data.attempt?.id==='string')||!(data.candidate===null||typeof data.candidate?.id==='string')||!data.events.every((event:unknown)=>{const e=event as {sequence?:number;attemptId?:string;generation?:number;kind?:string};return Number.isSafeInteger(e?.sequence)&&typeof e.attemptId==='string'&&Number.isSafeInteger(e.generation)&&typeof e.kind==='string';}))throw new Error('Build response could not be confirmed.');
 return data as BuildView;
}
export function useMissionBuild(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<BuildState>({kind:'loading'}),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[refreshKey,setRefreshKey]=useState(0);
 const view=useRef<BuildView|null>(null),changed=useRef(onChanged),request=useRef(0),posting=useRef(false);changed.current=onChanged;
 const url='/api/missions/'+encodeURIComponent(id)+'/build';
 function accept(data:BuildView){const previous=view.current;const next=mergeBuildView(previous,data);view.current=next;setState({kind:'loaded',data:next});if(previous&&previous.phase!==next.phase)changed.current?.();}
 useEffect(()=>{view.current=null;posting.current=false;setPending(false);setState({kind:'loading'});setError(null);},[id]);
 useEffect(()=>{const generation=++request.current,controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function poll(){try{const data=await read(await fetch(url+'?after='+(view.current?.nextSequence??0),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)]),cache:'no-store'}));if(controller.signal.aborted||generation!==request.current)return;setError(null);accept(data);if(buildActive(data)||data.events.length===100)timer=setTimeout(()=>void poll(),data.events.length===100?100:1000);}catch(problem){if(controller.signal.aborted||generation!==request.current)return;setError(problem instanceof Error?problem.message:'Build status unavailable.');setState({kind:'failed'});if(view.current){if(buildActive(view.current))timer=setTimeout(()=>void poll(),1000);}else setState({kind:'failed'});}}
 void poll();return()=>{controller.abort();clearTimeout(timer);request.current++;};
 },[url,revision,refreshKey]);
 async function action(kind:'cancel'){const attempt=view.current?.attempt;if(posting.current||!attempt)return;posting.current=true;setPending(true);setError(null);const generation=request.current;
 try{const data=await read(await fetch('/api/build-attempts/'+encodeURIComponent(attempt.id)+'/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)}));if(generation===request.current){accept(data);setRefreshKey(x=>x+1);changed.current?.();}}
 catch(problem){if(generation===request.current){setError(problem instanceof Error?problem.message:'Build action outcome could not be confirmed.');setRefreshKey(x=>x+1);}}
 finally{if(generation===request.current){posting.current=false;setPending(false);}}
 }
 return {state,pending,error,cancel:()=>action('cancel'),refresh:()=>{setError(null);setRefreshKey(x=>x+1);}};
}
export type BuildControl=ReturnType<typeof useMissionBuild>;
