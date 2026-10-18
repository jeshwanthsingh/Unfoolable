import {useLayoutEffect,useRef,type RefObject} from 'react';import {animate} from 'motion';
export function useEventHighlights(root:RefObject<HTMLElement|null>,sequence:number){
 const last=useRef(sequence);
 useLayoutEffect(()=>{const before=last.current;last.current=sequence;
  if(sequence<=before||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const nodes=[...(root.current?.querySelectorAll<HTMLElement>('[data-event-sequence]')??[])].filter(n=>Number(n.dataset.eventSequence)>before&&Number(n.dataset.eventSequence)<=sequence);
  const controls=nodes.map(n=>animate(n,{opacity:[.45,1],transform:['translateY(2px)','translateY(0px)']},{type:'spring',duration:.18,bounce:0}));
  const stop=()=>{controls.forEach(c=>c.stop());nodes.forEach(n=>{n.style.opacity='';n.style.transform='';});};document.addEventListener('visibilitychange',stop,{once:true});return()=>{stop();document.removeEventListener('visibilitychange',stop);};
 },[root,sequence]);
}
