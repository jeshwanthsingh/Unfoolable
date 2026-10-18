import {useEffect,useRef} from 'react';
import {animate} from 'motion';
import type {Mark} from './unfoolable-model.ts';
import {useReducedMotionPreference} from './useReducedMotionPreference.ts';
export function Hallmark({mark,event=0,sound=false,progress=0}:{mark:Mark;event?:number;sound?:boolean;progress?:number}){
 const ref=useRef<HTMLSpanElement>(null),previous=useRef(event),reduce=useReducedMotionPreference();
 useEffect(()=>{const old=previous.current;previous.current=event;if(!old||event<=old||document.hidden||reduce||!ref.current)return;
  const control=animate(ref.current,{transform:['scale(1.07) translateY(-2px)','scale(1) translateY(0)']},{type:'spring',duration:.18,bounce:0});
  if(sound){const audio=new AudioContext();const tone=audio.createOscillator(),gain=audio.createGain();tone.type='sine';tone.frequency.setValueAtTime(1600,audio.currentTime);tone.frequency.exponentialRampToValueAtTime(850,audio.currentTime+.06);gain.gain.setValueAtTime(.018,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.07);tone.connect(gain).connect(audio.destination);tone.start();tone.stop(audio.currentTime+.08);tone.onended=()=>void audio.close();}
  return()=>control.stop();
 },[event,reduce,sound]);
 const labels:Record<Mark,string>={checked:'Checked',closer:'Look closer',wrong:"Something's wrong",working:'Working',stuck:'Stuck',waiting:'Waiting'};
 return <span className="hallmark-well" data-mark={mark} aria-label={labels[mark]} role="img"><span ref={ref} className="hallmark-strike"><svg viewBox="0 0 48 48" aria-hidden="true">
 {mark==='checked'?<><path d="M24 5 39 12v12c0 9-8 15-15 19C17 39 9 33 9 24V12Z" fill="currentColor"/><path d="m16 24 6 6 11-13" className="hallmark-tick"/></>:mark==='closer'?<><path d="M24 5 39 12v12c0 9-8 15-15 19C17 39 9 33 9 24V12Z"/><path d="M29 16a9 9 0 1 0 4 9"/></>:mark==='wrong'?<><path d="M24 5 39 12v8l-8 3 7 6c-3 6-9 11-14 14C17 39 9 33 9 24V12Z"/><path d="m24 15-3 10m-2 7h.1"/></>:mark==='working'?<path d="M13 36A17 17 0 1 1 39 16" style={{transform:`rotate(${progress%4*45}deg)`,transformOrigin:'24px 24px'}}/>:<path d={mark==='stuck'?'M17 24h14':'M23 24h2'}/>}
 </svg></span></span>;
}
