import {useLayoutEffect,useRef,type RefObject} from 'react';
import {animate} from 'motion';
import type {DeskTicket} from './useUnfoolableData.ts';
import {motionReason} from './event-motion.ts';
// FLIP the persisted rows only when a new recorded transition caused the move.
// Search, paging, mounting, clock ticks and reconnecting old history have no entrance.
export function useEventMotion(list:RefObject<HTMLOListElement|null>,tickets:DeskTicket[]){
 const previous=useRef(new Map<string,DeskTicket>()),positions=useRef(new Map<string,DOMRect>()),initialized=useRef(false);
 useLayoutEffect(()=>{
  const rows=[...(list.current?.querySelectorAll<HTMLElement>('[data-ticket-id]')??[])],next=new Map(rows.map(row=>[row.dataset.ticketId!,row.getBoundingClientRect()]));
  const reasons=new Map(tickets.map(t=>[t.id,motionReason(previous.current.get(t.id),t,initialized.current,Date.now())]));
  const moves=[...reasons.values()].some(reason=>reason==='accepted'||reason==='rejected');
  const controls:ReturnType<typeof animate>[]=[];
  if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   for(const row of rows){const id=row.dataset.ticketId!,reason=reasons.get(id),before=positions.current.get(id),after=next.get(id)!;
    const dy=moves&&before?before.top-after.top:0;
    if(!reason&&!dy)continue;
    row.dataset.motion=reason??'layout';
    const transform=reason==='arrival'?'translateY(6px) scale(.99)':reason==='rejected'?`translate(12px, ${dy}px) scale(.98)`:reason==='accepted'?`translateY(${dy}px) scaleY(.97)`:reason==='attention'?'translateY(-2px)':`translateY(${dy}px)`;
    controls.push(animate(row,{transform:[transform,'translate(0px, 0px) scale(1)'],opacity:[reason==='arrival'?.2:1,1]},{type:'spring',duration:.24,bounce:0}));
   }
  }
  previous.current=new Map(tickets.map(t=>[t.id,t]));positions.current=next;initialized.current=true;
  const stop=()=>{controls.forEach(c=>c.stop());for(const row of rows){row.style.transform='';row.style.opacity='';}};document.addEventListener('visibilitychange',stop,{once:true});
  return()=>{stop();document.removeEventListener('visibilitychange',stop);};
 },[list,tickets]);
}
