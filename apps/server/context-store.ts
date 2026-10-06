import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {isContextPayload,isContextSnapshot,CONTEXT_LIMITS} from '../../packages/shared/context.ts';
import type {ProjectContextPayload,ProjectContextSnapshot,ContextResponse} from '../../packages/shared/context.ts';
import {getMission} from './missions.ts';
import {ContextError} from './context-errors.ts';
import {observeRepository} from './context-repository.ts';
import {canonicalJson,payloadHash} from './context-observation.ts';
import type {Logger} from './log.ts';
type Row={id:string;mission_id:string;snapshot_payload:string;snapshot_hash:string;created_at:string};
function snapshot(row:Row):ProjectContextSnapshot {
 const value={id:row.id,missionId:row.mission_id,payload:JSON.parse(row.snapshot_payload) as unknown,snapshotHash:row.snapshot_hash,createdAt:row.created_at};
 if(!isContextSnapshot(value)||payloadHash(value.payload)!==value.snapshotHash)throw new ContextError('CONTEXT_STORAGE_FAILED','Stored project context could not be validated.',500);
 return value;
}
export function createContextStore(db:DatabaseSync,roots:readonly string[],logger:Logger,observe:(root:string,roots:readonly string[],logger:Logger)=>Promise<ProjectContextPayload>=observeRepository){
 let capturing=false;
 const storageError=(error:unknown):never=>{if(error instanceof ContextError)throw error;logger({level:'error',event:'context.storage_failed',code:'CONTEXT_STORAGE_FAILED'});throw new ContextError('CONTEXT_STORAGE_FAILED','Project context could not be saved or loaded.',500);};
 const list=(missionId:string):ContextResponse=>{
  getMission(db,missionId,logger);
  try{const count=Number(db.prepare('SELECT count(*) AS n FROM project_context_snapshots WHERE mission_id=?').get(missionId)?.n);const row=db.prepare('SELECT * FROM project_context_snapshots WHERE mission_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(missionId) as Row|undefined;return {count,latest:row?snapshot(row):null};}catch(error){return storageError(error);}
 };
 const capture=async(missionId:string):Promise<ProjectContextSnapshot>=>{
  const mission=getMission(db,missionId,logger);
  if(capturing)throw new ContextError('CONTEXT_CAPTURE_BUSY','Another project context capture is in progress. Try again shortly.',409);
  capturing=true;
  try{
   const project=db.prepare('SELECT repo_root FROM projects WHERE id=?').get(mission.projectId);
   if(!project||typeof project.repo_root!=='string')throw new ContextError('REPOSITORY_UNAVAILABLE','The registered Project is no longer available.',404);
   const observed=await observe(project.repo_root,roots,logger);
   const payload:unknown=JSON.parse(canonicalJson(observed));
   if(!isContextPayload(payload))throw new ContextError('CONTEXT_CAPTURE_FAILED','Observed project context failed validation.',422);
   if(Buffer.byteLength(canonicalJson(payload))>CONTEXT_LIMITS.snapshotBytes)throw new ContextError('CONTEXT_CAPTURE_LIMIT','Project context exceeded the safe storage limit.',422);
   const value:ProjectContextSnapshot={id:randomUUID(),missionId,payload,snapshotHash:payloadHash(payload),createdAt:new Date().toISOString()};
   try{db.prepare('INSERT INTO project_context_snapshots VALUES(?,?,?,?,?)').run(value.id,value.missionId,canonicalJson(value.payload),value.snapshotHash,value.createdAt);}catch(error){return storageError(error);}
   return value;
  }finally{capturing=false;}
 };
 return {list,capture};
}
