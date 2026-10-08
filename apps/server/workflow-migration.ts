import type {DatabaseSync} from 'node:sqlite';
export function migrateWorkflow(db:DatabaseSync){
 db.exec(`CREATE TABLE mission_workflows(mission_id TEXT PRIMARY KEY NOT NULL REFERENCES missions(id),status TEXT NOT NULL CHECK(status IN('PREPARING','NEEDS_CLARIFICATION','SPEC_REVIEW','QUEUED','BUILDING','VERIFYING','CORRECTING','CHECKS_PASSED','NEEDS_YOU','LANDED','ABANDONED')),spec_id TEXT,error TEXT,updated_at TEXT NOT NULL) STRICT;
 CREATE TABLE mission_decisions(sequence INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT NOT NULL REFERENCES missions(id),kind TEXT NOT NULL CHECK(kind IN('APPROVE_SPEC','LAND','ABANDON')),spec_id TEXT NOT NULL,run_id TEXT,created_at TEXT NOT NULL,UNIQUE(mission_id,kind,spec_id)) STRICT;
 CREATE TRIGGER mission_decisions_no_update BEFORE UPDATE ON mission_decisions BEGIN SELECT RAISE(ABORT,'Human decisions are immutable'); END;
 CREATE TRIGGER mission_decisions_no_delete BEFORE DELETE ON mission_decisions BEGIN SELECT RAISE(ABORT,'Human decisions are immutable'); END;
 CREATE TRIGGER mission_decisions_no_replace BEFORE INSERT ON mission_decisions WHEN EXISTS(SELECT 1 FROM mission_decisions WHERE mission_id=NEW.mission_id AND kind=NEW.kind AND spec_id=NEW.spec_id) BEGIN SELECT RAISE(ABORT,'Human decisions cannot be replaced'); END;`);
}
