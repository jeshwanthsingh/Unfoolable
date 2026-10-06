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
   if(current>3)throw failure('UNSUPPORTED_SCHEMA','Database schema is newer than this application supports');
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
   connection.exec('PRAGMA user_version=3; COMMIT');
  }catch(error){connection.exec('ROLLBACK');throw error;}
  for(const schemaVersion of applied)logger({event:'migration.applied',schemaVersion});
  const version=()=>{const value=connection.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version;if(value!==3)throw failure('UNSUPPORTED_SCHEMA','Database migration metadata is invalid');return value;};
  logger({event:'database.opened',schemaVersion:version()});return {connection,version,close};
 }catch(error){close();throw error;}
}
