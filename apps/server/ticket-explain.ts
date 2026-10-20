import type {DatabaseSync} from 'node:sqlite';
import type {TicketEvent} from '../../packages/shared/tickets.ts';
import {scoreVerdict,type TraceStep} from '../../packages/shared/verdict-core.ts';
import {isV1Report} from '../../packages/shared/verification-v1.ts';
export type TicketExplanation={source:'recorded'|'replayed'|'unavailable';verdict:string|null;matches:boolean|null;trace:TraceStep[]};
const isTrace=(value:unknown):value is TraceStep[]=>Array.isArray(value)&&value.every(s=>s&&typeof s==='object'&&typeof s.rule==='string'&&typeof s.passed==='boolean'&&typeof s.explanation==='string');
/** Read-only explanation. Historical replay never refreshes evidence or enables a decision. */
export function explainTicket(db:DatabaseSync,events:readonly TicketEvent[]):TicketExplanation{
 const event=events.filter(e=>e.kind==='check_result'||isTrace(e.data.coreTrace)).at(-1);
 if(!event)return {source:'unavailable',verdict:null,matches:null,trace:[]};
 const record=event.data,verdict=typeof record.verdict==='string'?record.verdict:typeof record.coreVerdict==='string'?record.coreVerdict:null;
 if(isTrace(record.coreTrace))return {source:'recorded',verdict,matches:null,trace:record.coreTrace};
 if(record.harnessError===true)return {source:'unavailable',verdict,matches:null,trace:[]};
 try{
  if(typeof record.playbookResultPath==='string'&&Array.isArray(record.failures)&&Array.isArray(record.gaps)){
   const scored=scoreVerdict({path:'playbook',failures:record.failures as string[],gaps:record.gaps as string[]});
   return {source:'replayed',verdict,matches:scored.verdict===verdict,trace:scored.trace};
  }
  if(typeof record.verificationId==='string'){
   const row=db.prepare('SELECT result_json FROM verify_only_runs WHERE id=?').get(record.verificationId);
   const result=row?.result_json?JSON.parse(String(row.result_json)):null;
   if(isV1Report(result?.v1)){
    const scored=scoreVerdict({path:'native',layers:result.v1.layers,gaps:result.v1.gaps});
    return {source:'replayed',verdict,matches:scored.verdict===verdict,trace:scored.trace};
   }
  }
 }catch{/* Old/missing facts cannot be reconstructed by guessing. */}
 return {source:'unavailable',verdict,matches:null,trace:[]};
}
export function formatExplanation(explanation:TicketExplanation):string{
 const heading=explanation.source==='recorded'?'Recorded check steps':explanation.source==='replayed'?'Replayed from stored facts; not a fresh check':'Check steps were not retained for this result.';
 return [heading,...explanation.trace.map((s,index)=>(index+1)+'. '+s.explanation),...(explanation.matches===false?['Stored result and replay disagree. Do not treat this explanation as fresh evidence.']:[])].join('\n');
}
