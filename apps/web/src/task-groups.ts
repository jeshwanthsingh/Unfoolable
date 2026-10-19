import type {DeskTicket} from './useUnfoolableData.ts';
export const PAGE_SIZE=25;
export function groupTasks(tickets:Pick<DeskTicket,'id'|'title'|'status'|'updatedAt'|'plainTitle'>[],query='',now=new Date()){
 const groups=['Needs you','Working','Done today','Rejected','Earlier'].map(name=>({name,tickets:[] as typeof tickets}));const start=new Date(now);start.setHours(0,0,0,0);const q=query.trim().toLocaleLowerCase();
 for(const t of tickets){if(q&&!((t.title+' '+(t.plainTitle??'')).toLocaleLowerCase().includes(q)))continue;const n=['ready_for_review','needs_you','interrupted','harness_error'].includes(t.status)?0:['queued','building','checking','fixing'].includes(t.status)?1:Date.parse(t.updatedAt)>=start.getTime()?(t.status==='discarded'?3:2):4;groups[n]!.tickets.push(t);}return groups.filter(g=>g.name!=='Rejected'||g.tickets.length>0);
}

export function initialTaskLimit(group:string,query=''){return group==='Needs you'&&!query?3:PAGE_SIZE;}
