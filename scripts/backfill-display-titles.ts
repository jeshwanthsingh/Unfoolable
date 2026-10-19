import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {appendTicketEvent,getTicket,listTicketEvents} from '../apps/server/ticket-store.ts';
export type DisplayTitleEntry={id:string;requestHash:string;plainTitle:string};
/** Maintenance only: append display metadata, never update immutable ticket input or a decision. */
export function backfillDisplayTitles(db:DatabaseSync,entries:readonly DisplayTitleEntry[]){
 db.exec('BEGIN IMMEDIATE');
 try{
  let added=0;
  for(const entry of entries){
   if(!/^[\p{L}\p{N}]+(?:[ '\u2019][\p{L}\p{N}]+)*$/u.test(entry.plainTitle)||entry.plainTitle.split(/\s+/).length>8||entry.plainTitle.length>120)throw Error('Display title must be plain words, at most eight');
   const ticket=getTicket(db,entry.id);if(!ticket||createHash('sha256').update(ticket.requestText).digest('hex')!==entry.requestHash)throw Error('Original request changed or ticket missing');
   const previous=listTicketEvents(db,entry.id).filter(e=>typeof e.data.plainTitle==='string').at(-1);
   if(previous?.data.plainTitle===entry.plainTitle&&previous.data.titleAuthor==='AI')continue;
   appendTicketEvent(db,entry.id,'agent_event',{kind:'display_title',plainTitle:entry.plainTitle,titleAuthor:'AI',sourceRequestHash:entry.requestHash});added++;
  }
  db.exec('COMMIT');return added;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
