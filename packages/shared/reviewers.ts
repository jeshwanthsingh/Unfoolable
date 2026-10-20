import type {TicketEvent} from './tickets.ts';
export const reviewerRoles=['intent','readability','ui'] as const;
export type ReviewerRole=typeof reviewerRoles[number];
export const REVIEWER_TOKEN_LIMIT=15000;
/** OFF until the preregistered study supports enabling a role. */
export const DEFAULT_REVIEWERS:readonly ReviewerRole[]=[];
export type ReviewerFinding={file:string;line:number;message:string;serious:boolean};
export type ReviewerRun={role:ReviewerRole;status:'DONE'|'ERROR'|'SKIPPED';findings:ReviewerFinding[];limitation:string;usage:{totalTokens:number}|null;sessionId:string|null;tokenLimit:number};
export type ReviewerPanel={candidate:string;checkSequence:number;runs:ReviewerRun[]};
/** Display projection only. A newer check invalidates the previous advisory panel. */
export function reviewerPanel(events:readonly TicketEvent[]):ReviewerPanel|null{
 const check=events.filter(e=>e.kind==='check_result').at(-1);if(!check)return null;
 const rows=events.filter(e=>e.kind==='agent_event'&&e.data.kind==='reviewer_done'&&e.data.checkSequence===check.sequence&&e.data.candidate===check.data.candidate);
 const runs=reviewerRoles.flatMap(role=>{const row=rows.filter(e=>e.data.role===role).at(-1);return row?[row.data.run as ReviewerRun]:[];});
 return runs.length?{candidate:String(check.data.candidate),checkSequence:check.sequence,runs}:null;
}
export function reviewerFlag(panel:ReviewerPanel|null|undefined){return !!panel?.runs.some(r=>r.status==='DONE'&&r.findings.some(f=>f.serious));}
