import {useEffect,useRef,useState} from 'react';
import {isAnalysisView} from '../../../packages/shared/analysis.ts';
import type {AnalysisView} from '../../../packages/shared/analysis.ts';
export type AnalysisState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:AnalysisView};
async function read(response:Response):Promise<AnalysisView>{const data:unknown=await response.json();if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Analysis could not be confirmed. Refresh before retrying.');}if(!isAnalysisView(data))throw new Error('Analysis response could not be confirmed.');return data;}
export function useMissionAnalysis(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<AnalysisState>({kind:'loading'}),[refreshKey,setRefreshKey]=useState(0),[pending]=useState(false),[saving,setSaving]=useState<string|null>(null),[error,setError]=useState<string|null>(null);
 const alive=useRef(true),changed=useRef(onChanged);changed.current=onChanged;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const url='/api/missions/'+encodeURIComponent(id)+'/analysis';
 useEffect(()=>{const controller=new AbortController();setState({kind:'loading'});void fetch(url,{signal:controller.signal,cache:'no-store'}).then(read).then(data=>{if(!controller.signal.aborted)setState({kind:'loaded',data});}).catch(()=>{if(!controller.signal.aborted)setState({kind:'failed'});});return()=>controller.abort();},[url,refreshKey,revision]);
 const running=state.kind==='loaded'&&(state.data.operation?.status==='RUNNING'||state.data.operation?.status==='PREPARING');
 useEffect(()=>{if(!pending&&!running)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 async function poll(){try{const data=await read(await fetch(url,{signal:controller.signal,cache:'no-store'}));if(!controller.signal.aborted){setState({kind:'loaded',data});if(data.operation?.status!=='RUNNING'&&data.operation?.status!=='PREPARING'&&!pending){changed.current?.();return;}}}catch{if(!controller.signal.aborted)setError('Analysis status is unavailable. Refresh to confirm the outcome.');}if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),1500);}
 timer=setTimeout(()=>void poll(),500);return()=>{controller.abort();clearTimeout(timer);};},[url,pending,running]);
 async function answer(questionId:string,text:string){setSaving(questionId);setError(null);try{const data=await read(await fetch('/api/clarifications/'+encodeURIComponent(questionId)+'/answer',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(20000)}));if(alive.current){setState({kind:'loaded',data});changed.current?.();return true;}}catch(problem){if(alive.current)setError(problem instanceof Error&&problem.name!=='TypeError'&&problem.name!=='TimeoutError'?problem.message:'Answer could not be confirmed. Try again.');}finally{if(alive.current)setSaving(null);}return false;}
 return {state,pending:pending||running,saving,error,answer,refresh:()=>{setError(null);setRefreshKey(x=>x+1);}};
}
export type AnalysisControl=ReturnType<typeof useMissionAnalysis>;
