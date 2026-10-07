import type {DatabaseSync} from 'node:sqlite';
import type {CorrectionContext} from '../../packages/shared/debug.ts';
import type {BuildCandidate} from '../../packages/shared/build.ts';
import {canonicalContractJson} from './contract-store.ts';
import {verificationHash} from './verification-recipe.ts';
import type {VerificationView} from '../../packages/shared/verification.ts';
import {validateDebugDiagnosis} from './debug-diagnosis.ts';
import {BuildError} from './build-errors.ts';
export function admitCorrectionContext(db:DatabaseSync,view:VerificationView,missionId:string,sliceId:string,context:CorrectionContext):BuildCandidate{
 const fail=()=>{throw new BuildError('STALE_CORRECTION_INPUT','Correction requires an intact diagnosis and the exact current failed Candidate.');};
 if(context.version!=='mission-debug-correction-v1'||![1,2].includes(context.cycle)||context.failurePacket.missionId!==missionId||context.failurePacket.slice.id!==sliceId||context.diagnosis.classification!=='candidate_defect'||verificationHash(canonicalContractJson(context.failurePacket))!==context.packetHash)return fail();
 if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='debug_sessions'").get()&&!db.prepare("SELECT c.id FROM debug_cycles c JOIN debug_sessions s ON s.id=c.session_id WHERE s.id=? AND s.mission_id=? AND s.status='CORRECTING' AND c.id=? AND c.number=? AND c.result='RUNNING' AND c.input_candidate_id=? AND c.correction_attempt_id IS NULL").get(context.sessionId,missionId,context.cycleId,context.cycle,context.parentCandidateId))return fail();
 validateDebugDiagnosis(context.diagnosis,{id:'admission',sessionId:context.sessionId,cycle:context.cycle,data:context.failurePacket,canonical:canonicalContractJson(context.failurePacket),hash:context.packetHash,createdAt:new Date().toISOString()});
 const run=view.runs[0],binding=context.failurePacket.binding;
 if(!view.current||!run||run.id!==binding.verificationRunId||run.status!=='FAILED'||run.results.some(r=>!['PASS','FAIL'].includes(r.status))||!run.results.some(r=>r.status==='FAIL')||!run.cleanup?.verified||run.cleanup.ambiguous||run.cleanup.remaining.length||run.candidateId!==context.parentCandidateId||run.treeHash!==context.parentTreeHash||run.recipeId!==binding.recipeId||run.recipeHash!==binding.recipeHash||run.evaluationHash!==binding.evaluationHash||run.evaluatorHash!==binding.evaluatorHash)return fail();
 const row=db.prepare('SELECT candidate_json FROM build_candidates WHERE id=?').get(context.parentCandidateId);if(!row)return fail();const candidate=JSON.parse(String(row.candidate_json)) as BuildCandidate;
 if(candidate.treeHash!==binding.treeHash||candidate.id!==binding.candidateId||candidate.diffHash!==binding.diffHash||candidate.baseHead!==binding.baseHead)return fail();return candidate;
}
