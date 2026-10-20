import {useEffect,useState} from 'react';import qrcode from 'qrcode-generator';
import {humanRequest,confirmedDecision} from './human-confirmation-client.ts';
import {phoneMode} from './phone-client.ts';
type Device={id:string;name:string;removed:boolean};type Pending={id:string;name:string;fingerprint:string};
function record(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object';}
export function PhoneSettings({operatorKey,revision=0}:{operatorKey:string;revision?:number}){
 const [value,setValue]=useState<Record<string,unknown>|null>(null),[qr,setQr]=useState<{image:string;expires:number}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){try{const v=await humanRequest(operatorKey,'/api/phone/settings');if(!record(v))throw Error('Phone settings unavailable.');setValue(v);setError('');}catch(e){setError(e instanceof Error?e.message:'Phone settings unavailable.');}}
 useEffect(()=>{if(!phoneMode())void refresh();},[operatorKey,revision]);
 async function pair(){if(busy)return;setBusy(true);setError('');try{const v=await humanRequest(operatorKey,'/api/phone/pairs',{});if(!record(v)||typeof v.url!=='string'||typeof v.expiresAt!=='number')throw Error('Could not create a pairing code.');const code=qrcode(0,'M');code.addData(v.url);code.make();setQr({image:'data:image/svg+xml,'+encodeURIComponent(code.createSvgTag({cellSize:4,margin:16,scalable:true})),expires:v.expiresAt});await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not create a pairing code.');}finally{setBusy(false);}}
 async function decide(path:string){if(busy)return;setBusy(true);setError('');try{await confirmedDecision(operatorKey,path,{});setQr(null);await refresh();}catch(e){setError(e instanceof Error?e.message:'The phone choice was not saved.');}finally{setBusy(false);}}
 if(phoneMode())return null;
 const access=record(value?.access)?value.access:null,devices=(Array.isArray(value?.devices)?value.devices:[]).filter((v):v is Device=>record(v)&&typeof v.id==='string'&&typeof v.name==='string'&&typeof v.removed==='boolean'),waiting=(Array.isArray(value?.waiting)?value.waiting:[]).filter((v):v is Pending=>record(v)&&typeof v.id==='string'&&typeof v.name==='string'&&typeof v.fingerprint==='string');
 return <section className="phone-settings" aria-label="Phone access"><h3>Phone access</h3><p>{typeof access?.message==='string'?access.message:'Checking private access...'}</p><button disabled={busy||access?.ready!==true} onClick={()=>void pair()}>Add my phone</button><button disabled={busy} onClick={()=>void refresh()}>Check connection</button>
 {qr&&<figure><img className="phone-qr" src={qr.image} alt="One-time private phone pairing code"/><figcaption>Scan with your iPhone camera. Expires at <time dateTime={new Date(qr.expires).toISOString()}>{new Date(qr.expires).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time>.</figcaption></figure>}
 {waiting.map(p=><section key={p.id}><h4>{p.name} wants to pair</h4><p>Compare this code on your phone: <strong>{p.fingerprint}</strong></p><button disabled={busy} onClick={()=>void decide('/api/phone/pairs/'+p.id+'/approve')}>Pair this phone</button></section>)}
 <ul>{devices.map(d=><li key={d.id}>{d.name} {d.removed?'Removed':<button disabled={busy} onClick={()=>void decide('/api/phone/devices/'+d.id+'/remove')}>Remove<span className="unfool-sr-only"> {d.name}</span></button>}</li>)}</ul>{error&&<p role="alert">{error}</p>}</section>;
}
