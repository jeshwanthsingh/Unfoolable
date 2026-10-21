import type {Detail} from './TicketPanel.tsx';
import {taskPresentation} from './unfoolable-model.ts';
import {reviewSentence} from './review-copy.ts';
/** Copy only. Server availability and mayAccept remain the decision authority. */
export function proofPassCopy(detail:Detail){
 const state=taskPresentation(detail.ticket,detail),needs=['ready_for_review','needs_you','interrupted','harness_error'].includes(detail.ticket.status);
 let why:string;
 if(['harness_error','interrupted','cancelled'].includes(detail.ticket.status))why='Work stopped. A stopped worker is not a passing check.';
 else if(['building','fixing','checking','queued'].includes(detail.ticket.status))why='This work is still in progress. There is no new result to accept.';
 else if(detail.evidenceStale)why='This change needs a fresh check before you can accept it.';
 else if(detail.check?.verdict==='FAILED')why='A protected check found a problem. Inspect the changes and the saved check details.';
 else if(detail.check?.verdict==='VERIFIED')why='The recorded checks passed for this exact change. You still decide whether to accept it.';
 else if(detail.check?.verdict==='PASSED WITH GAPS')why='The recorded checks passed, but some requested behavior could not be checked.';
 else why='The requested behavior has not been checked. Inspect what is missing before deciding.';
 return {...state,sentence:reviewSentence(state,needs),why};
}
export function bugInput(text:string){const prefix='Bug from this log:\n';return text.startsWith(prefix)?text:prefix+text;}
