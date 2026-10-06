export type Project = Readonly<{
  id: string;
  displayName: string;
  repoRoot: string;
  registeredHead: string;
  registeredBranch: string | null;
  createdAt: string;
}>;
export type ProjectsResponse = {projects: Project[]; allowedRoots: string[]};
export type ProjectErrorCode = 'PATH_NOT_FOUND' | 'OUTSIDE_ALLOWED_ROOT' | 'NOT_GIT_REPOSITORY' |
  'DUPLICATE_PROJECT' | 'INVALID_DISPLAY_NAME' | 'INVALID_PATH' | 'HEAD_UNAVAILABLE' |
  'GIT_VALIDATION_FAILED' | 'PROJECT_STORAGE_FAILED' | 'INVALID_REQUEST' | 'PAYLOAD_TOO_LARGE';
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['id', 'displayName', 'repoRoot', 'createdAt'].every(k => typeof v[k] === 'string' && v[k].length > 0) &&
    typeof v.registeredHead === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(v.registeredHead) &&
    (v.registeredBranch === null || typeof v.registeredBranch === 'string');
}
export function isProjectsResponse(value: unknown): value is ProjectsResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.projects) && v.projects.every(isProject) &&
    Array.isArray(v.allowedRoots) && v.allowedRoots.every(x => typeof x === 'string');
}
