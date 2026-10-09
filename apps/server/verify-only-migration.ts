import type {DatabaseSync} from 'node:sqlite';
export function migrateVerifyOnly(db:DatabaseSync){
 db.exec(`CREATE TABLE verify_only_runs(id TEXT PRIMARY KEY,input_json TEXT NOT NULL CHECK(json_valid(input_json)),state TEXT NOT NULL CHECK(state IN('AUTHORING','REVIEW','VERIFYING','RESULT','ERROR')),review_json TEXT CHECK(review_json IS NULL OR json_valid(review_json)),result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),error TEXT,created_at TEXT NOT NULL,approved_at TEXT) STRICT;
 DROP TRIGGER mission_decisions_no_update; DROP TRIGGER mission_decisions_no_delete; DROP TRIGGER mission_decisions_no_replace;
 ALTER TABLE mission_decisions RENAME TO old_mission_decisions;
 CREATE TABLE mission_decisions(sequence INTEGER PRIMARY KEY AUTOINCREMENT,mission_id TEXT NOT NULL REFERENCES missions(id),kind TEXT NOT NULL CHECK(kind IN('APPROVE_SPEC','LAND','ABANDON')),spec_id TEXT,run_id TEXT,created_at TEXT NOT NULL,CHECK(kind='ABANDON' OR spec_id IS NOT NULL),UNIQUE(mission_id,kind,spec_id)) STRICT;
 INSERT INTO mission_decisions SELECT * FROM old_mission_decisions; DROP TABLE old_mission_decisions;
 CREATE UNIQUE INDEX mission_terminal_once ON mission_decisions(mission_id) WHERE kind IN('LAND','ABANDON');
 CREATE TRIGGER mission_decisions_no_update BEFORE UPDATE ON mission_decisions BEGIN SELECT RAISE(ABORT,'Human decisions are immutable'); END;
 CREATE TRIGGER mission_decisions_no_delete BEFORE DELETE ON mission_decisions BEGIN SELECT RAISE(ABORT,'Human decisions are immutable'); END;
 CREATE TRIGGER mission_decisions_no_replace BEFORE INSERT ON mission_decisions WHEN EXISTS(SELECT 1 FROM mission_decisions WHERE mission_id=NEW.mission_id AND kind=NEW.kind AND spec_id IS NEW.spec_id) BEGIN SELECT RAISE(ABORT,'Human decisions cannot be replaced'); END;`);
}
