import {useEffect,useRef} from 'react';
import {animate} from 'motion';
import type {Mark} from './unfoolable-model.ts';
import {useReducedMotionPreference} from './useReducedMotionPreference.ts';
export function Hallmark({mark,event=0,sound=false,progress=0,ready=true,tone}:{tone?:'checked'|'closer'|'wrong';mark:Mark;event?:number;sound?:boolean;progress?:number;ready?:boolean}){
 const ref=useRef<HTMLSpanElement>(null),previous=useRef(event),initialized=useRef(false),reduce=useReducedMotionPreference();
 useEffect(()=>{const old=previous.current,first=!initialized.current;initialized.current=ready;previous.current=event;if(!ready||first||event<=old||document.hidden||reduce||!ref.current)return;
  ref.current.parentElement?.setAttribute("data-struck","true");
  const control=animate(ref.current,{transform:['scale(1.07) translateY(-2px)','scale(1) translateY(0)']},{type:'spring',duration:.18,bounce:0});
  if(sound){try{const audio=new AudioContext();const tone=audio.createOscillator(),gain=audio.createGain();tone.type='sine';tone.frequency.setValueAtTime(1600,audio.currentTime);tone.frequency.exponentialRampToValueAtTime(850,audio.currentTime+.06);gain.gain.setValueAtTime(.018,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.07);tone.connect(gain).connect(audio.destination);tone.start();tone.stop(audio.currentTime+.08);tone.onended=()=>void audio.close().catch(()=>{});void audio.resume().catch(()=>{});setTimeout(()=>{if(audio.state!=='closed')void audio.close().catch(()=>{});},250);}catch{/* Optional sound must never interrupt a recorded result. */}}
  return()=>control.stop();
 },[event,reduce,sound,ready]);
 const labels:Record<Mark,string>={accepted:'Accepted',rejected:'Rejected',needs:'Needs you',recheck:'Needs a fresh check',checked:'Checked',closer:'Look closer',wrong:"Something's wrong",working:'Working',stuck:'Stopped',waiting:'Waiting'};
 return <span className="hallmark-well" data-mark={mark} data-tone={tone??mark} aria-label={labels[mark]} role="img"><span ref={ref} className="hallmark-strike"><svg viewBox="0 0 48 48" aria-hidden="true">
 <circle className="hallmark-seal" cx="24" cy="24" r="20"/>
 {mark==='accepted'?<path d="M14 26v9h20v-9m-18-5 7 7 12-14" className="hallmark-tick"/>:mark==='rejected'?<path d="m17 17 14 14m0-14L17 31"/>:mark==='needs'?<><path d="M18 18a6 6 0 0 1 12 0c0 4-6 4-6 8"/><circle cx="24" cy="34" r="1.6" fill="currentColor" stroke="none"/></>:mark==='recheck'?<path d="M17 32V16m-5 5 5-5 5 5m9-5v16m-5-5 5 5 5-5"/>:mark==='checked'?<path d="m14 24 7 7 13-15" className="hallmark-tick"/>:mark==='closer'?<g className="hallmark-magnifier"><circle cx="21" cy="21" r="6.5"/><path d="m26 26 7 7"/></g>:mark==='wrong'?<path d="M24 14v12m0 7h.01" className="hallmark-tick"/>:mark==='working'?<path d="M24 4a20 20 0 1 1-20 20" style={{transform:`rotate(${progress%4*45}deg)`,transformOrigin:'24px 24px'}}/>:mark==='stuck'?<g className="hallmark-pause"><path d="M20 16v16m8-16v16"/></g>:<g fill="currentColor" stroke="none"><circle cx="16" cy="24" r="1.8"/><circle cx="24" cy="24" r="1.8"/><circle cx="32" cy="24" r="1.8"/></g>}

 </svg></span></span>;
}
