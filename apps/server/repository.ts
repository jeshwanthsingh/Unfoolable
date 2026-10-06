import {realpathSync, statSync} from 'node:fs';
import {resolve, relative, isAbsolute, sep, join} from 'node:path';
import {homedir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {Logger} from './log.ts';
import {ProjectError} from './project-errors.ts';
const execute = promisify(execFile);
export function absoluteRepoPath(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value))
    throw new ProjectError('INVALID_PATH', 'Enter an absolute repository path or a path starting with ~/.', 400);
  const input = value.trim();
  const expanded = input === '~' ? homedir() : input.startsWith('~/') ? join(homedir(), input.slice(2)) : input;
  if (!isAbsolute(expanded)) throw new ProjectError('INVALID_PATH', 'Use an absolute repository path or a path starting with ~/.', 400);
  return resolve(expanded);
}
function within(path: string, roots: readonly string[]): boolean {
  return roots.some(root => {const part = relative(root, path); return part === '' || (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part));});
}
const outside = () => new ProjectError('OUTSIDE_ALLOWED_ROOT', 'That folder is outside the allowed project locations.', 403);
type GitFailure = Error & {code?: string | number; signal?: string | null; stderr?: string};
export async function gitBytes(cwd: string, args: string[], maxBuffer=16384, config:readonly string[]=[]): Promise<Buffer> {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: homedir(), LANG: 'C', LC_ALL: 'C',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0'
  };
  const result = await execute('git', ['--no-pager', '--no-optional-locks', '--no-lazy-fetch', '--no-replace-objects',
    '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', '-c', 'protocol.allow=never',
    ...config.flatMap(value=>['-c',value]), '-C', cwd, ...args], {env, timeout: 4000, maxBuffer, encoding: 'buffer'});
  return result.stdout;
}
async function gitRead(cwd:string,args:string[]):Promise<string>{
 return (await gitBytes(cwd,args)).toString('utf8').trim();
}
function unexpected(error: unknown, operation: string, logger: Logger): never {
  const e = error as GitFailure;
  // Diagnostics deliberately exclude raw command output, config values and paths.
  logger({event: 'project.git_failed', level: 'error', code: 'GIT_VALIDATION_FAILED', operation,
    processCode: typeof e.code === 'number' || typeof e.code === 'string' ? e.code : 'UNKNOWN', signal: e.signal ?? null});
  throw new ProjectError('GIT_VALIDATION_FAILED', 'Git metadata could not be validated. Check the coordinator logs.', 500);
}
export async function validateRepository(input: unknown, configuredRoots: readonly string[], logger: Logger) {
  const requested = absoluteRepoPath(input);
  const roots = configuredRoots.map(root => realpathSync(root));
  const lexicalScope = within(requested, [...configuredRoots, ...roots]);
  let canonical: string;
  try {
    canonical = realpathSync(requested);
  } catch (error) {
    if (!lexicalScope) throw outside();
    if (error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR'))
      throw new ProjectError('PATH_NOT_FOUND', 'That folder does not exist.', 404);
    throw new ProjectError('INVALID_PATH', 'That folder cannot be accessed.', 400);
  }
  if (!within(canonical, roots)) throw outside();
  if (!statSync(canonical).isDirectory()) throw new ProjectError('INVALID_PATH', 'Choose a repository folder, not a file.', 400);
  let root: string;
  try {root = realpathSync(await gitRead(canonical, ['rev-parse', '--show-toplevel']));}
  catch (error) {
    const e = error as GitFailure;
    if (e.code === 128 && /not a git repository|must be run in a work tree/i.test(e.stderr ?? ''))
      throw new ProjectError('NOT_GIT_REPOSITORY', 'That folder is not a Git working repository.', 422);
    unexpected(error, 'repository-root', logger);
  }
  if (!within(root, roots)) throw outside();
  let head: string;
  try {head = await gitRead(root, ['rev-parse', '--verify', 'HEAD^{commit}']);}
  catch (error) {
    if ((error as GitFailure).code === 128) throw new ProjectError('HEAD_UNAVAILABLE', 'This repository has no committed HEAD to record.', 422);
    unexpected(error, 'head', logger);
  }
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head)) unexpected(new Error('Invalid HEAD'), 'head-format', logger);
  let branch: string | null;
  try {
    const ref = await gitRead(root, ['symbolic-ref', '--quiet', 'HEAD']);
    if (!ref.startsWith('refs/heads/')) unexpected(new Error('Invalid branch reference'), 'branch-format', logger);
    branch = ref.slice('refs/heads/'.length);
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    if ((error as GitFailure).code === 1) branch = null; else unexpected(error, 'branch', logger);
  }
  // Refuse a changed symlink topology rather than saving metadata for another root.
  if (realpathSync(root) !== root || realpathSync(requested) !== canonical) throw new ProjectError('INVALID_PATH', 'The repository path changed during validation. Try again.', 409);
  return {repoRoot: root, registeredHead: head, registeredBranch: branch};
}
