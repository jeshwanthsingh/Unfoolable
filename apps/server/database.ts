import {migrateChat,migrateChatRetry} from './chat-migration.ts';
import {migrateTickets} from './ticket-migration.ts';
import {migrateVerifyOnly} from './verify-only-migration.ts';
import {migrateVerifyOnlyV2} from './verify-only-v2-migration.ts';
import {migrateWorkflow} from './workflow-migration.ts';
import {migrateOutcomes} from './outcome-migration.ts';
import {migrateContentIdentity} from './content-identity.ts';
import {migrateDebug} from './debug-migration.ts';
import {migrateVerification} from "./verification-migration.ts";
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {acquireDatabaseLock} from './database-lock.ts';
import type {Logger} from './log.ts';
import {failure} from './errors.ts';

export function openDatabase(dataDir:string,logger:Logger){
 mkdirSync(dataDir,{recursive:true,mode:0o700});
 const release=acquireDatabaseLock(dataDir);
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
   if(current>17)throw failure('UNSUPPORTED_SCHEMA','Database schema is newer than this application supports');
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
   if(current<8){
    connection.exec(`CREATE UNIQUE INDEX plan_build_binding ON plan_revisions(id,mission_id);
    CREATE UNIQUE INDEX evaluation_build_binding ON evaluation_contract_revisions(id,mission_id);
    CREATE TABLE build_attempts(
     id TEXT PRIMARY KEY NOT NULL,mission_id TEXT NOT NULL REFERENCES missions(id),
     plan_revision_id TEXT NOT NULL,evaluation_revision_id TEXT NOT NULL,slice_id TEXT NOT NULL,
     generation INTEGER NOT NULL CHECK(generation>0),status TEXT NOT NULL CHECK(status IN('CREATED','STARTING','RUNNING','FINALIZING','CANDIDATE','FAILED','INTERRUPTED','RECONCILE_REQUIRED')),
     workspace_path TEXT NOT NULL UNIQUE,base_head TEXT NOT NULL,source_root TEXT NOT NULL,source_index_hash TEXT NOT NULL,git_common_dir TEXT NOT NULL,
     input_json TEXT NOT NULL CHECK(json_valid(input_json)),provider_version TEXT NOT NULL,transport_id TEXT NOT NULL UNIQUE,transport_valid INTEGER NOT NULL CHECK(transport_valid IN(0,1)),
     provider_thread_id TEXT,provider_turn_id TEXT,processes_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(processes_json)),cleanup_json TEXT CHECK(cleanup_json IS NULL OR json_valid(cleanup_json)),
     checks_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(checks_json)),summary TEXT CHECK(summary IS NULL OR length(summary)<=6000),logs_truncated INTEGER NOT NULL DEFAULT 0 CHECK(logs_truncated IN(0,1)),
     started_at TEXT NOT NULL,ended_at TEXT,failure_code TEXT,failure_message TEXT,timings_json TEXT NOT NULL CHECK(json_valid(timings_json)),
     FOREIGN KEY(plan_revision_id,mission_id) REFERENCES plan_revisions(id,mission_id),FOREIGN KEY(evaluation_revision_id,mission_id) REFERENCES evaluation_contract_revisions(id,mission_id),UNIQUE(mission_id,generation),UNIQUE(id,mission_id)
    ) STRICT;
    CREATE UNIQUE INDEX build_global_active ON build_attempts((1)) WHERE status IN('CREATED','STARTING','RUNNING','FINALIZING','RECONCILE_REQUIRED');
    CREATE TRIGGER build_no_replace BEFORE INSERT ON build_attempts WHEN EXISTS(SELECT 1 FROM build_attempts WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Build attempts cannot be replaced'); END;
    CREATE TRIGGER build_fixed_binding BEFORE UPDATE ON build_attempts WHEN NEW.id!=OLD.id OR NEW.mission_id!=OLD.mission_id OR NEW.generation!=OLD.generation OR NEW.plan_revision_id!=OLD.plan_revision_id OR NEW.evaluation_revision_id!=OLD.evaluation_revision_id OR NEW.slice_id!=OLD.slice_id OR NEW.input_json!=OLD.input_json OR NEW.base_head!=OLD.base_head OR NEW.workspace_path!=OLD.workspace_path OR NEW.transport_id!=OLD.transport_id OR NEW.source_root!=OLD.source_root OR NEW.source_index_hash!=OLD.source_index_hash OR NEW.git_common_dir!=OLD.git_common_dir OR NEW.provider_version!=OLD.provider_version OR NEW.started_at!=OLD.started_at OR (OLD.provider_thread_id IS NOT NULL AND NEW.provider_thread_id IS NOT OLD.provider_thread_id) OR (OLD.provider_turn_id IS NOT NULL AND NEW.provider_turn_id IS NOT OLD.provider_turn_id) BEGIN SELECT RAISE(ABORT,'Build binding is immutable'); END;
    CREATE TRIGGER build_terminal BEFORE UPDATE ON build_attempts WHEN OLD.status IN('CANDIDATE','FAILED','INTERRUPTED') BEGIN SELECT RAISE(ABORT,'Terminal builds are immutable'); END;
    CREATE TRIGGER build_no_delete BEFORE DELETE ON build_attempts BEGIN SELECT RAISE(ABORT,'Build attempts cannot be deleted'); END;
    CREATE TABLE build_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,attempt_id TEXT NOT NULL REFERENCES build_attempts(id),generation INTEGER NOT NULL,transport_id TEXT NOT NULL,thread_id TEXT,turn_id TEXT,kind TEXT NOT NULL,data_json TEXT NOT NULL CHECK(json_valid(data_json) AND length(CAST(data_json AS BLOB))<=4096),created_at TEXT NOT NULL) STRICT;
    CREATE TRIGGER build_event_update BEFORE UPDATE ON build_events BEGIN SELECT RAISE(ABORT,'Build events are immutable'); END;
    CREATE TRIGGER build_event_delete BEFORE DELETE ON build_events BEGIN SELECT RAISE(ABORT,'Build events are immutable'); END;
    CREATE TABLE build_candidates(id TEXT PRIMARY KEY NOT NULL,attempt_id TEXT NOT NULL UNIQUE REFERENCES build_attempts(id),candidate_json TEXT NOT NULL CHECK(json_valid(candidate_json)),created_at TEXT NOT NULL) STRICT;
    CREATE TRIGGER candidate_no_replace BEFORE INSERT ON build_candidates WHEN EXISTS(SELECT 1 FROM build_candidates WHERE id=NEW.id OR attempt_id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'Candidates are immutable'); END;
    CREATE TRIGGER candidate_no_update BEFORE UPDATE ON build_candidates BEGIN SELECT RAISE(ABORT,'Candidates are immutable'); END;
    CREATE TRIGGER candidate_no_delete BEFORE DELETE ON build_candidates BEGIN SELECT RAISE(ABORT,'Candidates are immutable'); END;`);
    connection.prepare('INSERT INTO schema_migrations VALUES(8,?)').run(new Date().toISOString());applied.push(8);
   }
   if(current<9){
    connection.exec(`CREATE TABLE build_runtime_state(
     attempt_id TEXT PRIMARY KEY NOT NULL REFERENCES build_attempts(id),cancel_requested_at TEXT,
     effect_state TEXT NOT NULL DEFAULT 'NONE_OBSERVED' CHECK(effect_state IN('NONE_OBSERVED','OBSERVED','UNKNOWN')),
     effect_json TEXT CHECK(effect_json IS NULL OR json_valid(effect_json)),reconcile_ms REAL
    ) STRICT;
    CREATE TABLE runtime_permission_requests(
     id TEXT PRIMARY KEY NOT NULL,mission_id TEXT NOT NULL,attempt_id TEXT NOT NULL,generation INTEGER NOT NULL,
     transport_id TEXT NOT NULL,thread_id TEXT NOT NULL,turn_id TEXT NOT NULL,provider_method TEXT NOT NULL CHECK(provider_method='item/permissions/requestApproval'),
     provider_id_json TEXT NOT NULL CHECK(json_valid(provider_id_json)),provider_item_id TEXT NOT NULL,
     payload_canonical TEXT NOT NULL CHECK(json_valid(payload_canonical) AND length(CAST(payload_canonical AS BLOB))<=16384),payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
     path TEXT NOT NULL,requested_scope TEXT NOT NULL CHECK(requested_scope='turn'),reason TEXT NOT NULL CHECK(length(reason)<=1000),
     status TEXT NOT NULL CHECK(status IN('PENDING','ALLOW_DECIDED','DENY_DECIDED','TRANSPORT_WRITTEN','RESOLVED','INVALIDATED','DELIVERY_UNKNOWN')),
     decision TEXT CHECK(decision IN('ALLOW','DENY')),created_at TEXT NOT NULL,resolved_at TEXT,decided_at TEXT,write_attempted_at TEXT,written_at TEXT,provider_resolved_at TEXT,invalidated_at TEXT,
     FOREIGN KEY(attempt_id,mission_id) REFERENCES build_attempts(id,mission_id),
     UNIQUE(mission_id,attempt_id,generation,transport_id,thread_id,provider_method,provider_id_json)
    ) STRICT;
    CREATE TRIGGER permission_insert_binding BEFORE INSERT ON runtime_permission_requests WHEN NOT EXISTS(
     SELECT 1 FROM build_attempts b LEFT JOIN build_runtime_state r ON r.attempt_id=b.id WHERE b.id=NEW.attempt_id AND b.mission_id=NEW.mission_id AND b.generation=NEW.generation AND b.transport_id=NEW.transport_id AND b.provider_thread_id=NEW.thread_id AND b.provider_turn_id=NEW.turn_id AND b.status='RUNNING' AND b.transport_valid=1 AND r.cancel_requested_at IS NULL
    ) OR NEW.status!='PENDING' OR NEW.decision IS NOT NULL BEGIN SELECT RAISE(ABORT,'Permission binding is stale'); END;
    CREATE TRIGGER permission_no_replace BEFORE INSERT ON runtime_permission_requests WHEN EXISTS(SELECT 1 FROM runtime_permission_requests WHERE id=NEW.id OR (mission_id=NEW.mission_id AND attempt_id=NEW.attempt_id AND generation=NEW.generation AND transport_id=NEW.transport_id AND thread_id=NEW.thread_id AND provider_method=NEW.provider_method AND provider_id_json=NEW.provider_id_json)) BEGIN SELECT RAISE(ABORT,'Permissions cannot be replaced'); END;
    CREATE TRIGGER permission_binding_fixed BEFORE UPDATE ON runtime_permission_requests WHEN NEW.id IS NOT OLD.id OR NEW.mission_id IS NOT OLD.mission_id OR NEW.attempt_id IS NOT OLD.attempt_id OR NEW.generation IS NOT OLD.generation OR NEW.transport_id IS NOT OLD.transport_id OR NEW.thread_id IS NOT OLD.thread_id OR NEW.turn_id IS NOT OLD.turn_id OR NEW.provider_method IS NOT OLD.provider_method OR NEW.provider_id_json IS NOT OLD.provider_id_json OR NEW.provider_item_id IS NOT OLD.provider_item_id OR NEW.payload_canonical IS NOT OLD.payload_canonical OR NEW.payload_hash IS NOT OLD.payload_hash OR NEW.path IS NOT OLD.path OR NEW.requested_scope IS NOT OLD.requested_scope OR NEW.reason IS NOT OLD.reason OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'Permission binding is immutable'); END;
    CREATE TRIGGER permission_decision_fixed BEFORE UPDATE ON runtime_permission_requests WHEN (OLD.decision IS NOT NULL AND (NEW.decision IS NOT OLD.decision OR NEW.decided_at IS NOT OLD.decided_at)) OR (OLD.decision IS NULL AND NEW.decision IS NOT NULL AND (OLD.status!='PENDING' OR NEW.decided_at IS NULL OR NEW.status!=CASE NEW.decision WHEN 'ALLOW' THEN 'ALLOW_DECIDED' ELSE 'DENY_DECIDED' END OR NOT EXISTS(SELECT 1 FROM build_attempts b LEFT JOIN build_runtime_state r ON r.attempt_id=b.id WHERE b.id=OLD.attempt_id AND b.generation=OLD.generation AND b.transport_id=OLD.transport_id AND b.provider_thread_id=OLD.thread_id AND b.provider_turn_id=OLD.turn_id AND b.status='RUNNING' AND b.transport_valid=1 AND r.cancel_requested_at IS NULL))) BEGIN SELECT RAISE(ABORT,'Permission decision is immutable or stale'); END;
    CREATE TRIGGER permission_lifecycle BEFORE UPDATE ON runtime_permission_requests WHEN
     (NEW.status IS NOT OLD.status AND NOT (
      (OLD.status='PENDING' AND NEW.status IN('ALLOW_DECIDED','DENY_DECIDED','INVALIDATED')) OR
      (OLD.status IN('ALLOW_DECIDED','DENY_DECIDED') AND NEW.status IN('TRANSPORT_WRITTEN','RESOLVED','INVALIDATED','DELIVERY_UNKNOWN')) OR
      (OLD.status IN('TRANSPORT_WRITTEN','DELIVERY_UNKNOWN') AND NEW.status IN('RESOLVED','INVALIDATED'))
     )) OR (OLD.write_attempted_at IS NOT NULL AND NEW.write_attempted_at IS NOT OLD.write_attempted_at) OR (OLD.written_at IS NOT NULL AND NEW.written_at IS NOT OLD.written_at) OR (OLD.provider_resolved_at IS NOT NULL AND NEW.provider_resolved_at IS NOT OLD.provider_resolved_at) OR (OLD.invalidated_at IS NOT NULL AND NEW.invalidated_at IS NOT OLD.invalidated_at) OR (OLD.resolved_at IS NOT NULL AND NEW.resolved_at IS NOT OLD.resolved_at) OR (NEW.written_at IS NOT NULL AND NEW.write_attempted_at IS NULL) OR (NEW.write_attempted_at IS NOT NULL AND NEW.decision IS NULL) OR (NEW.status='RESOLVED' AND (NEW.provider_resolved_at IS NULL OR NEW.decision IS NULL)) OR (NEW.status='INVALIDATED' AND NEW.invalidated_at IS NULL)
     BEGIN SELECT RAISE(ABORT,'Permission lifecycle is immutable or invalid'); END;
    CREATE TRIGGER permission_terminal BEFORE UPDATE ON runtime_permission_requests WHEN OLD.status='INVALIDATED' OR (OLD.status='RESOLVED' AND (NEW.status IS NOT OLD.status OR NEW.decision IS NOT OLD.decision OR NEW.decided_at IS NOT OLD.decided_at OR NEW.write_attempted_at IS NOT OLD.write_attempted_at OR NEW.provider_resolved_at IS NOT OLD.provider_resolved_at OR NEW.invalidated_at IS NOT OLD.invalidated_at OR NEW.resolved_at IS NOT OLD.resolved_at OR (NEW.written_at IS NOT OLD.written_at AND (OLD.write_attempted_at IS NULL OR OLD.written_at IS NOT NULL OR NEW.written_at IS NULL)))) BEGIN SELECT RAISE(ABORT,'Terminal permission history is immutable'); END;
    CREATE TRIGGER permission_delivery_fields BEFORE UPDATE ON runtime_permission_requests WHEN (NEW.decision IS NULL AND NEW.decided_at IS NOT NULL) OR (NEW.status='ALLOW_DECIDED' AND NEW.decision IS NOT 'ALLOW') OR (NEW.status='DENY_DECIDED' AND NEW.decision IS NOT 'DENY') OR (OLD.write_attempted_at IS NULL AND NEW.write_attempted_at IS NOT NULL AND OLD.status NOT IN('ALLOW_DECIDED','DENY_DECIDED')) OR (OLD.written_at IS NULL AND NEW.written_at IS NOT NULL AND NEW.status NOT IN('TRANSPORT_WRITTEN','RESOLVED')) OR (NEW.provider_resolved_at IS NOT NULL AND NEW.status!='RESOLVED') OR (NEW.status='TRANSPORT_WRITTEN' AND NEW.written_at IS NULL) OR (NEW.status='DELIVERY_UNKNOWN' AND NEW.write_attempted_at IS NULL) BEGIN SELECT RAISE(ABORT,'Permission delivery fields are invalid'); END;
    CREATE TRIGGER permission_no_delete BEFORE DELETE ON runtime_permission_requests BEGIN SELECT RAISE(ABORT,'Permission history is immutable'); END;`);
    connection.exec('INSERT INTO build_runtime_state(attempt_id) SELECT id FROM build_attempts');
    connection.prepare('INSERT INTO schema_migrations VALUES(9,?)').run(new Date().toISOString());applied.push(9);
   }
   if(current<10){migrateVerification(connection);connection.prepare('INSERT INTO schema_migrations VALUES(10,?)').run(new Date().toISOString());applied.push(10);}
   if(current<11){migrateDebug(connection);connection.prepare('INSERT INTO schema_migrations VALUES(11,?)').run(new Date().toISOString());applied.push(11);}
   if(current<12){migrateContentIdentity(connection);migrateWorkflow(connection);migrateOutcomes(connection);connection.prepare('INSERT INTO schema_migrations VALUES(12,?)').run(new Date().toISOString());applied.push(12);}
   if(current<13){migrateVerifyOnly(connection);connection.prepare('INSERT INTO schema_migrations VALUES(13,?)').run(new Date().toISOString());applied.push(13);}
   if(current<14){migrateVerifyOnlyV2(connection);connection.prepare('INSERT INTO schema_migrations VALUES(14,?)').run(new Date().toISOString());applied.push(14);}
   if(current<15){migrateTickets(connection);connection.prepare('INSERT INTO schema_migrations VALUES(15,?)').run(new Date().toISOString());applied.push(15);}
   if(current<16){migrateChat(connection);connection.prepare('INSERT INTO schema_migrations VALUES(16,?)').run(new Date().toISOString());applied.push(16);}
   if(current<17){migrateChatRetry(connection);connection.prepare('INSERT INTO schema_migrations VALUES(17,?)').run(new Date().toISOString());applied.push(17);}
   connection.exec('PRAGMA user_version=17; COMMIT');
  }catch(error){connection.exec('ROLLBACK');throw error;}
  for(const schemaVersion of applied)logger({event:'migration.applied',schemaVersion});
  const version=()=>{const value=connection.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version;if(value!==17)throw failure('UNSUPPORTED_SCHEMA','Database migration metadata is invalid');return value;};
  logger({event:'database.opened',schemaVersion:version()});return {connection,version,close};
 }catch(error){close();throw error;}
}
