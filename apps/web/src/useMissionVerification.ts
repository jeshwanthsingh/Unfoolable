import {confirmedResponse} from './human-confirmation-client.ts';
import {useEffect,useRef,useState} from 'react';
import {isVerificationView,type VerificationView} from '../../../packages/shared/verification.ts';
import {verificationActive} from './presentation.ts';
export type VerificationState={kind:'loading'}|{kind:'failed'}|{kind:'loaded';data:VerificationView};
async function read(response:Response):Promise<VerificationView>{const data:unknown=await response.json();if(!response.ok){const problem=data as {error?:{message?:unknown}};throw new Error(typeof problem?.error?.message==='string'?problem.error.message:'Verification outcome could not be confirmed. Refresh before retrying.');}if(!isVerificationView(data))throw new Error('Verification response could not be confirmed.');return data;}
export function useMissionVerification(id:string,onChanged?:()=>void,revision:string|number=0){
 const [state,setState]=useState<VerificationState>({kind:'loading'}),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[key,setKey]=useState(0);
 const view=useRef<VerificationView|null>(null),generation=useRef(0),posting=useRef(false),changed=useRef(onChanged);changed.current=onChanged;
 const url='/api/missions/'+encodeURIComponent(id)+'/verification';
 function accept(data:VerificationView){const previous=view.current;view.current=data;setState({kind:'loaded',data});if(previous&&(JSON.stringify(previous.runs[0]?.results)!==JSON.stringify(data.runs[0]?.results)||previous.runs[0]?.status!==data.runs[0]?.status))changed.current?.();}
 useEffect(()=>{view.current=null;posting.current=false;setPending(false);setState({kind:'loading'});setError(null);},[id]);
 useEffect(()=>{const current=++generation.current,controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function poll(){try{const data=await read(await fetch(url,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])}));if(controller.signal.aborted||generation.current!==current)return;setError(null);accept(data);if(verificationActive(data.runs[0]))timer=setTimeout(()=>void poll(),1000);}catch(problem){if(controller.signal.aborted||generation.current!==current)return;setError(problem instanceof Error?problem.message:'Verification unavailable.');setState({kind:'failed'});if(verificationActive(view.current?.runs[0]))timer=setTimeout(()=>void poll(),1000);}}
 void poll();return()=>{controller.abort();clearTimeout(timer);generation.current++;};
 },[url,revision,key]);
 async function post(path:string,body:unknown){if(posting.current)return;posting.current=true;setPending(true);setError(null);const current=generation.current;
 try{const data=await read(await (path.endsWith('/decision')?confirmedResponse(path,body):fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)})));if(current===generation.current){accept(data);setKey(value=>value+1);}}
 catch(problem){if(current===generation.current){setError(problem instanceof Error?problem.message:'Verification outcome could not be confirmed.');setKey(value=>value+1);}}
 finally{if(current===generation.current){posting.current=false;setPending(false);}}
 }
 return {state,pending,error,refresh:()=>setKey(value=>value+1),stop:()=>{const run=view.current?.runs[0];if(verificationActive(run))return post('/api/verification-runs/'+encodeURIComponent(run!.id)+'/stop',{});},decide:(runId:string,claimId:string,status:'PASS'|'FAIL'|'INCONCLUSIVE',note:string)=>post('/api/verification-runs/'+encodeURIComponent(runId)+'/claims/'+encodeURIComponent(claimId)+'/decision',{status,note})};
}
export type VerificationControl=ReturnType<typeof useMissionVerification>;
