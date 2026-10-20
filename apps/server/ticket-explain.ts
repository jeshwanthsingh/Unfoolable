import {loadVerdictSnapshot,type VerdictSnapshotRef} from './verdict-snapshot.ts';
import type {DatabaseSync} from 'node:sqlite';
import type {TicketEvent} from '../../packages/shared/tickets.ts';
import {scoreVerdict,combineResults,type TraceStep,type Outcome} from '../../packages/shared/verdict-core.ts';
import {isV1Report} from '../../packages/shared/verification-v1.ts';
export type TicketExplanation={source:'recorded'|'replayed'|'unavailable';verdict:string|null;matches:boolean|null;trace:TraceStep[];eventSequence?:number};
const isTrace=(value:unknown):value is TraceStep[]=>Array.isArray(value)&&value.every(s=>s&&typeof s==='object'&&typeof s.rule==='string'&&typeof s.passed==='boolean'&&typeof s.explanation==='string');
/** Read-only explanation. Historical replay never refreshes evidence or enables a decision. */
export function explainTicket(db:DatabaseSync,events:readonly TicketEvent[]):TicketExplanation{
 const event=events.filter(e=>e.kind==='check_result').reduce<TicketEvent|undefined>((latest,e)=>!latest||e.sequence>latest.sequence?e:latest,undefined);
 if(!event)return {source:'unavailable',verdict:null,matches:null,trace:[]};
 const eventSequence=event.sequence;
 const record=event.data,verdict=typeof record.verdict==='string'?record.verdict:typeof record.coreVerdict==='string'?record.coreVerdict:null;
 if(record.verdictSnapshot){try{const saved=loadVerdictSnapshot(record.verdictSnapshot as VerdictSnapshotRef);return {eventSequence,source:'recorded',verdict,matches:saved.decision.verdict===verdict,trace:saved.decision.trace};}catch{return {eventSequence,source:'unavailable',verdict,matches:null,trace:[]};}}
 if(isTrace(record.coreTrace))return {eventSequence,source:'recorded',verdict,matches:null,trace:record.coreTrace};
 if(record.harnessError===true)return {eventSequence,source:'unavailable',verdict,matches:null,trace:[]};
 try{
  let native:Outcome|null=null;
  let nativeTrace:TraceStep[]=[];
  if(typeof record.verificationId==='string'){
   const row=db.prepare('SELECT result_json FROM verify_only_runs WHERE id=?').get(record.verificationId);
   const result=row?.result_json?JSON.parse(String(row.result_json)):null;const report:unknown=result?.v1;
   if(!isV1Report(report))return {eventSequence,source:'unavailable',verdict,matches:null,trace:[]};
   const scored=scoreVerdict({path:'native-ticket',layers:report.layers,gaps:report.gaps,supplied:{verdict:report.verdict,provenance:{source:'protected-verifier',verificationId:String(record.verificationId),evidenceHash:null}}});
   native={verdict:scored.verdict,gaps:scored.verdict==='NOT CHECKED'?report.gaps.map(g=>g.reason):report.gaps.map(g=>g.id+': '+g.reason),failures:report.layers.flatMap(l=>l.checks.filter(c=>c.status==='FAIL').map(c=>c.id+': '+(c.reason??'protected assertion failed')))};
   nativeTrace=scored.trace;
  }
  if(typeof record.playbookResultPath==='string'&&Array.isArray(record.failures)&&Array.isArray(record.gaps)){
   // These arrays were persisted by the original combiner in native-then-project order.
   // Validate the exact prefix; missing facts must never be replaced by guessed outcomes.
   const gaps=record.gaps as string[],failures=record.failures as string[];
   const prefix=native?.gaps.map(g=>'Existing verifier: '+g)??[];
   if(!prefix.every((g,i)=>g===gaps[i])||!(native?.failures??[]).every((f,i)=>f===failures[i]))return {eventSequence,source:'unavailable',verdict,matches:null,trace:[]};
   const projectGaps=gaps.slice(prefix.length),projectFailures=failures.slice(native?.failures.length??0);
   const projectScore=scoreVerdict({path:'playbook',gaps:projectGaps,failures:projectFailures});
   const project:Outcome={verdict:projectScore.verdict,gaps:projectGaps,failures:projectFailures};
   const scored=native?combineResults(native,project):projectScore;
   return {eventSequence,source:'replayed',verdict,matches:scored.verdict===verdict,trace:scored.trace};
  }
  if(native)return {eventSequence,source:'replayed',verdict,matches:native.verdict===verdict,trace:nativeTrace};
 }catch{/* Old/missing facts cannot be reconstructed by guessing. */}
 return {eventSequence,source:'unavailable',verdict,matches:null,trace:[]};
}
export function formatExplanation(explanation:TicketExplanation):string{
 const heading=explanation.source==='recorded'?'Recorded check steps':explanation.source==='replayed'?'Replayed from stored facts; not a fresh check':'Check steps were not retained for this result.';
 return [(explanation.eventSequence===undefined?'':'Event '+explanation.eventSequence+' (stored result: '+explanation.verdict+'). ')+heading,...explanation.trace.map((s,index)=>(index+1)+'. '+s.explanation),...(explanation.matches===false?['Stored result and replay disagree. Do not treat this explanation as fresh evidence.']:[])].join('\n');
}
