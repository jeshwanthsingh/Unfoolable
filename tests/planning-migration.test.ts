import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../apps/server/database.ts';
test('migration 7 adds only three planning tables and preserves contract table layout',()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-planning-migrate-')),database=openDatabase(root,()=>{});
 try{assert.equal(database.version(),8);assert.equal(database.connection.prepare('PRAGMA user_version').get()!.user_version,8);
 const tables=database.connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN('planning_drafts','plan_revisions','evaluation_contract_revisions') ORDER BY name").all();assert.equal(tables.length,3);
 assert.equal(database.connection.prepare('PRAGMA table_info(mission_contract_revisions)').all().length,10);
 }finally{database.close();rmSync(root,{recursive:true,force:true});}
});

import {DatabaseSync} from 'node:sqlite';
import {createContractStore} from '../apps/server/contract-store.ts';
import {payloadHash} from '../apps/server/context-observation.ts';
import {PACKET_LIMITS} from '../packages/shared/analysis.ts';
// Frozen DDL extracted verbatim from Breakout 5 commit 686f96d04f404bd103c5fb9a506c80689e37c65c.
// Construct schema 6 directly so this test cannot silently migrate a schema 7 fixture backwards.
const BREAKOUT5_SCHEMA=String.raw`CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT;
CREATE TABLE projects(
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 120),
      repo_root TEXT NOT NULL UNIQUE CHECK(length(repo_root)>0),
      registered_head TEXT NOT NULL CHECK(length(registered_head) IN(40,64) AND registered_head NOT GLOB '*[^0-9a-f]*'),
      registered_branch TEXT,
      created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT;
CREATE TABLE missions(
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      original_intent TEXT NOT NULL CHECK(length(CAST(original_intent AS BLOB))>0),
      phase TEXT NOT NULL CHECK(phase='DRAFT'),
      created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT;
    CREATE INDEX missions_project_created ON missions(project_id,created_at DESC,id ASC);
CREATE TABLE project_context_snapshots(
     id TEXT PRIMARY KEY NOT NULL,
     mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE RESTRICT,
     snapshot_payload TEXT NOT NULL CHECK(json_valid(snapshot_payload) AND length(CAST(snapshot_payload AS BLOB))<=2097152),
     snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash)=64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'),
     created_at TEXT NOT NULL CHECK(length(created_at)>0)
    ) STRICT;
    CREATE INDEX context_mission_created ON project_context_snapshots(mission_id,created_at DESC);
    CREATE TRIGGER context_no_replace BEFORE INSERT ON project_context_snapshots WHEN EXISTS(SELECT 1 FROM project_context_snapshots WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END;
    CREATE TRIGGER context_no_update BEFORE UPDATE ON project_context_snapshots BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END;
    CREATE TRIGGER context_no_delete BEFORE DELETE ON project_context_snapshots BEGIN SELECT RAISE(ABORT,'Context snapshots are immutable'); END;
CREATE UNIQUE INDEX context_mission_identity ON project_context_snapshots(id,mission_id);
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
    ) STRICT;
CREATE TABLE contract_drafts(
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
    CREATE TRIGGER revision_no_delete BEFORE DELETE ON mission_contract_revisions BEGIN SELECT RAISE(ABORT,'Accepted contract revisions are immutable'); END;`;
test('exact Breakout 5 schema migration preserves all nine tables byte-for-byte and prior contract Needs You derivation',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cc-exact-b5-')),db=new DatabaseSync(join(root,'command-center.sqlite'));let upgraded:ReturnType<typeof openDatabase>|undefined;
 try{
 db.exec('PRAGMA foreign_keys=ON');db.exec(BREAKOUT5_SCHEMA);db.exec('PRAGMA user_version=6');for(let i=1;i<=6;i++)db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(i,'2026-01-01');
 db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('project','Project','/fixture','a'.repeat(40),null,'2026-01-01');
 db.prepare('INSERT INTO missions VALUES(?,?,?,?,?)').run('mission','project','Preserve retry behavior.','DRAFT','2026-01-02');
 db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run('snapshot','mission','{}','b'.repeat(64),'2026-01-03');
 const packet={version:'analysis-packet-v1',missionId:'mission',snapshotId:'snapshot',originalIntent:'Preserve retry behavior.',project:{baseHead:'a'.repeat(40),branch:'main',dirty:false,structure:[]},evidence:[],limits:PACKET_LIMITS,evidenceTruncated:false,sourcePolicy:'committed-head-only'};
 db.prepare("INSERT INTO mission_analyses(id,mission_id,context_snapshot_id,base_head,status,packet_json,packet_hash,prompt_version,tool_version,result_json,created_at,completed_at) VALUES('analysis','mission','snapshot',?,'SUCCEEDED',?,?,'v1','fake',?,'2026-01-04','2026-01-05')").run('a'.repeat(40),JSON.stringify(packet),payloadHash(packet),JSON.stringify({understanding:{relevantAreas:[],currentBehavior:[],constraints:[],uncertainties:[]},questions:[]}));
 db.prepare("INSERT INTO clarification_questions VALUES('question','analysis','What happens after denial?','Determine behavior','behavior','[]','[]',1,0,'2026-01-05')").run();db.prepare("INSERT INTO clarification_answers VALUES('question','Stop retrying after denial.','2026-01-06')").run();
 const payload={goal:{id:'G1',text:'Preserve retry behavior.',sourceIds:['intent']},requirements:[{id:'R1',text:'Stop retrying after denial.',sourceIds:['answer:question']}],scope:[{id:'S1',text:'Retry behavior.',sourceIds:['intent']}],nonGoals:[],constraints:[],assumptions:[],risks:[]};
 const store=createContractStore(db,()=>{},async()=>({output:payload,toolVersion:'fake',elapsedMs:1}));const accepted=store.accept((await store.compile('mission')).draft!.id).accepted!;store.revise('mission',accepted.id);const attention=store.attention(),view=store.view('mission');
 const names=['schema_migrations','projects','missions','project_context_snapshots','mission_analyses','clarification_questions','clarification_answers','contract_drafts','mission_contract_revisions'];
 const before=names.map(name=>({name,rows:db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()}));assert.equal(before.length,9);assert.ok(before.every(t=>t.rows.length>0));store.close();db.close();
 upgraded=openDatabase(root,()=>{});assert.equal(upgraded.version(),8);for(const t of before){const rows:Record<string,unknown>[]=upgraded.connection.prepare('SELECT * FROM '+t.name+' ORDER BY rowid').all();assert.deepEqual(t.name==='schema_migrations'?rows.slice(0,6):rows,t.rows,t.name);}
 const after=createContractStore(upgraded.connection,()=>{},async()=>{throw Error('no AI after migration');});assert.deepEqual(after.view('mission'),view);assert.deepEqual(after.attention(),attention);assert.equal(attention.length,1);after.close();
 assert.equal(upgraded.connection.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get()!.n,16);
 }finally{if(db.isOpen)db.close();upgraded?.close();rmSync(root,{recursive:true,force:true});}
});
