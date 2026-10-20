import type {DatabaseSync} from 'node:sqlite';
import type {NightEntry,NightView} from '../../packages/shared/night.ts';
import type {createTicketService} from './ticket-service.ts';
import type {createChatStore} from './chat-store.ts';
import {createNightStore,nightEvent,type NightSnapshot} from './night-store.ts';
import {humanDigest} from './human-confirmation.ts';
import {fixtureApprovalsEnabled} from './data-mode.ts';
import {getTicket,listTicketEvents,appendTicketEvent} from './ticket-store.ts';
import {ticketBudget} from './ticket-budget.ts';
import {onACPower,keepNightAwake,notifyNightEnded} from './night-power.ts';
import {reconcileOwnedProcesses} from './build-processes.ts';
import type {ProcessRecord} from '../../packages/shared/build.ts';
type Service=Pick<ReturnType<typeof createTicketService>,'create'|'list'|'stopAll'|'retryNightRateLimit'>;
type Store=ReturnType<typeof createNightStore>;
type Ops={now:()=>number;power:()=>boolean;awake:typeof keepNightAwake;notify?:()=>void};
const busy=['queued','building','fixing','checking'];
const key=(entry:Pick<NightEntry,'start'|'end'|'tokenLimit'>)=>humanDigest([entry.start,entry.end,entry.tokenLimit]);
/** No scoring or decision authority. This schedules only a passkey-authorized Start. */
export function createNightShift(db:DatabaseSync,dataDir:string,store:Store,tickets:Service,chat:ReturnType<typeof createChatStore>,fixture?:Ops){
 if(fixture&&!fixtureApprovalsEnabled(dataDir))throw Error('Night fixtures require isolated test data.');
 const ops=fixture??{now:Date.now,power:onACPower,awake:keepNightAwake,notify:notifyNightEnded};
 let timer:NodeJS.Timeout|undefined,locked=false,closed=false,lastTick=ops.now(),generation=0,inFlight:Promise<void>|null=null,endingJob:Promise<void>|null=null,fault=false,waitingForPower=false;
 let shift:{key:string;entry:NightEntry;awake:Awaited<ReturnType<typeof keepNightAwake>>}|null=null;
 const events=()=>db.prepare('SELECT * FROM night_events ORDER BY sequence').all();
 const ended=(k:string)=>events().some(e=>['shift_stopping','shift_ended'].includes(String(e.kind))&&JSON.parse(String(e.data_json)).key===k);
 const members=(k:string)=>store.list().filter(e=>key(e)===k);
 function tokens(k:string){return members(k).reduce((total,e)=>{if(!e.ticketId)return total;const b=ticketBudget(db,e.ticketId),reviews=listTicketEvents(db,e.ticketId).filter(v=>v.kind==='agent_event'&&v.data.kind==='reviewer_done');return total+(b.reportedCodexTokens??0)+(b.reportedWriterTokens??0)+reviews.reduce((n,r)=>n+Number((r.data.run as {usage?:{totalTokens?:number}})?.usage?.totalTokens??0),0);},0);}
 function report():NightView['report']{const end=events().findLast(e=>e.kind==='shift_ended');if(!end)return null;const d=JSON.parse(String(end.data_json)),items=members(d.key).filter(e=>e.ticketId).map(e=>{const t=e.ticketId?getTicket(db,e.ticketId):null;return {title:e.title,status:t?.status??e.status,verdict:t?.checkVerdict??null};}),checked=items.filter(i=>i.verdict==='VERIFIED').length,closer=items.length-checked;return {ticketIds:members(d.key).flatMap(e=>e.ticketId?[e.ticketId]:[]),summary:items.length?`Good morning. Night Shift did ${items.length} things: ${checked} checked, ${closer} need a closer look.`:'Night Shift stopped before starting work.',start:d.start,end:String(end.created_at),tokens:tokens(d.key),items};}
 function notifications(){return JSON.parse(String(events().findLast(e=>e.kind==='notification_preference')?.data_json??'{}')).enabled===true;}
 function view():NightView{return {notice:fault?'Night Shift is stopped. Process cleanup needs inspection.':endingJob?'Stopping Night Shift...':waitingForPower?'Night Shift is waiting for AC power.':null,notifications:notifications(),entries:store.list(),report:report(),running:!!shift};}
 function end(reason:string,stop=true):Promise<void>{if(endingJob)return endingJob;const current=shift;if(!current)return Promise.resolve();shift=null;generation++;nightEvent(db,null,'shift_stopping',{key:current.key,start:current.entry.start,end:current.entry.end,reason},ops.now());
  endingJob=(async()=>{let stopped=false;try{if(stop)await tickets.stopAll('Night Shift: '+reason);stopped=true;}finally{
   for(const e of members(current.key).filter(e=>['queued','running'].includes(e.status)))store.finish(e.id,'interrupted',reason,ops.now());
   try{await current.awake.close();nightEvent(db,null,'keep_awake_stopped',{key:current.key},ops.now());if(!stopped)throw Error('Ticket cleanup could not be certified.');
    nightEvent(db,null,'shift_ended',{key:current.key,start:current.entry.start,end:current.entry.end,reason,tokens:tokens(current.key)},ops.now());chat.appendMessage({role:'jarvis',kind:'status',text:'Night Shift stopped: '+reason+'. Everything waits for your review.'});
    if(notifications()){try{ops.notify?.();nightEvent(db,null,'notification_sent',{key:current.key},ops.now());}catch{nightEvent(db,null,'notification_unavailable',{key:current.key},ops.now());}}
   }catch(error){fault=true;nightEvent(db,null,'supervisor_error',{key:current.key,reason:'Owned cleanup could not be certified'},ops.now());chat.appendMessage({role:'jarvis',kind:'error',text:'Night Shift is stopped. Process cleanup needs inspection before it can run again.'});throw error;}
  }})().finally(()=>{endingJob=null;});return endingJob;
 }
 async function step(){if(closed||locked||endingJob||fault)return;locked=true;const now=ops.now(),gap=now-lastTick;lastTick=now;
  try{
   if(shift){if(shift.awake.alive&&!shift.awake.alive()){await end('Keep-awake process stopped');return;}const running=members(shift.key).find(e=>e.status==='running');if(gap>15000){await end('Mac slept or the coordinator paused');return;}if(now>=Date.parse(shift.entry.end)){await end('Morning cutoff reached');return;}if(!ops.power()){await end('AC power is unavailable');return;}if(tokens(shift.key)>=shift.entry.tokenLimit){await end('Night allowance used up');return;}
    if(running?.ticketId){const ev=listTicketEvents(db,running.ticketId),security=ev.find(e=>e.kind==='needs_you'&&['TRIPWIRE','WATCHMAN','STOP_ALL'].includes(String(e.data.kind)));if(security){await end(String(security.data.kind));return;}const t=getTicket(db,running.ticketId)!;
     if(busy.includes(t.status))return;if(ev.filter(e=>e.kind==='cleanup').at(-1)?.data.cleanupUncertain===true){await end('Process cleanup needs inspection');return;}
     const rate=ev.filter(e=>e.kind==='cleanup'||e.kind==='agent_stopped').at(-1)?.data.code==='CODEX_RATE_LIMIT';
     if(rate&&t.status==='harness_error'){
      const waits=events().filter(e=>e.entry_id===running.id&&e.kind==='rate_limit_wait'),previous=waits.at(-1),next=previous?Number(JSON.parse(String(previous.data_json)).until):0;
      const retryAfter=ev.filter(e=>e.kind==='retry_requested'&&e.data.trigger==='night_rate_limit').at(-1)?.sequence??0,lastError=ev.filter(e=>e.data.code==='CODEX_RATE_LIMIT').at(-1)?.sequence??0;
      const waiting=previous&&Number(JSON.parse(String(previous.data_json)).errorSequence)===lastError;
      if(!waiting){const count=waits.length;if(count>=6){await end('Account limit did not clear');return;}const until=now+Math.min(900000,60000*2**count);nightEvent(db,running.id,'rate_limit_wait',{until,errorSequence:lastError,retryAfter},now);db.prepare("UPDATE night_entries SET reason='Waiting for Codex allowance; retrying later' WHERE id=?").run(running.id);return;}
      if(now<next)return;
      if(!store.bindingValid(running.id,now)){await end('Queued consent changed or expired');return;}
      nightEvent(db,running.id,'rate_limit_retry',{previousError:lastError},now);await tickets.retryNightRateLimit(running.ticketId);db.prepare('UPDATE night_entries SET reason=NULL WHERE id=?').run(running.id);return;
     }
     const started=ev.some(e=>e.kind==='agent_started');if(started&&ticketBudget(db,t.id).reportedCodexTokens===null){await end('Codex usage could not be confirmed');return;}
     store.finish(running.id,'finished','Waiting for your review',now);nightEvent(db,running.id,'review_waiting',{ticketId:t.id,status:t.status,verdict:t.checkVerdict},now);
    }
   }
   // Expiration changes no ticket and cannot silently renew approval.
   for(const e of store.list().filter(e=>e.status==='queued'&&Date.parse(e.end)<=now))store.finish(e.id,'expired','Morning approval expired',now);
   if(tickets.list().tickets.some(t=>busy.includes(t.status)))return;
   const next=store.list().find(e=>e.status==='queued'&&Date.parse(e.start)<=now&&Date.parse(e.end)>now&&(!shift||key(e)===shift.key));
   if(!next){if(shift&&!members(shift.key).some(e=>['queued','running'].includes(e.status)))await end('All queued work stopped for review',false);return;}
   if(ended(key(next))){store.finish(next.id,'interrupted','This shift already ended; confirm a new draft to run again',now);return;}
   if(!ops.power()){if(!waitingForPower){waitingForPower=true;nightEvent(db,null,'power_wait',{key:key(next)},now);}return;}if(waitingForPower){waitingForPower=false;nightEvent(db,null,'power_restored',{key:key(next)},now);}
   if(!store.bindingValid(next.id,now)){store.finish(next.id,'stale','Request, repository, test instructions or budget changed',now);return;}
   const saved=JSON.parse(String(store.rows().find(r=>r.id===next.id)!.snapshot_json)) as NightSnapshot;
   // Reserve the full remaining per-ticket allowance, not an optimistic usage estimate.
   if(next.tokenLimit-tokens(key(next))<saved.budget.maxCodexTokens+(saved.budget.maxWriterTokens??40000)){if(shift)await end('Not enough night allowance for another task',false);else store.finish(next.id,'interrupted','Not enough night allowance for this task',now);return;}
   if(!shift){const awake=await ops.awake(Date.parse(next.end));if(closed){await awake.close();return;}shift={key:key(next),entry:next,awake};nightEvent(db,null,'shift_started',{key:key(next),start:next.start,end:next.end,tokenLimit:next.tokenLimit},now);nightEvent(db,null,'keep_awake_started',{key:key(next),records:awake.records},now);}
   const token=generation;
   try{await tickets.create({title:saved.draft.title,repoPath:saved.repo,requestText:saved.draft.requestText+'\n\nDone means:\n'+saved.draft.doneMeans},ticket=>{
    if(closed||token!==generation||!shift||ops.now()>=Date.parse(next.end)||!ops.power()||!store.bindingValid(next.id,ops.now())||ticket.baseCommit!==saved.base||ops.now()>=Date.parse(next.end))throw Error('Night consent changed before dispatch.');
    const claim=db.prepare("UPDATE night_entries SET status='running',ticket_id=? WHERE id=? AND status='queued'").run(ticket.id,next.id);if(claim.changes!==1)throw Error('Night consent already consumed.');
    const d=chat.updateDraft(saved.draft.id,saved.draft.version,{status:'STARTED',ticketId:ticket.id});if(!d)throw Error('Night draft changed.');appendTicketEvent(db,ticket.id,'agent_event',{kind:'night_started',entryId:next.id,consentHash:store.rows().find(r=>r.id===next.id)!.binding,expiresAt:next.end,budget:saved.budget});nightEvent(db,next.id,'dispatched',{ticketId:ticket.id},ops.now());
   });}catch(error){store.finish(next.id,'stale','Could not start safely; confirm the current draft again',ops.now());nightEvent(db,next.id,'dispatch_error',{reason:(error as Error).message},ops.now());}
  }finally{locked=false;}
 }
 function tick(){if(inFlight)return inFlight;inFlight=step().finally(()=>{inFlight=null;});return inFlight;}
 async function recover(){
  const rows=events(),starts=rows.filter(e=>e.kind==='shift_started');for(const start of starts){const d=JSON.parse(String(start.data_json));if(rows.some(e=>e.kind==='shift_ended'&&JSON.parse(String(e.data_json)).key===d.key))continue;for(const e of members(d.key).filter(e=>['queued','running'].includes(e.status)))store.finish(e.id,'interrupted','Coordinator restarted; Retry needs your confirmation',ops.now());const awake=rows.findLast(e=>e.kind==='keep_awake_started'&&JSON.parse(String(e.data_json)).key===d.key);if(awake){const records=JSON.parse(String(awake.data_json)).records as ProcessRecord[];if(records.length){const result=await reconcileOwnedProcesses(records);if(!result.verified){fault=true;nightEvent(db,null,'supervisor_error',{key:d.key,reason:'Keep-awake recovery is uncertain'},ops.now());chat.appendMessage({role:'jarvis',kind:'error',text:'Night Shift needs process cleanup inspection. Nothing will start overnight.'});continue;}}}nightEvent(db,null,'shift_ended',{key:d.key,start:d.start,reason:'Coordinator restarted'},ops.now());}
 }
 return {view,tick,recover,setNotifications(enabled:boolean){nightEvent(db,null,'notification_preference',{enabled},ops.now());},start(){lastTick=ops.now();timer=setInterval(()=>{void tick().catch(async()=>{try{await end('Night supervisor failed');}catch{/* No automatic retry after uncertain cleanup. */}});},1000);timer.unref();},async stop(reason:string){generation++;await end(reason);for(const e of store.list().filter(e=>e.status==='queued')){store.finish(e.id,'interrupted',reason,ops.now());if(!ended(key(e)))nightEvent(db,null,'shift_ended',{key:key(e),start:e.start,reason},ops.now());}await inFlight;},async close(){closed=true;generation++;if(timer)clearInterval(timer);await end('Coordinator shut down');await inFlight;}};
}
