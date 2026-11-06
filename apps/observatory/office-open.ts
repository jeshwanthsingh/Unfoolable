// "Open" a helper: bring its terminal forward. Safe by construction: the id must be in the server-only map, nothing runs in a shell,
// every value that reaches a command is checked against a strict pattern first, 1 call per second, every call logged (no paths, no real ids).
import {appendFileSync, readFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';

export type Exec = (file: string, args: string[]) => Promise<void>;
export type OpenOpts = {exec?: Exec; mapPath?: string; logPath: string; now?: () => number};
export type OpenResult = {code: number; body: {ok: boolean; how?: 'tmux' | 'resume'; needs?: 'confirm'; error?: string}};

const run: Exec = (file, args) => new Promise((ok, bad) => execFile(file, args, {timeout: 5000}, (e) => (e ? bad(e) : ok())));
const ID = /^h:[0-9a-f]{12}$/, TMUX = /^[\w.-]+:\d+$/, SESSION = /^[\w-]{8,64}$/, CWD = /^\/[\w ./-]{1,200}$/; // CWD has no quote, $, backtick or backslash

export function createOpener(o: OpenOpts) {
  const exec = o.exec ?? run, now = o.now ?? Date.now;
  let last = -Infinity;
  const log = (id: string, result: string): void => { try { appendFileSync(o.logPath, JSON.stringify({ts: new Date(now()).toISOString(), id, result}) + '\n', {mode: 0o600}); } catch { /* the log is best effort */ } };
  return async (id: unknown, resume: boolean): Promise<OpenResult> => {
    const t = now();
    if (t - last < 1000) return {code: 429, body: {ok: false, error: 'too fast'}};
    last = t;
    if (typeof id !== 'string' || !ID.test(id)) { log('bad', 'refused: bad id'); return {code: 400, body: {ok: false, error: 'bad id'}}; }
    let e: {session?: unknown; cwd?: unknown; tmux?: unknown} | undefined;
    try { e = (JSON.parse(readFileSync(o.mapPath ?? join(homedir(), '.claude/state/office-map.json'), 'utf8')) as Record<string, typeof e>)[id]; } catch { e = undefined; }
    if (!e) { log(id, 'refused: not in the map'); return {code: 404, body: {ok: false, error: 'unknown helper'}}; }
    try {
      if (typeof e.tmux === 'string' && TMUX.test(e.tmux)) {
        await exec('tmux', ['select-window', '-t', e.tmux]);
        await exec('osascript', ['-e', 'tell application "Terminal" to activate']);
        log(id, 'tmux'); return {code: 200, body: {ok: true, how: 'tmux'}};
      }
      if (typeof e.session !== 'string' || !SESSION.test(e.session) || typeof e.cwd !== 'string' || !CWD.test(e.cwd) || e.cwd.includes('..')) { log(id, 'refused: odd map entry'); return {code: 422, body: {ok: false, error: 'cannot open this one'}}; }
      if (!resume) { log(id, 'needs confirm'); return {code: 409, body: {ok: false, needs: 'confirm'}}; }
      await exec('osascript', ['-e', `tell application "Terminal" to do script "cd '${e.cwd}' && claude --resume ${e.session}"`, '-e', 'tell application "Terminal" to activate']);
      log(id, 'resume'); return {code: 200, body: {ok: true, how: 'resume'}};
    } catch { log(id, 'failed'); return {code: 502, body: {ok: false, error: 'could not open'}}; }
  };
}
