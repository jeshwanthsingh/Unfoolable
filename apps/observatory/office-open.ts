// "Open" a helper: bring its terminal forward. Safe by construction: the id must be in the server-only map, nothing runs in a shell,
// every value that reaches a command is checked against a strict pattern first, 1 call per second, every call logged (no paths, no real ids).
import {appendFileSync, readFileSync, writeFileSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';

export type Exec = (file: string, args: string[]) => Promise<string | void>;
export type OpenOpts = {exec?: Exec; mapPath?: string; logPath: string; windowsPath?: string; now?: () => number};
export type OpenResult = {code: number; body: {ok: boolean; how?: 'tmux' | 'resume' | 'focus'; needs?: 'confirm'; error?: string; why?: string}};

const run: Exec = (file, args) => new Promise((ok, bad) => execFile(file, args, {timeout: 5000}, (e, stdout, stderr) => (e ? bad(Object.assign(e, {stderr})) : ok(stdout))));
// Why an open failed, as a class only (never paths or text): a timeout, a macOS "not allowed" (-1743), or the exit number.
const why = (e: unknown): string => {
  const x = e as {killed?: boolean; signal?: string; code?: unknown; stderr?: unknown; message?: unknown} | null;
  if (x?.killed || x?.signal === 'SIGTERM') return 'timeout';
  if (/-1743|not authorized|not allowed/i.test(`${x?.stderr ?? ''} ${x?.message ?? ''}`)) return 'denied';
  return typeof x?.code === 'number' ? `exit ${x.code}` : 'error';
};
const ID = /^h:[0-9a-f]{12}$/, TMUX = /^[\w.-]+:\d+$/, SESSION = /^[\w-]{8,64}$/, CWD = /^\/[\w ./-]{1,200}$/; // CWD has no quote, $, backtick or backslash

export function createOpener(o: OpenOpts) {
  const exec = o.exec ?? run, now = o.now ?? Date.now;
  let last = -Infinity;
  const winPath = o.windowsPath ?? join(dirname(o.logPath), 'office-windows.json'); // window ids only (numbers), one per helper, owner-only
  const windows = (): Record<string, number> => { try { const j = JSON.parse(readFileSync(winPath, 'utf8')) as unknown; return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, number>) : {}; } catch { return {}; } };
  const remember = (id: string, n: number | null): void => { const w = windows(); if (n === null) delete w[id]; else w[id] = n; try { writeFileSync(winPath, JSON.stringify(w), {mode: 0o600}); } catch { /* a missing record only means one more confirm */ } };
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
      const known = windows()[id];
      if (Number.isInteger(known)) { // a window this helper already has: bring it forward, never open a second one
        try { await exec('osascript', ['-e', `tell application "Terminal" to set index of window id ${known} to 1`, '-e', 'tell application "Terminal" to activate']); log(id, 'focus'); return {code: 200, body: {ok: true, how: 'focus'}}; }
        catch (err) {
          const w = why(err);
          if (w === 'timeout' || w === 'denied') { log(id, `failed: ${w}`); return {code: 502, body: {ok: false, error: 'could not open', why: w}}; } // the window is probably still there: keep it, never open a second one
          remember(id, null); // really closed: forget it and fall through to the confirm
        }
      }
      if (!resume) { log(id, 'needs confirm'); return {code: 409, body: {ok: false, needs: 'confirm'}}; }
      const out = await exec('osascript', ['-e', `tell application "Terminal" to do script "cd '${e.cwd}' && claude --resume ${e.session}"`, '-e', 'tell application "Terminal" to activate', '-e', 'tell application "Terminal" to id of front window']);
      const win = /^\d{1,9}$/.exec(String(out ?? '').trim());
      if (win) remember(id, Number(win[0]));
      log(id, 'resume'); return {code: 200, body: {ok: true, how: 'resume'}};
    } catch (err) { const w = why(err); log(id, `failed: ${w}`); return {code: 502, body: {ok: false, error: 'could not open', why: w}}; }
  };
}
