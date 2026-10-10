export const ticketStatuses=['queued','building','checking','fixing','ready_for_review','kept','discarded','needs_you','interrupted','cancelled','harness_error'] as const;
export type TicketStatus=typeof ticketStatuses[number];
export const ticketEventKinds=['submitted','state_changed','transition_rejected','agent_started','agent_bound','agent_stopped','agent_event','processes','needs_you','check_result','decision','retry_requested','cleanup','candidate_frozen','cancellation_requested','recovery','verification_started'] as const;
export type TicketEventKind=typeof ticketEventKinds[number];
export const ticketCheckVerdicts=['VERIFIED','PASSED WITH GAPS','FAILED','NOT CHECKED'] as const;
export type TicketCheckVerdict=typeof ticketCheckVerdicts[number];
export type Ticket={id:string;title:string;requestText:string;repoPath:string;baseCommit:string;status:TicketStatus;attemptCount:number;candidateCommits:string[];checkVerdict:TicketCheckVerdict|null;createdAt:string;updatedAt:string};
export type TicketEvent={sequence:number;ticketId:string;kind:TicketEventKind;data:Record<string,unknown>;createdAt:string};
