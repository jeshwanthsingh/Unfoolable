import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,openSync,closeSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Logger} from './log.ts';
import {failure} from './errors.ts';

export function openDatabase(dataDir:string,logger:Logger){
 mkdirSync(dataDir,{recursive:true,mode:0o700});
 const lock=join(dataDir,'.coordinator.lock');const ownership=JSON.stringify({pid:process.pid,id:randomUUID()});
 let fd:number;
 try{fd=openSync(lock,'wx',0o600);}catch(error){
  if(error instanceof Error&&'code'in error&&error.code==='EEXIST')throw failure('DATABASE_IN_USE','Data directory already owned; stop its coordinator or confirm a stale lock before removing it');
  throw error;
 }
 try{writeFileSync(fd,ownership);}finally{closeSync(fd);}
 const release=()=>{if(readFileSync(lock,'utf8')===ownership)unlinkSync(lock);};
 let connection:DatabaseSync;
 try{connection=new DatabaseSync(join(dataDir,'command-center.sqlite'));}catch(error){release();throw error;}
 let closed=false;
 const close=()=>{if(closed)return;closed=true;try{if(connection.isOpen)connection.close();}finally{release();}};
 try{
  connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const applied:number[]=[];
  connection.exec('BEGIN IMMEDIATE');
  try{
   connection.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT');
   const current=Number(connection.prepare('SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations').get()?.version);
   if(current>7)throw failure('UNSUPPORTED_SCHEMA','Database schema is newer than this application supports');
   if(current===0){connection.prepare('INSERT INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());applied.push(1);}
   if(current<2){
    connection.exec(`CREATE TABLE projects(
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 120),
      repo_root TEXT NOT NULL UNIQUE CHECK(length(repo_root)>0),
      registered_head TEXT NOT NULL CHECK(length(registered_head) IN(40,64) AND registered_head NOT GLOB '*[^0-9a-f]*'),
      registered_branch TEXT,
      created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT`);
    connection.prepare('INSERT INTO schema_migrations VALUES(2,?)').run(new Date().toISOString());applied.push(2);
   }
   if(current<3){
    connection.exec(`CREATE TABLE missions(
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      original_intent TEXT NOT NULL CHECK(length(CAST(original_intent AS BLOB))>0),
      phase TEXT NOT NULL CHECK(phase='DRAFT'),
      created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT;
    CREATE INDEX missions_project_created ON missions(project_id,created_at DESC,id ASC)`);
    connection.prepare('INSERT INTO schema_migrations VALUES(3,?)').run(new Date().toISOString());applied.push(3);
   }
   if(current<4){
    connection.exec(`CREATE TABLE project_context_snapshots(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     snapshot_payload TEXT NOT NULL CHECK(json_valid(snapshot_payload) AND length(CAST(snapshot_payload AS BLOB))<=2097152),
     snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash)=64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'),
     created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT;
    CREATE INDEX context_mission_created ON project_context_snapshots(mission_id,created_at DESC);
    CREATE TRIGGER context_no_replace BEFORE INSERT ON project_context_snapshots WHEN EXISTS(SELECT 1 FROM project_context_snapshots WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END;
    CREATE TRIGGER context_no_update BEFORE UPDATE ON project_context_snapshots BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END;
    CREATE TRIGGER context_no_delete BEFORE DELETE ON project_context_snapshots BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END`);
    connection.prepare('INSERT INTO schema_migrations VALUES(4,?)').run(new Date().toISOString());applied.push(4);
   }
   if(current<5){
    connection.exec(`CREATE UNIQUE INDEX context_mission_identity ON project_context_snapshots(id,mission_id);
    CREATE TABLE mission_analyses(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     context_snapshot_id TEXT NOT NULL,
     base_head TEXT NOT NULL CHECK(length(base_head) IN(40,64)),
     status TEXT NOT NULL CHECK(status IN('PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED')),
     packet_json TEXT CHECK(packet_json IS NULL OR (json_valid(packet_json) AND length(CAST(packet_json AS BLOB))<=262144)),
     packet_hash TEXT CHECK(packet_hash IS NULL OR (length(packet_hash)=64 AND packet_hash NOT GLOB '*[^0-9a-f]*')),
     prompt_version TEXT NOT NULL,
     tool_version TEXT,
     result_json TEXT CHECK(result_json IS NULL OR (json_valid(result_json) AND length(CAST(result_json AS BLOB))<=65536)),
     packet_millis REAL,
     analysis_millis REAL,
     created_at TEXT NOT NULL,
     completed_at TEXT,
     error TEXT,
     FOREIGN KEY(context_snapshot_id,mission_id) REFERENCES project_context_snapshots(id,mission_id) ON DELETE RESTRICT,
     CHECK(status!='SUCCEEDED' OR (packet_json IS NOT NULL AND packet_hash IS NOT NULL AND result_json IS NOT NULL AND tool_version IS NOT NULL AND completed_at IS NOT NULL))
    ) STRICT;
    CREATE UNIQUE INDEX analysis_pending ON mission_analyses(mission_id,context_snapshot_id) WHERE status IN('PREPARING','RUNNING');
    CREATE INDEX analysis_mission_created ON mission_analyses(mission_id,created_at DESC);
    CREATE TRIGGER analysis_no_replace BEFORE INSERT ON mission_analyses WHEN EXISTS(SELECT 1 FROM mission_analyses WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Analyses are immutable'); END;
    CREATE TRIGGER analysis_no_terminal_update BEFORE UPDATE ON mission_analyses WHEN OLD.status NOT IN('PREPARING','RUNNING') BEGIN SELECT RAISE(ABORT,'Completed analyses are immutable'); END;
    CREATE TRIGGER analysis_fixed_binding BEFORE UPDATE ON mission_analyses WHEN NEW.id!=OLD.id OR NEW.mission_id!=OLD.mission_id OR NEW.context_snapshot_id!=OLD.context_snapshot_id OR NEW.base_head!=OLD.base_head OR NEW.prompt_version!=OLD.prompt_version OR NEW.created_at!=OLD.created_at BEGIN SELECT RAISE(ABORT,'Analysis binding is immutable'); END;
    CREATE TRIGGER analysis_no_delete BEFORE DELETE ON mission_analyses BEGIN SELECT RAISE(ABORT,'Analyses are immutable'); END;
    CREATE TABLE clarification_questions(
     id TEXT PRIMARY KEY NOT NULL,
     analysis_id TEXT NOT NULL REFERENCES mission_analyses(id) ON DELETE RESTRICT,
     question TEXT NOT NULL CHECK(length(question) BETWEEN 1 AND 600),
     why_it_matters TEXT NOT NULL CHECK(length(why_it_matters) BETWEEN 1 AND 500),
     decision_area TEXT NOT NULL CHECK(decision_area IN('behavior','security','compatibility','data','migration','performance','acceptance','scope','architecture','ux','failure')),
     options_json TEXT NOT NULL CHECK(json_valid(options_json)),
     evidence_ids_json TEXT NOT NULL CHECK(json_valid(evidence_ids_json)),
     required INTEGER NOT NULL CHECK(required=1),
     display_order INTEGER NOT NULL CHECK(display_order BETWEEN 0 AND 4),
     created_at TEXT NOT NULL,
     UNIQUE(analysis_id,display_order)
    ) STRICT;
    CREATE TRIGGER question_no_replace BEFORE INSERT ON clarification_questions WHEN EXISTS(SELECT 1 FROM clarification_questions WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Questions are immutable'); END;
    CREATE TRIGGER question_no_update BEFORE UPDATE ON clarification_questions BEGIN SELECT RAISE(ABORT,'Questions are immutable'); END;
    CREATE TRIGGER question_no_delete BEFORE DELETE ON clarification_questions BEGIN SELECT RAISE(ABORT,'Questions are immutable'); END;
    CREATE TABLE clarification_answers(
     question_id TEXT PRIMARY KEY NOT NULL REFERENCES clarification_questions(id) ON DELETE RESTRICT,
     answer_text TEXT NOT NULL CHECK(length(CAST(answer_text AS BLOB))>0 AND length(answer_text)<=4000),
     updated_at TEXT NOT NULL
    ) STRICT`);
    connection.prepare('INSERT INTO schema_migrations VALUES(5,?)').run(new Date().toISOString());applied.push(5);
   }
   if(current<6){
    connection.exec(`CREATE TABLE contract_drafts(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     parent_draft_id TEXT REFERENCES contract_drafts(id) ON DELETE RESTRICT,
     origin TEXT NOT NULL CHECK(origin IN('CODEX','USER_EDIT','REVISION')),
     status TEXT NOT NULL CHECK(status IN('PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED')),
     input_json TEXT NOT NULL CHECK(json_valid(input_json) AND length(CAST(input_json AS BLOB))<=393216),
     input_hash TEXT NOT NULL CHECK(length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
     payload_json TEXT CHECK(payload_json IS NULL OR (json_valid(payload_json) AND length(CAST(payload_json AS BLOB))<=49152)),
     user_edits_json TEXT NOT NULL CHECK(json_valid(user_edits_json) AND length(CAST(user_edits_json AS BLOB))<=131072),
     prompt_version TEXT NOT NULL,
     tool_version TEXT,
     elapsed_ms REAL,
     created_at TEXT NOT NULL,
     completed_at TEXT,
     error TEXT,
     CHECK(status!='SUCCEEDED' OR (payload_json IS NOT NULL AND completed_at IS NOT NULL)),
     UNIQUE(id,mission_id)
    ) STRICT;
    CREATE UNIQUE INDEX contract_pending ON contract_drafts(mission_id,input_hash) WHERE status IN('PREPARING','RUNNING');
    CREATE INDEX contract_mission_created ON contract_drafts(mission_id,created_at DESC);
    CREATE TRIGGER contract_no_replace BEFORE INSERT ON contract_drafts WHEN EXISTS(SELECT 1 FROM contract_drafts WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Contract drafts are immutable'); END;
    CREATE TRIGGER contract_no_terminal_update BEFORE UPDATE ON contract_drafts WHEN OLD.status NOT IN('PREPARING','RUNNING') BEGIN SELECT RAISE(ABORT,'Completed contract drafts are immutable'); END;
    CREATE TRIGGER contract_fixed_binding BEFORE UPDATE ON contract_drafts WHEN NEW.id!=OLD.id OR NEW.mission_id!=OLD.mission_id OR NEW.parent_draft_id IS NOT OLD.parent_draft_id OR NEW.origin!=OLD.origin OR NEW.input_json!=OLD.input_json OR NEW.input_hash!=OLD.input_hash OR NEW.user_edits_json!=OLD.user_edits_json OR NEW.prompt_version!=OLD.prompt_version OR NEW.created_at!=OLD.created_at BEGIN SELECT RAISE(ABORT,'Contract input binding is immutable'); END;
    CREATE TRIGGER contract_no_delete BEFORE DELETE ON contract_drafts BEGIN SELECT RAISE(ABORT,'Contract drafts are immutable'); END;
    CREATE TABLE mission_contract_revisions(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     revision INTEGER NOT NULL CHECK(revision>=1),
     draft_id TEXT NOT NULL UNIQUE,
     input_hash TEXT NOT NULL CHECK(length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
     payload_json TEXT NOT NULL CHECK(json_valid(payload_json) AND length(CAST(payload_json AS BLOB))<=49152),
     user_edits_json TEXT NOT NULL CHECK(json_valid(user_edits_json) AND length(CAST(user_edits_json AS BLOB))<=131072),
     contract_hash TEXT NOT NULL CHECK(length(contract_hash)=64 AND contract_hash NOT GLOB '*[^0-9a-f]*'),
     canonical TEXT NOT NULL CHECK(json_valid(canonical) AND length(CAST(canonical AS BLOB))<=131072),
     accepted_at TEXT NOT NULL,
     FOREIGN KEY(draft_id,mission_id) REFERENCES contract_drafts(id,mission_id) ON DELETE RESTRICT,
     UNIQUE(mission_id,revision)
    ) STRICT;
    CREATE TRIGGER revision_no_replace BEFORE INSERT ON mission_contract_revisions WHEN EXISTS(SELECT 1 FROM mission_contract_revisions WHERE id=NEW.id OR draft_id=NEW.draft_id OR (mission_id=NEW.mission_id AND revision=NEW.revision)) BEGIN SELECT RAISE(ABORT,'Accepted contract revisions are immutable'); END;
    CREATE TRIGGER revision_no_update BEFORE UPDATE ON mission_contract_revisions BEGIN SELECT RAISE(ABORT,'Accepted contract revisions are immutable'); END;
    CREATE TRIGGER revision_no_delete BEFORE DELETE ON mission_contract_revisions BEGIN SELECT RAISE(ABORT,'Accepted contract revisions are immutable'); END`);
    connection.prepare('INSERT INTO schema_migrations VALUES(6,?)').run(new Date().toISOString());applied.push(6);
   }
   if(current<7){
    connection.exec(`CREATE UNIQUE INDEX contract_revision_mission_binding ON mission_contract_revisions(id,mission_id);
    CREATE TABLE planning_drafts(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     contract_revision_id TEXT NOT NULL,
     parent_draft_id TEXT REFERENCES planning_drafts(id) ON DELETE RESTRICT,
     origin TEXT NOT NULL CHECK(origin IN('CODEX','USER_EDIT','REVISION')),
     status TEXT NOT NULL CHECK(status IN('PREPARING','RUNNING','SUCCEEDED','FAILED','INTERRUPTED')),
     input_json TEXT NOT NULL CHECK(json_valid(input_json) AND length(CAST(input_json AS BLOB))<=524288),
     input_hash TEXT NOT NULL CHECK(length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
     payload_json TEXT CHECK(payload_json IS NULL OR (json_valid(payload_json) AND length(CAST(payload_json AS BLOB))<=65536)),
     coverage_json TEXT CHECK(coverage_json IS NULL OR (json_valid(coverage_json) AND length(CAST(coverage_json AS BLOB))<=131072)),
     user_edits_json TEXT NOT NULL CHECK(json_valid(user_edits_json) AND length(CAST(user_edits_json AS BLOB))<=131072),
     prompt_version TEXT NOT NULL,
     tool_version TEXT,
     elapsed_ms REAL,
     created_at TEXT NOT NULL,
     completed_at TEXT,
     error TEXT,
     CHECK(status!='SUCCEEDED' OR (payload_json IS NOT NULL AND coverage_json IS NOT NULL AND completed_at IS NOT NULL)),
     FOREIGN KEY(contract_revision_id,mission_id) REFERENCES mission_contract_revisions(id,mission_id) ON DELETE RESTRICT,
     UNIQUE(id,mission_id,contract_revision_id,input_hash)
    ) STRICT;
    CREATE UNIQUE INDEX planning_pending ON planning_drafts(mission_id,input_hash) WHERE status IN('PREPARING','RUNNING');
    CREATE INDEX planning_mission_created ON planning_drafts(mission_id,created_at DESC);
    CREATE TRIGGER planning_no_replace BEFORE INSERT ON planning_drafts WHEN EXISTS(SELECT 1 FROM planning_drafts WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Planning drafts are immutable'); END;
    CREATE TRIGGER planning_no_terminal_update BEFORE UPDATE ON planning_drafts WHEN OLD.status NOT IN('PREPARING','RUNNING') BEGIN SELECT RAISE(ABORT,'Completed planning drafts are immutable'); END;
    CREATE TRIGGER planning_fixed_binding BEFORE UPDATE ON planning_drafts WHEN NEW.id!=OLD.id OR NEW.mission_id!=OLD.mission_id OR NEW.contract_revision_id!=OLD.contract_revision_id OR NEW.parent_draft_id IS NOT OLD.parent_draft_id OR NEW.origin!=OLD.origin OR NEW.input_json!=OLD.input_json OR NEW.input_hash!=OLD.input_hash OR NEW.user_edits_json!=OLD.user_edits_json OR NEW.prompt_version!=OLD.prompt_version OR NEW.created_at!=OLD.created_at BEGIN SELECT RAISE(ABORT,'Planning input binding is immutable'); END;
    CREATE TRIGGER planning_no_delete BEFORE DELETE ON planning_drafts BEGIN SELECT RAISE(ABORT,'Planning drafts are immutable'); END;
    CREATE TABLE plan_revisions(
     id TEXT PRIMARY KEY NOT NULL,
     pair_id TEXT NOT NULL UNIQUE,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     revision INTEGER NOT NULL CHECK(revision>=1),
     draft_id TEXT NOT NULL UNIQUE,
     contract_revision_id TEXT NOT NULL,
     input_hash TEXT NOT NULL CHECK(length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
     payload_json TEXT NOT NULL CHECK(json_valid(payload_json) AND length(CAST(payload_json AS BLOB))<=65536),
     coverage_json TEXT NOT NULL CHECK(json_valid(coverage_json) AND length(CAST(coverage_json AS BLOB))<=131072),
     user_edits_json TEXT NOT NULL CHECK(json_valid(user_edits_json) AND length(CAST(user_edits_json AS BLOB))<=131072),
     plan_hash TEXT NOT NULL CHECK(length(plan_hash)=64 AND plan_hash NOT GLOB '*[^0-9a-f]*'),
     canonical TEXT NOT NULL CHECK(json_valid(canonical) AND length(CAST(canonical AS BLOB))<=131072),
     accepted_at TEXT NOT NULL,
     FOREIGN KEY(draft_id,mission_id,contract_revision_id,input_hash) REFERENCES planning_drafts(id,mission_id,contract_revision_id,input_hash) ON DELETE RESTRICT,
     UNIQUE(mission_id,revision),
     UNIQUE(pair_id,mission_id,revision,draft_id,contract_revision_id,input_hash)
    ) STRICT;
    CREATE TABLE evaluation_contract_revisions(
     id TEXT PRIMARY KEY NOT NULL,
     pair_id TEXT NOT NULL UNIQUE,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     revision INTEGER NOT NULL CHECK(revision>=1),
     draft_id TEXT NOT NULL UNIQUE,
     contract_revision_id TEXT NOT NULL,
     input_hash TEXT NOT NULL CHECK(length(input_hash)=64 AND input_hash NOT GLOB '*[^0-9a-f]*'),
     payload_json TEXT NOT NULL CHECK(json_valid(payload_json) AND length(CAST(payload_json AS BLOB))<=65536),
     evaluation_hash TEXT NOT NULL CHECK(length(evaluation_hash)=64 AND evaluation_hash NOT GLOB '*[^0-9a-f]*'),
     canonical TEXT NOT NULL CHECK(json_valid(canonical) AND length(CAST(canonical AS BLOB))<=131072),
     accepted_at TEXT NOT NULL,
     FOREIGN KEY(pair_id,mission_id,revision,draft_id,contract_revision_id,input_hash) REFERENCES plan_revisions(pair_id,mission_id,revision,draft_id,contract_revision_id,input_hash) ON DELETE RESTRICT,
     UNIQUE(mission_id,revision)
    ) STRICT;
    CREATE TRIGGER plan_no_replace BEFORE INSERT ON plan_revisions WHEN EXISTS(SELECT 1 FROM plan_revisions WHERE id=NEW.id OR pair_id=NEW.pair_id OR draft_id=NEW.draft_id OR (mission_id=NEW.mission_id AND revision=NEW.revision)) BEGIN SELECT RAISE(ABORT,'Accepted plans are immutable'); END;
    CREATE TRIGGER plan_no_update BEFORE UPDATE ON plan_revisions BEGIN SELECT RAISE(ABORT,'Accepted plans are immutable'); END;
    CREATE TRIGGER plan_no_delete BEFORE DELETE ON plan_revisions BEGIN SELECT RAISE(ABORT,'Accepted plans are immutable'); END;
    CREATE TRIGGER evaluation_no_replace BEFORE INSERT ON evaluation_contract_revisions WHEN EXISTS(SELECT 1 FROM evaluation_contract_revisions WHERE id=NEW.id OR pair_id=NEW.pair_id OR draft_id=NEW.draft_id OR (mission_id=NEW.mission_id AND revision=NEW.revision)) BEGIN SELECT RAISE(ABORT,'Accepted evaluation contracts are immutable'); END;
    CREATE TRIGGER evaluation_no_update BEFORE UPDATE ON evaluation_contract_revisions BEGIN SELECT RAISE(ABORT,'Accepted evaluation contracts are immutable'); END;
    CREATE TRIGGER evaluation_no_delete BEFORE DELETE ON evaluation_contract_revisions BEGIN SELECT RAISE(ABORT,'Accepted evaluation contracts are immutable'); END`);
    connection.prepare('INSERT INTO schema_migrations VALUES(7,?)').run(new Date().toISOString());applied.push(7);
   }
   connection.exec('PRAGMA user_version=7; COMMIT');
  }catch(error){connection.exec('ROLLBACK');throw error;}
  for(const schemaVersion of applied)logger({event:'migration.applied',schemaVersion});
  const version=()=>{const value=connection.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version;if(value!==7)throw failure('UNSUPPORTED_SCHEMA','Database migration metadata is invalid');return value;};
  logger({event:'database.opened',schemaVersion:version()});return {connection,version,close};
 }catch(error){close();throw error;}
}
