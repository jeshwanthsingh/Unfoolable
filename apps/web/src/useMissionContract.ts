import {useEffect,useRef,useState} from 'react';
import {isContractView} from '../../../packages/shared/contracts.ts';
import type {ContractPayload,ContractView} from '../../../packages/shared/contracts.ts';
export type ContractState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:ContractView};
async function read(response:Response):Promise<ContractView>{const data:unknown=await response.json();if(!response.ok){const problem=data as {error?:{message?:unknown;code?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Contract could not be confirmed. Refresh before retrying.');}if(!isContractView(data))throw new Error('Contract response could not be confirmed.');return data;}
export function useMissionContract(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<ContractState>({kind:'loading'}),[refreshKey,setRefreshKey]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
 const alive=useRef(true),changed=useRef(onChanged);changed.current=onChanged;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const url='/api/missions/'+encodeURIComponent(id)+'/contract';
 useEffect(()=>{const controller=new AbortController();setState({kind:'loading'});void fetch(url,{signal:controller.signal,cache:'no-store'}).then(read).then(data=>{if(!controller.signal.aborted)setState({kind:'loaded',data});}).catch(()=>{if(!controller.signal.aborted)setState({kind:'failed'});});return()=>controller.abort();},[url,refreshKey,revision]);
 const running=state.kind==='loaded'&&(state.data.operation?.status==='RUNNING'||state.data.operation?.status==='PREPARING');
 useEffect(()=>{if(!pending&&!running)return;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 async function poll(){try{const data=await read(await fetch(url,{signal:controller.signal,cache:'no-store'}));if(!controller.signal.aborted){setState({kind:'loaded',data});if(data.operation?.status!=='RUNNING'&&data.operation?.status!=='PREPARING'&&!pending){changed.current?.();return;}}}catch{if(!controller.signal.aborted)setError('Contract status is unavailable. Refresh to confirm the outcome.');}if(!controller.signal.aborted)timer=setTimeout(()=>void poll(),1500);}
 timer=setTimeout(()=>void poll(),500);return()=>{controller.abort();clearTimeout(timer);};},[url,pending,running]);
 async function post(path:string,body:unknown={}){if(pending||running)return false;setPending(true);setError(null);try{const data=await read(await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)}));if(alive.current){setState({kind:'loaded',data});changed.current?.();return true;}}catch(problem){if(alive.current){setError(problem instanceof Error&&problem.name!=='TypeError'&&problem.name!=='TimeoutError'?problem.message:'Contract outcome could not be confirmed. Refresh before retrying.');setRefreshKey(x=>x+1);}}finally{if(alive.current)setPending(false);}return false;}
 return {state,pending:pending||running,error,draft:()=>post('/api/missions/'+encodeURIComponent(id)+'/contract-drafts'),edit:(draftId:string,payload:ContractPayload)=>post('/api/contract-drafts/'+encodeURIComponent(draftId)+'/edit',{payload}),accept:(draftId:string)=>post('/api/contract-drafts/'+encodeURIComponent(draftId)+'/accept'),revise:(revisionId:string)=>post('/api/missions/'+encodeURIComponent(id)+'/contract-revisions',{revisionId}),refresh:()=>{setError(null);setRefreshKey(x=>x+1);}};
}
export type ContractControl=ReturnType<typeof useMissionContract>;
