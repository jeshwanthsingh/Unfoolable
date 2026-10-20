/** Display-only facts. No permission, approval or scoring implementation lives here. */
export type SafetyObject='bars'|'drawers'|'laser'|'fuel'|'stop'|'lock'|'package';
export const safetyObjects=[
 {id:'bars',name:'Barred window',x:87,y:28,w:100,h:26},
 {id:'drawers',name:'Locked drawers',x:242,y:244,w:74,h:45},
 {id:'laser',name:'Tripwire',x:290,y:139,w:14,h:64},
 {id:'fuel',name:'Fuel gauge',x:155,y:128,w:15,h:20},
 {id:'stop',name:'Stop all lever',x:463,y:217,w:16,h:40},
 {id:'lock',name:'Inspection room lock',x:300,y:157,w:16,h:26},
 {id:'package',name:'Package at your desk',x:393,y:225,w:32,h:26},
] as const;
// Replaced only after the real protected-path probe completes; never inferred from UI state.
export const protectionProbe:{count:number|null;date:string|null;source:string}={count:71,date:'2026-10-20',source:'artifacts/sign1/after-probe.json, fresh real Builder probe; 0 of 71 readable; signer invocation denied'};
export function safetyExplanation(id:SafetyObject,{alarm,fuel,replay}:{alarm:boolean;fuel:{used:number|null;limit:number}|null;replay:boolean}){
 const facts:Record<SafetyObject,{sentence:string;source:string}>={
  bars:{sentence:'The Builder is configured without internet access.',source:'Builder permission profile, apps/server/build-runtime.ts; outbound denial checked by the real Builder probe.'},
  drawers:{sentence:protectionProbe.count===null?'Protected-path probe result is unknown.':`${protectionProbe.count} protected paths were unreadable on ${protectionProbe.date}.`,source:protectionProbe.source},
  laser:{sentence:alarm?'A recorded tripwire alarm stopped this Builder.':'No tripwire alarm is recorded for this ticket.',source:'Selected ticket event log: needs_you/TRIPWIRE or agent_event/tripwire; absence is not sensor-health proof.'},
  fuel:{sentence:fuel?.used!==null&&fuel?.used!==undefined?`${fuel.used.toLocaleString()} of ${fuel.limit.toLocaleString()} Builder tokens reported.`:'Builder token usage is unknown.',source:'Stored ticket detail: budget.reportedCodexTokens and budget.limits.maxCodexTokens.'+(replay?' Stored ticket total, not a historical replay-time estimate.':'')},
  stop:{sentence:'Stop all opens the same stop action used by the main screen.',source:'Existing main-screen Stop all control. This illustration cannot resume or approve a ticket.'},
  lock:{sentence:'Protected checks run in a separate restricted process.',source:'apps/server/oracle-execution.ts; configured process boundary, not a live running indicator.'},
  package:{sentence:replay?'This is a replay; return to live to open the review.':'Open the existing proof and review for this exact ticket.',source:'Selected ticket ID and existing proof/review flow; diff review and passkey rules stay unchanged.'},
 };
 return facts[id];
}
export function safetyObjectAt(x:number,y:number):SafetyObject|null{return safetyObjects.find(o=>Math.abs(x-o.x)<=o.w/2&&Math.abs(y-o.y)<=o.h/2)?.id??null;}
