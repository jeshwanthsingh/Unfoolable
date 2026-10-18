import type {Detail} from './TicketPanel.tsx';
import type {Ticket,TicketEvent} from '../../../packages/shared/tickets.ts';
export type Mark='checked'|'closer'|'wrong'|'working'|'stuck'|'waiting';
export const words={empty:'Nothing here yet. What should we work on?',gaps:"Done, but one part couldn't be checked.",wrong:"Something's wrong: a test was quietly changed.",failed:"Something's wrong: a check failed. Look at the changes.",stuck:'Stuck. Try again or reject it.',needs:'Needs your OK before continuing.',offline:"Can't connect. Start Unfoolable, then try again.",unchecked:"This change hasn't been checked yet."} as const;
export function taskPresentation(ticket:Ticket,detail?:Detail,now=Date.now()):{mark:Mark;sentence:string}{
 if(ticket.status==='kept')return {mark:'checked',sentence:'Accepted. Saved on its own branch.'};
 if(ticket.status==='discarded')return {mark:'stuck',sentence:'Rejected. Your files were left alone.'};
 if(['building','fixing','checking'].includes(ticket.status)){
  const start=detail?.events.filter(e=>e.kind==='state_changed'&&e.data.to===ticket.status).at(-1)?.createdAt??ticket.updatedAt;
  const minutes=Math.max(0,Math.floor((now-Date.parse(start))/60000));
  return {mark:'working',sentence:ticket.status==='checking'?'Checking the change before you decide.':minutes<1?'Working on it for less than a minute.':`Working on it for ${minutes} ${minutes===1?'minute':'minutes'}.`};
 }
 if(['harness_error','interrupted','cancelled'].includes(ticket.status)){
  const reason=detail?.events.filter(e=>['needs_you','state_changed'].includes(e.kind)).map(e=>String(e.data.reason??'')).join(' ').toLowerCase()??'';
  const sentence=/ownership|start|launch/.test(reason)?"Stuck: the worker couldn't start. Try again or reject it.":/timeout|deadline/.test(reason)?'Stuck: work took too long. Try again or reject it.':/denied|permission|sandbox/.test(reason)?'Stuck: access was blocked. Try again or reject it.':words.stuck;
  return {mark:'stuck',sentence};
 }
 if(ticket.status==='needs_you')return {mark:'closer',sentence:words.needs};
 if(ticket.status==='queued')return {mark:'waiting',sentence:'Waiting to start.'};
 if(!detail)return {mark:'waiting',sentence:'Loading the latest result.'};
 if(detail.evidenceStale)return {mark:'closer',sentence:'Checks need refreshing. Try again before accepting.'};
 if(detail.check?.testTampering?.status==='FLAGGED')return {mark:'wrong',sentence:words.wrong};
 if(detail.check?.testWriter?.warnings?.length)return {mark:'wrong',sentence:"Something's wrong: an independent test failed."};
 if(detail.risk?.color==='RED')return {mark:'wrong',sentence:'Something needs a closer look before you accept.'};
 const result=detail.check?.verdict??ticket.checkVerdict;
 if(result==='FAILED')return {mark:'wrong',sentence:words.failed};
 if(result==='PASSED WITH GAPS')return {mark:'closer',sentence:words.gaps};
 if(result==='VERIFIED')return {mark:'checked',sentence:'Checked. The recorded tests passed.'};
 return {mark:'closer',sentence:words.unchecked};
}
export function mayAccept(detail:Detail):boolean{
 return detail.ticket.status==='ready_for_review'&&detail.keepAvailable===true&&!detail.evidenceStale&&!detail.diffReviewRequired&&detail.ticket.candidateCommits.length>0;
}
export function latestCheckEvent(events:TicketEvent[]):number{return events.filter(e=>e.kind==='check_result').at(-1)?.sequence??0;}
export function awaySummary(tickets:Ticket[],now=Date.now()):string{
 const day=new Date(now);day.setHours(0,0,0,0);
 const today=tickets.filter(t=>Date.parse(t.updatedAt)>=day.getTime());
 const waiting=tickets.filter(t=>['ready_for_review','needs_you','harness_error','interrupted'].includes(t.status)).length;
 const done=today.filter(t=>['kept','discarded'].includes(t.status)).length;
 return waiting||done?`${done} decided today. ${waiting} waiting for you.`:'Nothing needs a decision right now.';
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
