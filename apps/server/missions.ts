import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {validMissionIntent,MAX_MISSION_INTENT_LENGTH} from '../../packages/shared/missions.ts';
import type {Mission} from '../../packages/shared/missions.ts';
import {MissionError} from './mission-errors.ts';
import type {Logger} from './log.ts';

type Row = {id:string;project_id:string;original_intent:string;phase:'DRAFT';created_at:string};
const fromRow = (row:Row):Mission => ({id:row.id,projectId:row.project_id,originalIntent:row.original_intent,phase:row.phase,createdAt:row.created_at});
function requireProject(db:DatabaseSync,projectId:string) {
  if (!db.prepare('SELECT id FROM projects WHERE id=?').get(projectId))
    throw new MissionError('PROJECT_NOT_FOUND','That project no longer exists.',404);
}
function storageError(problem:unknown,logger:Logger):never {
  if (problem instanceof MissionError) throw problem;
  logger({level:'error',event:'mission.storage.failed',code:'MISSION_STORAGE_FAILED'});
  throw new MissionError('MISSION_STORAGE_FAILED','Mission data could not be saved or loaded. Try again.',500);
}
export function createMission(db:DatabaseSync,projectId:string,body:Record<string,unknown>,logger:Logger):Mission {
  if (!validMissionIntent(body.originalIntent))
    throw new MissionError('INVALID_MISSION_INTENT',`Describe what you want to work on before creating a mission (up to ${MAX_MISSION_INTENT_LENGTH.toLocaleString('en-US')} characters).`,400);
  try {
    requireProject(db,projectId);
    // Validation observes whitespace; persistence retains the exact submitted string.
    const mission:Mission={id:randomUUID(),projectId,originalIntent:body.originalIntent,phase:'DRAFT',createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO missions(id,project_id,original_intent,phase,created_at) VALUES(?,?,?,?,?)')
      .run(mission.id,mission.projectId,mission.originalIntent,mission.phase,mission.createdAt);
    return mission;
  } catch (problem) {return storageError(problem,logger);}
}
export function listMissions(db:DatabaseSync,projectId:string,logger:Logger):Mission[] {
  try {
    requireProject(db,projectId);
    return (db.prepare('SELECT * FROM missions WHERE project_id=? ORDER BY created_at DESC,id ASC').all(projectId) as Row[]).map(fromRow);
  } catch (problem) {return storageError(problem,logger);}
}
export function getMission(db:DatabaseSync,id:string,logger:Logger):Mission {
  try {
    const row=db.prepare('SELECT * FROM missions WHERE id=?').get(id) as Row|undefined;
    if (!row) throw new MissionError('MISSION_NOT_FOUND','That mission could not be found.',404);
    return fromRow(row);
  } catch (problem) {return storageError(problem,logger);}
}
