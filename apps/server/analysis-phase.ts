import {planningPhase} from './planning-phase.ts';
import {contractPhase} from './contract-phase.ts';
import type {DatabaseSync} from 'node:sqlite';
import type {MissionPhase} from '../../packages/shared/analysis.ts';

// Phase follows the latest completed analysis; failed attempts never replace it.
export function missionAnalysisPhase(db:DatabaseSync,missionId:string):MissionPhase {
 const analysis=db.prepare("SELECT id FROM mission_analyses WHERE mission_id=? AND status='SUCCEEDED' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(missionId);
 if(!analysis)return planningPhase(db,missionId,contractPhase(db,missionId,'DRAFT'));
 const unanswered=db.prepare('SELECT count(*) AS n FROM clarification_questions q LEFT JOIN clarification_answers a ON a.question_id=q.id WHERE q.analysis_id=? AND a.question_id IS NULL').get(analysis.id!);
 return planningPhase(db,missionId,contractPhase(db,missionId,Number(unanswered?.n)>0?'NEEDS_CLARIFICATION':'CLARIFIED'));
}
