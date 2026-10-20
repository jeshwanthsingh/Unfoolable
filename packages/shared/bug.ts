import type {TicketEvent} from './tickets.ts';
export type BugState='log'|'reproduced'|'fixed'|'not_reproduced';
export function bugState(events:readonly TicketEvent[]):BugState|null{let state:BugState|null=null;for(const e of events){if((e.kind==='check_result'||e.kind==='candidate_frozen')&&state==='fixed')state='reproduced';if(e.kind!=='agent_event')continue;if(e.data.kind==='bug_log_received')state='log';if(e.data.kind==='bug_reproduced')state='reproduced';if(e.data.kind==='bug_fixed')state='fixed';if(e.data.kind==='bug_not_reproduced')state='not_reproduced';}return state;}
export const bugWords={log:'Error log recorded.',reproduced:'Bug reproduced ✓',fixed:'Bug reproduced ✓. Fixed ✓',not_reproduced:"Couldn't reproduce. No fix was attempted."} as const;
