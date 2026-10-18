import {useEventHighlights} from './useEventHighlights.ts';
import {ObservedCount} from './ObservedCount.tsx';
import {useEffect,useState,useRef} from 'react';
import type {DeskTicket} from './useUnfoolableData.ts';
import {liveLine} from '../../../packages/shared/ticket-activity.ts';
export function LiveActivity({ticket}:{ticket:DeskTicket}){
 const root=useRef<HTMLDivElement>(null);
 const [now,setNow]=useState(Date.now());const activity=ticket.activity;
 // One timeout per observed step, not a spinner or an animation loop.
 useEffect(()=>{if(!activity?.at)return;setNow(Date.now());const timer=setTimeout(()=>setNow(Date.now()),Math.max(0,Date.parse(activity.at)+20000-Date.now()));return()=>clearTimeout(timer);},[activity?.sequence,activity?.at]);
 useEventHighlights(root,activity?.sequence??0);
 if(!activity)return null;
 return <div ref={root} className="unfool-live"><p className="unfool-status" role="status">{liveLine(activity,ticket.status,now)}</p><ol className="unfool-track" aria-label="Work stages">{['Build','Check','Proof'].map((label,i)=><li key={label} data-event-sequence={activity.stages[i]==='waiting'?0:activity.steps.filter(s=>i===0?/Making/.test(s.line):i===1?/tests/.test(s.line):/proof|Ready/.test(s.line)).at(-1)?.sequence??0} data-stage={activity.stages[i]}><span className="unfool-track-rail" aria-hidden="true"/><span>{label}</span><span className="unfool-sr-only">: {activity.stages[i]==='done'?'finished':activity.stages[i]==='running'?'started':'not started'}</span></li>)}</ol>{activity.tests&&<p className="unfool-test-count">Old tests: <ObservedCount value={activity.tests.passed} event={activity.sequence}/> of {activity.tests.total} passed</p>}</div>;
}
