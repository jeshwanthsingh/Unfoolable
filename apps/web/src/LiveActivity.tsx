import {useEffect,useState} from 'react';
import type {DeskTicket} from './useUnfoolableData.ts';
import {liveLine} from '../../../packages/shared/ticket-activity.ts';
export function LiveActivity({ticket}:{ticket:DeskTicket}){
 const [now,setNow]=useState(Date.now());const activity=ticket.activity;
 // One timeout per observed step, not a spinner or an animation loop.
 useEffect(()=>{if(!activity?.at)return;setNow(Date.now());const timer=setTimeout(()=>setNow(Date.now()),Math.max(0,Date.parse(activity.at)+20000-Date.now()));return()=>clearTimeout(timer);},[activity?.sequence,activity?.at]);
 if(!activity)return null;
 return <div className="unfool-live"><p className="unfool-status">{liveLine(activity,ticket.status,now)}</p><ol className="unfool-track" aria-label="Work stages">{['Build','Check','Proof'].map((label,i)=><li key={label} data-stage={activity.stages[i]}><span className="unfool-track-rail" aria-hidden="true"/><span>{label}</span><span className="unfool-sr-only">: {activity.stages[i]==='done'?'finished':activity.stages[i]==='running'?'started':'not started'}</span></li>)}</ol>{activity.tests&&<p className="unfool-test-count">Old tests: {activity.tests.passed} of {activity.tests.total} passed</p>}</div>;
}
