import type {DatabaseSync} from 'node:sqlite';
import {SpecError} from './spec-errors.ts';
export function migrateDraftArchive(db:DatabaseSync){db.exec(`CREATE TABLE draft_visibility_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,draft_id TEXT NOT NULL REFERENCES chat_drafts(id) ON DELETE RESTRICT,action TEXT NOT NULL CHECK(action IN('ARCHIVE','RESTORE')),created_at TEXT NOT NULL) STRICT;
CREATE TRIGGER draft_visibility_no_update BEFORE UPDATE ON draft_visibility_events BEGIN SELECT RAISE(ABORT,'Visibility events are append-only'); END;
CREATE TRIGGER draft_visibility_no_delete BEFORE DELETE ON draft_visibility_events BEGIN SELECT RAISE(ABORT,'Visibility events are append-only'); END;
CREATE TRIGGER draft_visibility_no_replace BEFORE INSERT ON draft_visibility_events WHEN EXISTS(SELECT 1 FROM draft_visibility_events WHERE sequence=NEW.sequence) BEGIN SELECT RAISE(ABORT,'Visibility events are append-only'); END;`);}
export function archivedDraftIds(db:DatabaseSync):string[]{return db.prepare("SELECT draft_id FROM draft_visibility_events v WHERE action='ARCHIVE' AND sequence=(SELECT max(sequence) FROM draft_visibility_events WHERE draft_id=v.draft_id) ORDER BY draft_id").all().map(r=>String(r.draft_id));}
export function changeDraftArchive(db:DatabaseSync,body:Record<string,unknown>,now=Date.now()){
 if(Object.keys(body).some(k=>!['action','draftId'].includes(k))||!['archive-old','restore'].includes(String(body.action)))throw new SpecError('INVALID_REQUEST','Choose archive or restore.',400);
 const archived=new Set(archivedDraftIds(db));let ids:string[];
 if(body.action==='restore'){if(typeof body.draftId!=='string'||!archived.has(body.draftId))throw new SpecError('DRAFT_NOT_FOUND','That draft is not archived.',404);ids=[body.draftId];}
 else ids=db.prepare("SELECT id FROM chat_drafts WHERE status IN('DRAFT','QUESTION','ERROR') AND (status='ERROR' OR created_at < ?) ORDER BY id").all(new Date(now-86400000).toISOString()).map(r=>String(r.id)).filter(id=>!archived.has(id));
 db.exec('BEGIN IMMEDIATE');try{const statement=db.prepare('INSERT INTO draft_visibility_events(draft_id,action,created_at) VALUES(?,?,?)');for(const id of ids)statement.run(id,body.action==='restore'?'RESTORE':'ARCHIVE',new Date(now).toISOString());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return {archivedDraftIds:archivedDraftIds(db)};
}
