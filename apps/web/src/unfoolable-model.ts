import {gapSentence} from '../../../packages/shared/check-copy.ts';
import type {Detail} from './TicketPanel.tsx';
import type {Ticket,TicketEvent} from '../../../packages/shared/tickets.ts';
export type Mark='checked'|'closer'|'wrong'|'working'|'stuck'|'waiting'|'accepted'|'rejected'|'needs'|'recheck';
export const words={empty:'Nothing here yet. What should we work on?',gaps:"Done, but one part couldn't be checked.",wrong:"Something's wrong: a test was quietly changed.",failed:"Something's wrong: a check failed. Look at the changes.",stuck:'Stuck. Try again or reject it.',needs:'Needs your OK before continuing.',offline:"Can't connect. Start Unfoolable, then try again.",unchecked:"This change hasn't been checked yet."} as const;
export function currentResultDetail(ticket:{checkSequence?:number},detail?:Detail):Detail|undefined{return detail&&latestCheckEvent(detail.events)>=(ticket.checkSequence??0)?detail:undefined;}
export function taskPresentation(ticket:Pick<Ticket,'status'|'updatedAt'|'checkVerdict'>&{checkSequence?:number},detail?:Detail,now=Date.now()):{mark:Mark;sentence:string;tone?:'checked'|'closer'|'wrong'}{
 detail=currentResultDetail(ticket,detail);
 if(ticket.status==='kept'){
  const result=detail?.check?.verdict??ticket.checkVerdict;
  if(('summary' in ticket&&!!(ticket.summary as {wrong?:boolean})?.wrong)||detail?.risk?.color==='RED'||detail?.check?.testTampering?.status==='FLAGGED'||detail?.check?.testWriter?.warnings?.length)return {mark:'accepted',tone:'wrong',sentence:'Accepted earlier. A warning remains; see the proof.'};
  return result==='VERIFIED'&&!detail?.evidenceStale?{mark:'accepted',tone:'checked',sentence:'Saved as a separate copy. Your main code is unchanged.'}:{mark:'accepted',tone:'closer',sentence:'Saved a separate copy with unchecked parts. Main code is unchanged.'};
 }
 if(ticket.status==='discarded')return {mark:'rejected',sentence:'Rejected. Your files were left alone.'};
 if(['building','fixing','checking'].includes(ticket.status)){
  const start=detail?.events.filter(e=>e.kind==='state_changed'&&e.data.to===ticket.status).at(-1)?.createdAt??('startedAt' in ticket&&typeof ticket.startedAt==='string'?ticket.startedAt:ticket.updatedAt);
  const minutes=Math.max(0,Math.floor((now-Date.parse(start))/60000));
  return {mark:'working',sentence:ticket.status==='checking'?'Checking the change before you decide.':minutes<1?'Working on it for less than a minute.':`Working on it for ${minutes} ${minutes===1?'minute':'minutes'}.`};
 }
 if(ticket.status==='cancelled')return {mark:'stuck',sentence:'Stopped. No change was accepted.'};
 if(['harness_error','interrupted'].includes(ticket.status)){
  const reason=detail?.events.filter(e=>['needs_you','state_changed'].includes(e.kind)).map(e=>String(e.data.reason??'')).join(' ').toLowerCase()??'';
  const sentence=/ownership|start|launch/.test(reason)?"Stuck: the worker couldn't start. Try again or reject it.":/timeout|deadline/.test(reason)?'Stuck: work took too long. Try again or reject it.':/denied|permission|sandbox/.test(reason)?'Stuck: access was blocked. Try again or reject it.':words.stuck;
  return {mark:'stuck',sentence};
 }
 if(ticket.status==='needs_you'&&detail?.events.filter(e=>e.kind==='needs_you').at(-1)?.data.kind==='ACTION_BUDGET')return {mark:'stuck',sentence:'Ran out of time.'};
 if(ticket.status==='queued')return {mark:'waiting',sentence:'Waiting to start.'};
 if(!detail){
  const summary='summary' in ticket?ticket.summary as {result?:string;wrong?:boolean;warning?:string;gapSummary?:string}:undefined;
  if(summary&&'budgetStopped' in summary&&summary.budgetStopped)return {mark:'stuck',sentence:'Ran out of time.'};
  if(summary?.wrong)return {mark:'wrong',sentence:summary.warning==='review'?'Something needs a closer look before you accept.':summary.warning==='independent'?"Something's wrong: an independent test failed.":words.wrong};
  if(summary?.result==='FAILED')return {mark:'wrong',sentence:words.failed};
  if(ticket.status==='needs_you')return {mark:'needs',sentence:words.needs};
  if(summary?.result==='VERIFIED')return {mark:'checked',sentence:'Checked. The recorded tests passed.'};
  if(summary?.result==='PASSED WITH GAPS')return {mark:'closer',sentence:summary.gapSummary??words.gaps};
  return summary?{mark:'recheck',sentence:'Needs a fresh check.'}:{mark:'waiting',sentence:'Loading the latest result.'};
 }
 if(detail.check?.testTampering?.status==='FLAGGED')return {mark:'wrong',sentence:words.wrong};
 if(detail.check?.testWriter?.warnings?.length)return {mark:'wrong',sentence:"Something's wrong: an independent test failed."};
 if(detail.risk?.color==='RED')return {mark:'wrong',sentence:'Something needs a closer look before you accept.'};
 if(detail.evidenceStale)return {mark:'recheck',sentence:'Needs a fresh check.'};
 const result=detail.check?.verdict??ticket.checkVerdict;
 if(result==='FAILED')return {mark:'wrong',sentence:words.failed};
 if(ticket.status==='needs_you')return {mark:'needs',sentence:words.needs};
 if(result==='PASSED WITH GAPS')return {mark:'closer',sentence:gapSentence(detail.check?.gaps??[],detail.ticket.title)};
 if(result==='VERIFIED')return {mark:'checked',sentence:'Checked. The recorded tests passed.'};
 return {mark:'closer',sentence:words.unchecked};
}
export function mayAccept(detail:Detail):boolean{
 return ['VERIFIED','PASSED WITH GAPS'].includes(detail.check?.verdict??detail.ticket.checkVerdict??'')&&detail.ticket.status==='ready_for_review'&&detail.keepAvailable===true&&!detail.evidenceStale&&!detail.diffReviewRequired&&detail.ticket.candidateCommits.length>0;
}
export function latestCheckEvent(events:TicketEvent[]):number{return events.filter(e=>e.kind==='check_result').at(-1)?.sequence??0;}
export function awaySummary(tickets:Pick<Ticket,'status'|'updatedAt'>[],now=Date.now()):string{
 const day=new Date(now);day.setHours(0,0,0,0);
 const today=tickets.filter(t=>Date.parse(t.updatedAt)>=day.getTime());
 const waiting=tickets.filter(t=>['ready_for_review','needs_you','harness_error','interrupted'].includes(t.status)).length;
 const done=today.filter(t=>['kept','discarded'].includes(t.status)).length;
 return waiting||done?`${done} decided today. ${waiting} waiting; scroll to see all.`:'Nothing needs a decision right now.';
}
export type ProofLine={text:string;mark:Mark};
export function proofLines(detail:Detail):ProofLine[]{
 const result=detail.check,lines:ProofLine[]=[];
 lines.push({text:detail.evidenceStale?'Checks need refreshing before accepting.':result?.verdict==='FAILED'?'The protected checks found a problem.':result?.verdict==='VERIFIED'?'The recorded checks passed.':result?.verdict==='PASSED WITH GAPS'?'The recorded checks passed with unchecked parts.':'The protected checks have not passed.',mark:detail.evidenceStale?'closer':result?.verdict==='VERIFIED'?'checked':result?.verdict==='FAILED'?'wrong':'closer'});
 const gates=result?.qualityGates?.gates;
 const secrets=gates?.filter(g=>['gitleaks','detect-secrets'].includes(g.gate));
 if(secrets?.length)lines.push({text:secrets.every(g=>g.status==='PASS')?'No new password-like strings were found.':'The password scan needs attention.',mark:secrets.every(g=>g.status==='PASS')?'checked':'closer'});
 lines.push({text:result?.testTampering?.status==='CLEAR'?'No tests were secretly changed.':result?.testTampering?.status==='FLAGGED'?'A test change needs your attention.':"Test changes haven't been checked.",mark:result?.testTampering?.status==='CLEAR'?'checked':result?.testTampering?.status==='FLAGGED'?'wrong':'closer'});
 if(result?.testWriter?.warnings?.length)lines.push({text:'An independent test fails on this change.',mark:'wrong'});
 if(result?.gaps.length)lines.push({text:"Some requested behavior wasn't independently checked.",mark:'closer'});
 return lines;
}

export function aiNotePreview(events:TicketEvent[]):string{
 const note=events.filter(e=>e.kind==='agent_stopped'&&typeof e.data.summary==='string').at(-1)?.data.summary;
 if(typeof note!=='string')return 'No separate AI summary was recorded.';
 const first=note.split(/\n\s*\n/)[0]??note;
 return /\b(candidate|base|playbook|verdict|harness|mutation|tripwire|watchman|worktree|admission|gate|evidence)\b/i.test(first)?'Read the original AI note in Technical details.':first;
}
