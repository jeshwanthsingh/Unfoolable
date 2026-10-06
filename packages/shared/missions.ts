export const MAX_MISSION_INTENT_LENGTH = 8000;
export type Mission = Readonly<{
  id: string;
  projectId: string;
  originalIntent: string;
  phase: 'DRAFT' | 'NEEDS_CLARIFICATION' | 'CLARIFIED' | 'CONTRACT_REVIEW' | 'CONTRACT_READY' | 'PLAN_REVIEW' | 'PLAN_READY' | 'BUILDING' | 'CANDIDATE_READY';
  createdAt: string;
}>;
export type MissionsResponse = {missions: Mission[]};
export type MissionErrorCode = 'PROJECT_NOT_FOUND' | 'MISSION_NOT_FOUND' | 'INVALID_MISSION_INTENT' | 'MISSION_STORAGE_FAILED';
export function validMissionIntent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_MISSION_INTENT_LENGTH && !/[\uD800-\uDFFF]/u.test(value);
}
export function isMission(value: unknown): value is Mission {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['id', 'projectId', 'createdAt'].every(key => typeof v[key] === 'string' && v[key].length > 0) &&
    validMissionIntent(v.originalIntent) && ['DRAFT','NEEDS_CLARIFICATION','CLARIFIED','CONTRACT_REVIEW','CONTRACT_READY','PLAN_REVIEW','PLAN_READY','BUILDING','CANDIDATE_READY'].includes(v.phase as string) && typeof v.createdAt === 'string' && Number.isFinite(Date.parse(v.createdAt));
}
export function isMissionsResponse(value: unknown): value is MissionsResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.missions) && v.missions.every(isMission);
}
