import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import type {ChatDraft} from '../../packages/shared/chat.ts';
import {TICKET_LIMITS} from '../../packages/shared/ticket-budget.ts';
import type {NightWindow,NightEntry} from '../../packages/shared/night.ts';
import {humanDigest} from './human-confirmation.ts';
import {requireHuman} from './human-context.ts';
import {SpecError} from './spec-errors.ts';
import type {createTicketService} from './ticket-service.ts';

export function nightTables(db:DatabaseSync){db.exec(`
 CREATE TABLE IF NOT EXISTS night_entries(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,window_start TEXT NOT NULL,window_end TEXT NOT NULL,token_limit INTEGER NOT NULL CHECK(token_limit>0),binding TEXT NOT NULL,snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),receipt_id TEXT NOT NULL UNIQUE,status TEXT NOT NULL CHECK(status IN('queued','running','finished','expired','stale','interrupted')),ticket_id TEXT UNIQUE REFERENCES tickets(id),reason TEXT,created_at TEXT NOT NULL) STRICT;
 CREATE UNIQUE INDEX IF NOT EXISTS night_pending_draft ON night_entries(draft_id) WHERE status IN('queued','running');
 CREATE TABLE IF NOT EXISTS night_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,entry_id TEXT REFERENCES night_entries(id),kind TEXT NOT NULL,data_json TEXT NOT NULL CHECK(json_valid(data_json)),created_at TEXT NOT NULL) STRICT;
 CREATE TRIGGER IF NOT EXISTS night_event_replace BEFORE INSERT ON night_events WHEN EXISTS(SELECT 1 FROM night_events WHERE sequence=NEW.sequence) BEGIN SELECT RAISE(ABORT,'Night events cannot be replaced'); END;
 CREATE TRIGGER IF NOT EXISTS night_lifecycle BEFORE UPDATE ON night_entries WHEN (OLD.ticket_id IS NOT NULL AND NEW.ticket_id IS NOT OLD.ticket_id) OR (OLD.ticket_id IS NULL AND NEW.ticket_id IS NOT NULL AND (OLD.status!='queued' OR NEW.status!='running')) OR (NEW.status!=OLD.status AND NOT ((OLD.status='queued' AND NEW.status IN('running','expired','stale','interrupted')) OR (OLD.status='running' AND NEW.status IN('finished','stale','interrupted')))) OR OLD.status NOT IN('queued','running') BEGIN SELECT RAISE(ABORT,'Night consent was consumed or is terminal'); END;
 CREATE TRIGGER IF NOT EXISTS night_entry_delete BEFORE DELETE ON night_entries BEGIN SELECT RAISE(ABORT,'Night consent is retained'); END;
 CREATE TRIGGER IF NOT EXISTS night_event_update BEFORE UPDATE ON night_events BEGIN SELECT RAISE(ABORT,'Night events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS night_event_delete BEFORE DELETE ON night_events BEGIN SELECT RAISE(ABORT,'Night events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS night_binding_update BEFORE UPDATE ON night_entries WHEN NEW.id!=OLD.id OR NEW.draft_id!=OLD.draft_id OR NEW.binding!=OLD.binding OR NEW.snapshot_json!=OLD.snapshot_json OR NEW.receipt_id!=OLD.receipt_id OR NEW.window_start!=OLD.window_start OR NEW.window_end!=OLD.window_end OR NEW.token_limit!=OLD.token_limit BEGIN SELECT RAISE(ABORT,'Night consent is immutable'); END;
 `);}
