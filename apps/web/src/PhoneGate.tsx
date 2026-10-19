import {useEffect,useState,type ReactNode} from 'react';
import {startAuthentication,startRegistration} from '@simplewebauthn/browser';
import {phoneCall} from './phone-client.ts';import {Hallmark} from './Hallmark.tsx';
import './unfoolable.css';
export function PhoneGate({children,pairToken}:{children:ReactNode;pairToken:string}){
 const [state,setState]=useState<Record<string,unknown>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('My iPhone'),[token,setToken]=useState(pairToken);
 async function refresh(){try{setState(await phoneCall('/api/phone/session'));setError('');}catch{setError("Can't reach your Mac right now.");}}
 useEffect(()=>{void refresh();const lock=()=>{setState({paired:false});};window.addEventListener('unfool-phone-locked',lock);return()=>window.removeEventListener('unfool-phone-locked',lock);},[]);
 useEffect(()=>{if(!state?.pending)return;const id=setTimeout(()=>void refresh(),1500);return()=>clearTimeout(id);},[state]);
 async function register(){if(busy)return;setBusy(true);setError('');try{const q=await phoneCall('/api/phone/register/options',{token,name});const response=await startRegistration({optionsJSON:q.options as Parameters<typeof startRegistration>[0]['optionsJSON']});await phoneCall('/api/phone/register/verify',{id:q.id,response,name});setToken('');await refresh();}catch(e){setError(e instanceof Error?e.message:'Face ID did not finish. Try again.');}finally{setBusy(false);}}
 async function login(){if(busy)return;setBusy(true);setError('');try{const q=await phoneCall('/api/phone/login/options',{}),response=await startAuthentication({optionsJSON:q.options as Parameters<typeof startAuthentication>[0]['optionsJSON']});await phoneCall('/api/phone/login/verify',{id:q.id,response});await refresh();}catch{setError('The phone could not unlock. Use its paired passkey and try again.');}finally{setBusy(false);}}
 if(state?.paired===true)return children;
 return <main className="unfoolable phone-pair-screen"><header><Hallmark mark="checked"/><h1>Unfoolable</h1></header><h2>{state?.pending?'Confirm this phone on your Mac':token?'Add your phone':'Your private workspace'}</h2>
 {state?.pending?<><p>Compare this code with Settings on your Mac.</p><p className="phone-fingerprint">{String(state.fingerprint??'')}</p><p>On the Mac, choose Pair this phone and confirm with Touch ID.</p></>:token?<><p>Create a passkey with Face ID. Your Mac must approve it before anything is shared.</p><label>Phone name<input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||!name.trim()} onClick={()=>void register()}>{busy?'Connecting...':'Create phone passkey'}</button></>:<><p>{state?.expired?'The QR code expired. Get a fresh one from your Mac.':'Pair this phone from Settings on your Mac, or unlock a previously paired phone.'}</p><button disabled={busy} onClick={()=>void login()}>{busy?'Unlocking...':'Unlock with Face ID'}</button></>}
 {error&&<p role="alert">{error}</p>}{error&&<button onClick={()=>void refresh()}>Try connecting again</button>}<p className="unfool-meta">Only paired devices can see your work.</p></main>;
}
