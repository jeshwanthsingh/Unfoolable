import type {TicketEvent} from '../../../packages/shared/tickets.ts';
import {replaySchedule} from './office-model.ts';
export const trailerDuration=38000;
export function trailerSchedule(id:string,events:readonly TicketEvent[]){return replaySchedule(id,events).map((step,i,all)=>{const gap=i?Math.max(0,Date.parse(step.event.createdAt)-Date.parse(all[i-1]!.event.createdAt)):0;return {...step,atMs:2000+Math.round(step.atMs/45000*32000),skippedMs:gap>10000?gap:0};});}