export function nightEvent(db:DatabaseSync,id:string|null,kind:string,data:unknown,now=Date.now()){db.prepare('INSERT INTO night_events(entry_id,kind,data_json,created_at) VALUES(?,?,?,?)').run(id,kind,JSON.stringify(data),new Date(now).toISOString());}
export type NightSnapshot={draft:ChatDraft;repo:string;base:string;playbookHash:string;approval:unknown;budget:typeof TICKET_LIMITS;window:NightWindow};
export function createNightStore(db:DatabaseSync,dataDir:string,draft:(id:string)=>ChatDraft|null,playbook:ReturnType<typeof createTicketService>['playbookEvidence']){
 nightTables(db);
 function window(raw:Record<string,unknown>,now:number):NightWindow{if(Object.keys(raw).sort().join(',')!=='end,start,tokenLimit'||typeof raw.start!=='string'||typeof raw.end!=='string'||typeof raw.tokenLimit!=='number'||!Number.isSafeInteger(raw.tokenLimit)||raw.tokenLimit<1||raw.tokenLimit>3000000)throw new SpecError('INVALID_NIGHT','Choose a start, morning end and total allowance.',400);const start=Date.parse(raw.start),end=Date.parse(raw.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=now||end<=start||end-start>12*3600000||start>now+48*3600000||start<now-12*3600000)throw new SpecError('INVALID_NIGHT','Choose a future morning cutoff within two days and a window up to 12 hours.',400);return {start:new Date(start).toISOString(),end:new Date(end).toISOString(),tokenLimit:raw.tokenLimit};}
 function snapshot(id:string,raw:Record<string,unknown>,now=Date.now(),authorizedDraft?:ChatDraft):NightSnapshot{
  const d=authorizedDraft??draft(id);if(!d||d.status!=='DRAFT'||!d.title.trim()||!d.requestText.trim()||!d.doneMeans.trim())throw new SpecError('STALE_NIGHT','Complete the current draft before queuing it.');
  const p=playbook(d.repoPath);if(!p?.approval||p.approval.hash!==p.hash)throw new SpecError('PLAYBOOK_REQUIRED','Approve this project’s current test instructions first.');
  const repo=realpathSync(d.repoPath),git=(...args:string[])=>execFileSync('git',['--no-optional-locks','--no-lazy-fetch','--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null','-C',repo,...args],{encoding:'utf8',timeout:4000,maxBuffer:8192,env:{PATH:process.env.PATH,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}}).trim();
  if(git('rev-parse','--show-toplevel')!==repo)throw new SpecError('INVALID_NIGHT','Use the repository root.');
  return {draft:d,repo,base:git('rev-parse','HEAD'),playbookHash:p.hash,approval:p.approval,budget:TICKET_LIMITS,window:window(raw,now)};
 }
 function evidence(id:string,raw:Record<string,unknown>){if(db.prepare("SELECT id FROM night_entries WHERE draft_id=? AND status IN('queued','running')").get(id))throw new SpecError('STALE_NIGHT','This draft was already queued.');return snapshot(id,raw);}
 function enqueue(id:string,raw:Record<string,unknown>){const state=evidence(id,raw),receipt=requireHuman(dataDir,{item:'draft:'+id,action:'tonight'}),key=randomUUID();if(Date.now()>=Date.parse(state.window.end))throw new SpecError('STALE_NIGHT','Morning approval expired before it could be saved.');
  db.exec('BEGIN IMMEDIATE');try{db.prepare("INSERT INTO night_entries VALUES(?,?,?,?,?,?,?,?,'queued',NULL,NULL,?)").run(key,id,state.window.start,state.window.end,state.window.tokenLimit,humanDigest(state),JSON.stringify(state),receipt?.id??'test:'+key,new Date().toISOString());nightEvent(db,key,'queued',{binding:humanDigest(state),confirmation:receipt?.id??'isolated-test',expiresAt:state.window.end});db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return list();}
 function rows(){return db.prepare('SELECT * FROM night_entries ORDER BY created_at,id').all();}
 function list():NightEntry[]{return rows().map(r=>({id:String(r.id),draftId:String(r.draft_id),title:(JSON.parse(String(r.snapshot_json)) as NightSnapshot).draft.title,start:String(r.window_start),end:String(r.window_end),tokenLimit:Number(r.token_limit),status:String(r.status),ticketId:r.ticket_id===null?null:String(r.ticket_id),reason:r.reason===null?null:String(r.reason)}));}
 function bindingValid(id:string,now:number){const r=rows().find(r=>r.id===id);if(!r)return false;try{const saved=JSON.parse(String(r.snapshot_json)) as NightSnapshot,current=draft(String(r.draft_id));if(!current)return false;let consentDraft=current;if(r.status==='running'){if(current.status!=='STARTED'||current.ticketId!==r.ticket_id||current.version!==saved.draft.version+1)return false;consentDraft={...current,status:'DRAFT',ticketId:null,version:saved.draft.version,updatedAt:saved.draft.updatedAt};}return humanDigest(snapshot(String(r.draft_id),saved.window,now,consentDraft))===r.binding;}catch{return false;}}
 function finish(id:string,status:'finished'|'expired'|'stale'|'interrupted',reason:string,now=Date.now()){const r=db.prepare("UPDATE night_entries SET status=?,reason=? WHERE id=? AND status IN('queued','running')").run(status,reason,id);if(r.changes)nightEvent(db,id,status,{reason},now);}
 return {evidence,enqueue,rows,list,bindingValid,finish};
}
