import {useEffect,useState} from 'react';
import {startRegistration} from '@simplewebauthn/browser';
import {confirmPendingOperation,humanRequest,isHumanRequest,passkeyOrigin,type HumanRequest} from './human-confirmation-client.ts';

function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null;}
export function PasskeyPanel({operatorKey}:{operatorKey:string}){
 const [registered,setRegistered]=useState<boolean|null>(null),[pending,setPending]=useState<HumanRequest|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
 const [requestId]=useState(()=>new URLSearchParams(window.location.search).get('confirm'));
 useEffect(()=>{let active=true;void humanRequest(operatorKey,'/api/human').then(value=>{if(!record(value)||typeof value.registered!=='boolean')throw Error('Passkey status unavailable.');if(active)setRegistered(value.registered);}).catch(cause=>{if(active)setError((cause as Error).message);});
 if(requestId)void humanRequest(operatorKey,'/api/human/requests/'+encodeURIComponent(requestId)).then(value=>{if(!isHumanRequest(value))throw Error('This confirmation is no longer available.');if(active)setPending(value);}).catch(cause=>{if(active)setError((cause as Error).message);});return()=>{active=false;};},[operatorKey,requestId]);
 async function register(){if(busy)return;setBusy(true);setError(null);try{
  passkeyOrigin(operatorKey);
  const value=await humanRequest(operatorKey,'/api/human/register/options',{});
  if(!record(value)||typeof value.id!=='string'||!record(value.options)||typeof value.options.challenge!=='string')throw Error('Registration challenge unavailable.');
  const response=await startRegistration({optionsJSON:value.options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON']});
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({challenge:value.options.challenge,credentialId:response.id})));const fingerprint=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,12);setNotice('The macOS enrollment prompt must show '+fingerprint+'. Approve only that prompt.');
  await humanRequest(operatorKey,'/api/human/register/verify',{id:value.id,response});setRegistered(true);setNotice('Passkey registered. Every decision needs a fresh confirmation.');
 }catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
 async function confirm(){if(!pending||busy)return;setBusy(true);setError(null);try{await confirmPendingOperation(operatorKey,pending);setPending(null);setNotice('The exact decision was recorded. You can return to the terminal.');}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}
 return <section className="chat-card" aria-label="Human confirmation"><h3>Human confirmation</h3><p>{registered===null?'Checking passkey…':registered?'Passkey registered. Decisions require platform verification.':'Register your Mac’s passkey before making a decision. Enrollment also requires a separate macOS biometric confirmation.'}</p><p>Each confirmation is tied to one item and its current evidence, expires after two minutes, and is used once.</p>
 {registered===false&&<button className="primary-button" disabled={busy} onClick={()=>void register()}>Register platform passkey</button>}
 {pending&&<section aria-label="Pending exact decision"><h4>Confirm this decision</h4><p><code>{pending.operation.path}</code></p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(pending.operation.body,null,2)}</pre><details><summary>Evidence and expiry</summary><p><code style={{overflowWrap:'anywhere'}}>{pending.evidenceHash}</code></p><time dateTime={new Date(pending.expiresAt).toISOString()}>{new Date(pending.expiresAt).toLocaleString()}</time></details><button className="primary-button" disabled={busy||registered!==true||pending.status!==undefined&&pending.status!=='PENDING'} onClick={()=>void confirm()}>Confirm with passkey</button></section>}
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="form-error">{error}</p>}</section>;
}
