import type {DatabaseSync} from 'node:sqlite';
import {ticketStatuses,ticketEventKinds} from '../../packages/shared/tickets.ts';
export function migrateTickets(db:DatabaseSync){
 db.exec(`CREATE TABLE tickets(
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id)>0),
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 request_text TEXT NOT NULL CHECK(length(trim(request_text)) BETWEEN 1 AND 65536),
 repo_path TEXT NOT NULL CHECK(substr(repo_path,1,1)='/'),
 base_commit TEXT NOT NULL CHECK(length(base_commit) IN(40,64) AND base_commit NOT GLOB '*[^0-9a-f]*'),
 status TEXT NOT NULL CHECK(status IN(${ticketStatuses.map(s=>"'"+s+"'").join(',')})),
 attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
 candidate_commits TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(candidate_commits) AND json_type(candidate_commits)='array'),
 check_verdict TEXT CHECK(check_verdict IS NULL OR check_verdict IN('VERIFIED','PASSED WITH GAPS','FAILED','NOT CHECKED')),
 created_at TEXT NOT NULL CHECK(length(created_at)>0),updated_at TEXT NOT NULL CHECK(length(updated_at)>0)
 ) STRICT;
 CREATE INDEX tickets_created ON tickets(created_at DESC,id);
 CREATE TABLE ticket_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN(${ticketEventKinds.map(s=>"'"+s+"'").join(',')})),
 data_json TEXT NOT NULL CHECK(json_valid(data_json) AND json_type(data_json)='object' AND length(CAST(data_json AS BLOB))<=65536),created_at TEXT NOT NULL CHECK(length(created_at)>0)) STRICT;
 CREATE INDEX ticket_events_ticket ON ticket_events(ticket_id,sequence);
 CREATE TRIGGER ticket_event_no_replace BEFORE INSERT ON ticket_events WHEN EXISTS(SELECT 1 FROM ticket_events WHERE sequence=NEW.sequence) BEGIN SELECT RAISE(ABORT,'Ticket events are immutable'); END;
 CREATE TRIGGER ticket_event_no_update BEFORE UPDATE ON ticket_events BEGIN SELECT RAISE(ABORT,'Ticket events are immutable'); END;
 CREATE TRIGGER ticket_event_no_delete BEFORE DELETE ON ticket_events BEGIN SELECT RAISE(ABORT,'Ticket events are immutable'); END;
 CREATE TRIGGER ticket_fixed_binding BEFORE UPDATE ON tickets WHEN NEW.id IS NOT OLD.id OR NEW.title IS NOT OLD.title OR NEW.request_text IS NOT OLD.request_text OR NEW.repo_path IS NOT OLD.repo_path OR NEW.base_commit IS NOT OLD.base_commit OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'Ticket input is immutable'); END;
 CREATE TRIGGER ticket_no_replace BEFORE INSERT ON tickets WHEN EXISTS(SELECT 1 FROM tickets WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Tickets cannot be replaced'); END;
 CREATE TRIGGER ticket_no_delete BEFORE DELETE ON tickets BEGIN SELECT RAISE(ABORT,'Tickets cannot be deleted'); END;`);
}
