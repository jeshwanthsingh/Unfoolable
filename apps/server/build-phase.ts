import type {DatabaseSync} from 'node:sqlite';
import type {BuildPhase} from '../../packages/shared/build.ts';
import type {PlanningPhase} from '../../packages/shared/planning.ts';
import {currentPlanningInputHash,COMPLETE_PLANNING_PAIR} from './planning-phase.ts';
export function isCurrentBuildAttempt(db:DatabaseSync,missionId:string,row:Record<string,unknown>):boolean {
 const pair=db.prepare('SELECT p.id,p.input_hash,e.id AS evaluation_id '+COMPLETE_PLANNING_PAIR+' WHERE p.mission_id=? ORDER BY p.revision DESC LIMIT 1').get(missionId);
 return !!pair&&pair.id===row.plan_revision_id&&pair.evaluation_id===row.evaluation_revision_id&&pair.input_hash===currentPlanningInputHash(db,missionId)&&Number(db.prepare('SELECT MAX(generation) AS generation FROM build_attempts WHERE mission_id=?').get(missionId)?.generation)===row.generation;
}
export function buildPhase(db:DatabaseSync,missionId:string,base:PlanningPhase):BuildPhase {
 if(base!=='PLAN_READY')return base;
 const row=db.prepare('SELECT * FROM build_attempts WHERE mission_id=? ORDER BY generation DESC LIMIT 1').get(missionId);
 if(!row||!isCurrentBuildAttempt(db,missionId,row))return base;
 if(['CREATED','STARTING','RUNNING','FINALIZING'].includes(String(row.status)))return 'BUILDING';
 if(row.status==='CANDIDATE'&&db.prepare('SELECT id FROM build_candidates WHERE attempt_id=?').get(row.id!))return 'CANDIDATE_READY';
 return base;
}
