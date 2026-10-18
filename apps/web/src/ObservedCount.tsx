import {useEffect,useRef} from 'react';import {animate} from 'motion';
export function ObservedCount({value,event}:{value:number;event:number}){
 const ref=useRef<HTMLSpanElement>(null),last=useRef({value,event});
 useEffect(()=>{const old=last.current;last.current={value,event};if(!ref.current)return;
  ref.current.textContent=String(value);
  if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||event<=old.event||value<=old.value)return;
  const controls=animate(old.value,value,{type:'spring',duration:.22,bounce:0,onUpdate:n=>{if(ref.current)ref.current.textContent=String(Math.round(n));}});
  const stop=()=>{controls.stop();if(ref.current)ref.current.textContent=String(value);};document.addEventListener('visibilitychange',stop,{once:true});return()=>{stop();document.removeEventListener('visibilitychange',stop);};
 },[value,event]);
 return <><span ref={ref} aria-hidden="true">{value}</span><span className="unfool-sr-only">{value}</span></>;
}
