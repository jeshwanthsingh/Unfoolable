import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import type {Project} from '../../packages/shared/projects.ts';
import {validateRepository} from './repository.ts';
import {ProjectError} from './project-errors.ts';
import type {Logger} from './log.ts';
type Row = {id:string; display_name:string; repo_root:string; registered_head:string; registered_branch:string|null; created_at:string};
const project = (row: Row): Project => ({id:row.id, displayName:row.display_name, repoRoot:row.repo_root,
  registeredHead:row.registered_head, registeredBranch:row.registered_branch, createdAt:row.created_at});
export function listProjects(db: DatabaseSync): Project[] {
  return (db.prepare('SELECT * FROM projects ORDER BY created_at DESC, id').all() as Row[]).map(project);
}
export async function registerProject(db: DatabaseSync, input: Record<string, unknown>, roots: readonly string[], logger: Logger): Promise<Project> {
  const name = input.displayName;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(name))
    throw new ProjectError('INVALID_DISPLAY_NAME', 'Use a project name between 1 and 120 characters.', 400);
  const metadata = await validateRepository(input.repoPath, roots, logger);
  const value: Project = {id:randomUUID(), displayName:name.trim(), ...metadata, createdAt:new Date().toISOString()};
  try {
    db.prepare('INSERT INTO projects(id,display_name,repo_root,registered_head,registered_branch,created_at) VALUES(?,?,?,?,?,?)')
      .run(value.id,value.displayName,value.repoRoot,value.registeredHead,value.registeredBranch,value.createdAt);
  } catch (problem) {
    let existing: Row | undefined;
    try {existing = db.prepare('SELECT * FROM projects WHERE repo_root=?').get(value.repoRoot) as Row | undefined;} catch { /* A failed database cannot classify duplicates. */ }
    if (existing) throw new ProjectError('DUPLICATE_PROJECT', `This repository is already registered as ${existing.display_name}.`, 409);
    const code = problem instanceof Error && 'code' in problem && typeof problem.code === 'string' ? problem.code : 'UNKNOWN';
    logger({event:'project.storage_failed',level:'error',code:'PROJECT_STORAGE_FAILED',operation:'insert-project',processCode:code});
    throw new ProjectError('PROJECT_STORAGE_FAILED', 'The project could not be saved. Nothing has been confirmed.', 500);
  }
  return value;
}
