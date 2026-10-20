import type {TicketEvent} from './tickets.ts';
export const reviewerRoles=['intent','readability','ui'] as const;
export type ReviewerRole=typeof reviewerRoles[number];
export const REVIEWER_TOKEN_LIMIT=15000;
/** OFF until the preregistered study supports enabling a role. */
export const DEFAULT_REVIEWERS:readonly ReviewerRole[]=[];
export type ReviewerFinding={file:string;line:number;message:string;serious:boolean};
export type ReviewerRun={role:ReviewerRole;status:'DONE'|'INCOMPLETE'|'ERROR'|'SKIPPED';discardedNotes?:number;findings:ReviewerFinding[];limitation:string;usage:{totalTokens:number}|null;sessionId:string|null;tokenLimit:number};
export type ReviewerPanel={candidate:string;checkSequence:number;runs:ReviewerRun[]};
/** Display projection only. A newer check invalidates the previous advisory panel. */
export function reviewerPanel(events:readonly TicketEvent[]):ReviewerPanel|null{
 const check=events.filter(e=>e.kind==='check_result').at(-1);if(!check)return null;
 const rows=events.filter(e=>e.kind==='agent_event'&&e.data.kind==='reviewer_done'&&e.data.checkSequence===check.sequence&&e.data.candidate===check.data.candidate);
 const runs=reviewerRoles.flatMap(role=>{const row=rows.filter(e=>e.data.role===role).at(-1);return row?[row.data.run as ReviewerRun]:[];});
 return runs.length?{candidate:String(check.data.candidate),checkSequence:check.sequence,runs}:null;
}
export function reviewerFlag(panel:ReviewerPanel|null|undefined){return !!panel?.runs.some(r=>r.status==='DONE'&&r.findings.some(f=>f.serious));}

const advisoryKinds=new Set(['reviewer_started','reviewer_processes','reviewer_cleanup','reviewer_finding','reviewer_discarded','reviewer_done','reviewer_unavailable']);
export const isReviewerEvent=(event:TicketEvent)=>event.kind==='agent_event'&&advisoryKinds.has(String(event.data.kind));
/** Strip only this new display channel; every pre-existing decision input stays intact. */
export function ticketDecisionView<T extends {events:TicketEvent[];reviewers?:ReviewerPanel|null;seal?:unknown}>(view:T){const {reviewers:_notes,seal:_seal,...state}=view;return {...state,events:state.events.filter(e=>!isReviewerEvent(e))};}
