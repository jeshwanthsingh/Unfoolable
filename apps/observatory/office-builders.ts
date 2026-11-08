import {execFile, execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
// The office starts a builder: ONE `claude` child per approved card (made by the /dispatch script), asks come back as Needs-you items.
// Everything outside this file is injected (the dispatch call, the child, the dialog, the store), so tests use fakes. No shell strings.
export type Child = {write: (line: string) => void; kill: (sig: 'SIGINT' | 'SIGTERM') => void; onLine: (cb: (line: string) => void) => void; onExit: (cb: (code: number | null) => void) => void};
export type Dispatched = {ok: true; worktree: string; prompt: string; id: string; settings?: string} | {ok: false; why: string};
export type Deps = {
  dispatch: (repo: string, name: string) => Promise<Dispatched>;
  existing: (repo: string, name: string) => {worktree: string; dirty: boolean} | null;
  spawn: (args: string[], cwd: string) => Child;
  dialog: (text: string) => Promise<boolean>; // the native "allow this?" box on the Mac
  store: {load: () => Rec[]; save: (r: Rec[]) => void};
  now: () => number;
};
export type AskPub = {id: string; tool: string; summary: string; state: 'open' | 'deciding' | 'answered' | 'withdrawn'; createdAt: number; expiresAt: number; box: boolean}; // box: a Yes needs the native Mac box
export type Rec = {id: string; repo: string; name: string; worktree: string; sessionId: string; version: string; status: 'running' | 'stopped' | 'ended' | 'lost' | 'needs-human'; turnDone: boolean; unread: boolean; asks: AskPub[]};
export type Reply = {code: number; body: Record<string, unknown>};

const BANNED = ['--dangerously-skip-permissions', '--allow-dangerously-skip-permissions', 'bypassPermissions', '--bare'];
const READ_ONLY = new Set(['Read', 'Grep', 'Glob', 'LS']); // these may be answered from the page alone; everything else needs the native dialog
// A FIXED read-only Bash list may also be answered from the page (the human still presses Yes; only the Mac box is skipped). It is a strict ALLOW-list per program, not a shell parser and not a ban-list:
// one simple command, a tiny character set, a handful of programs, only the short flags listed here (no long options at all except for git, which has a ban-list), only relative paths, nothing that looks like a secret.
// Anything else (python3 -c, sed -i, find, pipes, unknown flags...) keeps the Mac box. Known limits: a committed symlink or tracked secret can still be read, as the Read tool can already.
const RO_CHARS = /^[\w ./=,:@%+-]+$/, RO_OPT = /^-{1,2}[A-Za-z0-9][\w=,.:%+-]*$/;
const RO_SECRET = /\.env|(^|[/:=_-])env($|[/.:_-])|\.pem|key|\.jks|\.p12|\.pfx|\.tfstate|\.tfvars|secret|token|passw|credential|\.ssh|\.gnupg|\.claude|\.git\/config|\.gitconfig|\.docker|\.kube|\.aws|\.npmrc|\.pypirc|\.pgpass|\.htpasswd|\.netrc|vault|id_(rsa|dsa|ecdsa|ed25519)|keystore/i;
// File operands are an ALLOW-list of known safe file TYPES (a name deny-list can never be complete); a name with no such type (a directory, .env, .boto, database.yml, ...) keeps the Mac box.
// A safe type is not a safe CONTENT: private.txt, session.log or notes.md can still hold a token, exactly as the Read tool can already show them.
const RO_EXT = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'md', 'mdx', 'css', 'html', 'htm', 'svg', 'sh', 'rs', 'go', 'java', 'c', 'h', 'cpp', 'hpp', 'txt', 'log', 'csv']);
const RO_NAMES = new Set(['readme', 'license', 'makefile', 'package.json', 'tsconfig.json', 'package-lock.json']);
const fileOk = (a: string): boolean => { const base = (a.split('/').pop() ?? '').toLowerCase(), dot = base.lastIndexOf('.'); return RO_NAMES.has(base) || (dot > 0 && RO_EXT.has(base.slice(dot + 1))); };
const RO_GIT = new Set(['status', 'log', 'diff', 'show', 'rev-parse', 'ls-files']);
const RO_GIT_BAD = /^(--(output|ext-diff|textconv|no-index|exec-path|git-dir|work-tree|open-files-in-pager|help|stdin|show-signature|paginate|pager)|-h$)|%G/;
// per program: flags = single letters that may sit in one cluster; value = letters whose NEXT token is their value (they must end the cluster); digits = "-20" style count allowed
const RO_SPEC: Record<string, {flags: string; value: string; digits?: boolean}> = {
  cat: {flags: 'nbsE', value: ''}, ls: {flags: 'lahRtrSdFGp1', value: ''}, head: {flags: 'qv', value: 'nc', digits: true}, tail: {flags: 'qv', value: 'nc', digits: true}, wc: {flags: 'lwcm', value: ''}
};
export function readOnlyCommand(cmd: unknown): boolean {
  if (typeof cmd !== 'string' || cmd.length === 0 || cmd.length > 300 || !RO_CHARS.test(cmd)) return false;
  const t = cmd.split(' '); if (t.some((x) => x === '')) return false;
  const prog = t[0]!, rest = t.slice(1);
  const badPath = (a: string): boolean => RO_SECRET.test(a) || a.includes('..') || a.includes('=/') || a.startsWith('/') || a.startsWith('+'); // '+1' means "from line 1" to tail, and then it reads stdin
  if (prog === 'pwd') return rest.length === 0;
  if (prog === 'git') {
    if (rest[0] === 'branch') return rest.length === 2 && rest[1] === '--list';
    if (!RO_GIT.has(rest[0] ?? '')) return false;
    const plainTokens = rest.slice(1).filter((x) => !x.startsWith('-'));
    if (plainTokens.some((x) => x.includes(':')) && !(rest[0] === 'show' && plainTokens.length === 1)) return false; // a blob:path diffed against any worktree file would print an untracked file
    return rest.slice(1).every((a) => {
      if (a.startsWith('-')) return RO_OPT.test(a) && !RO_GIT_BAD.test(a) && !badPath(a);
      const path = a.includes(':') ? a.slice(a.lastIndexOf(':') + 1) : a; // HEAD:file names a file in a commit
      return !badPath(a) && (!(a.includes(':') || path.includes('.')) || fileOk(path));
    });
  }
  const spec = RO_SPEC[prog]; if (!spec) return false;
  let plain = 0;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (!a.startsWith('-')) { if (badPath(a) || (prog !== 'ls' && !fileOk(a))) return false; plain++; continue; }
    if (plain > 0) return false; // flags only BEFORE the files: BSD head/tail stop reading options at the first file and would treat a later "-n x" as more files
    if (spec.digits && /^-\d{1,4}$/.test(a)) continue;
    if (!/^-[A-Za-z]+$/.test(a)) return false;
    for (let k = 1; k < a.length; k++) {
      const c = a[k]!;
      if (spec.flags.includes(c)) continue;
      if (spec.value.includes(c) && k === a.length - 1) { const v = rest[++i]; if (v === undefined || !/^\d{1,6}$/.test(v)) return false; continue; } // a value flag takes a plain number, never a name
      return false;
    }
  }
  return prog === 'ls' ? true : plain >= 1;
}

const REPO = /^[A-Za-z0-9][\w.-]{0,59}$/, NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const clean = (s: unknown, n = 120): string => String(s ?? '').replace(/[\u0000-\u001f\u007f"\\\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, n); // also hidden formatting characters (bidi, zero-width)
const MAX_OPEN = 20, MAX_KEPT = 50, STATUSES = ['running', 'stopped', 'ended', 'lost', 'needs-human'];
// What the dialog shows: the real command, path or url; for any other tool the input itself as JSON. If it does not fit, the answer is no (never shown cut off and then allowed in full).
const SHOWN = 200;
const realInput = (i: unknown): string => { const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>; const k = ['command', 'file_path', 'path', 'url', 'pattern'].find((x) => typeof o[x] === 'string'); try { return k ? String(o[k]) : JSON.stringify(i ?? {}); } catch { return ''; } };
// A saved record is trusted only as far as it parses: odd ones are dropped, an unknown status can never read as done.
const coerce = (r: unknown): Rec | null => {
  const x = r as Partial<Rec> | null; if (!x || typeof x !== 'object' || [x.id, x.repo, x.name, x.worktree].some((v) => typeof v !== 'string')) return null;
  const asks = (Array.isArray(x.asks) ? x.asks : []).filter((a): a is AskPub => !!a && typeof a === 'object' && typeof (a as AskPub).id === 'string').map((a) => ({id: a.id, tool: clean(a.tool, 40), summary: clean(a.summary), state: a.state === 'answered' ? 'answered' as const : 'withdrawn' as const, createdAt: Number(a.createdAt) || 0, expiresAt: Number(a.expiresAt) || 0, box: true}));
  return {id: x.id!, repo: x.repo!, name: x.name!, worktree: x.worktree!, sessionId: typeof x.sessionId === 'string' ? clean(x.sessionId, 64) : '', version: typeof x.version === 'string' ? clean(x.version, 20) : '', status: x.status === 'running' || !STATUSES.includes(String(x.status)) ? 'lost' : x.status!, turnDone: x.turnDone === true, unread: x.unread === true, asks};
};

export function createBuilders(deps: Deps, o: {maxRunning?: number; expiryMs?: number; stopGraceMs?: number; dialogMs?: number} = {}) {
  const dialogMs = o.dialogMs ?? 130_000; // the Mac box gives up at 120 s by itself
  const maxRunning = o.maxRunning ?? 3, expiryMs = o.expiryMs ?? 15 * 60_000, grace = o.stopGraceMs ?? 5000;
  type Live = {rec: Rec; child?: Child; inputs: Map<string, {requestId: string; input: unknown}>; stopping: boolean; n: number};
  const all = new Map<string, Live>();
  const save = (): void => { try { deps.store.save([...all.values()].map((l) => l.rec)); } catch { /* a full disk must not stop a running builder */ } };
  let loaded: unknown = []; try { loaded = deps.store.load(); } catch { /* a missing or broken store starts empty */ }
  for (const raw of Array.isArray(loaded) ? loaded : []) { // a restart ends every child: what was running is "lost, resume by hand", every ask is withdrawn
    const r = coerce(raw); if (r) all.set(r.id, {rec: r, inputs: new Map(), stopping: false, n: Math.max(0, ...r.asks.map((a) => Number(a.id.match(/^a(\d+)$/)?.[1]) || 0))});
  }
  save();
  const send = (l: Live, o2: object): void => { try { l.child?.write(JSON.stringify(o2)); } catch { /* the child is gone: nothing to tell */ } };
  let reserved = 0; // starts that are still being dispatched count against the cap too
  const respond = (l: Live, requestId: string, response: object): void => send(l, {type: 'control_response', response: {subtype: 'success', request_id: requestId, response}});
  const withdraw = (l: Live, a: AskPub, why: string): void => { a.state = 'withdrawn'; const i = l.inputs.get(a.id); if (i) respond(l, i.requestId, {behavior: 'deny', message: why}); l.inputs.delete(a.id); };
  const sweep = (): void => { let ch = false; for (const l of all.values()) for (const a of l.rec.asks) if (a.state === 'open' && deps.now() >= a.expiresAt) { withdraw(l, a, 'withdrawn: the ask went stale'); ch = true; } if (ch) save(); };
  const running = (): number => [...all.values()].filter((l) => l.rec.status === 'running').length + reserved;
  const prune = (l: Live): void => { while (l.rec.asks.length > MAX_KEPT) { const i = l.rec.asks.findIndex((a) => a.state !== 'open' && a.state !== 'deciding'); if (i < 0) break; l.rec.asks.splice(i, 1); } };

  const onLine = (l: Live, line: string): void => {
    let m: any; try { m = JSON.parse(line); } catch { return; }
    if (m?.type === 'system' && m.subtype === 'init') { l.rec.sessionId = clean(m.session_id, 64); l.rec.version = clean(m.claude_code_version, 20); }
    else if (m?.type === 'control_request' && m.request?.subtype === 'can_use_tool') {
      const id = `a${++l.n}`, t = deps.now(), tool = clean(m.request.tool_name, 40);
      if (l.rec.asks.filter((a) => a.state === 'open' || a.state === 'deciding').length >= MAX_OPEN) { respond(l, String(m.request_id), {behavior: 'deny', message: 'too many open asks'}); return; }
      l.inputs.set(id, {requestId: String(m.request_id), input: m.request.input});
      l.rec.asks.push({id, tool, summary: clean(`${tool}: ${m.request.description ?? ''}`), state: 'open', createdAt: t, expiresAt: t + expiryMs, box: !(READ_ONLY.has(tool) || (tool === 'Bash' && readOnlyCommand((m.request.input as {command?: unknown} | undefined)?.command)))});
      prune(l);
    } else if (m?.type === 'control_cancel_request') { // the child no longer needs an answer
      for (const [aid, held] of l.inputs) if (held.requestId === String(m.request_id)) { const a = l.rec.asks.find((x) => x.id === aid); if (a) a.state = 'withdrawn'; l.inputs.delete(aid); }
    } else if (m?.type === 'result') { l.rec.turnDone = true; l.rec.unread = true; } // "finished a turn": never "done" (that is a gate PASS)
    save();
  };
  const onExit = (l: Live): void => {
    l.rec.status = l.stopping ? 'stopped' : 'ended';
    for (const a of l.rec.asks) if (a.state === 'open' || a.state === 'deciding') { a.state = 'withdrawn'; l.inputs.delete(a.id); }
    save();
  };

  return {
    async start(b: {repo?: unknown; name?: unknown}): Promise<Reply> {
      if (typeof b.repo !== 'string' || typeof b.name !== 'string' || !REPO.test(b.repo) || !NAME.test(b.name)) return {code: 400, body: {ok: false, error: 'bad repo or name'}};
      if (b.repo === b.name) return {code: 400, body: {ok: false, error: 'Use a task name that is different from the folder name.'}}; // the dispatch script mixes the two up when they are equal
      if (running() >= maxRunning) return {code: 429, body: {ok: false, error: `at most ${maxRunning} builders at once`}};
      const old = deps.existing(b.repo, b.name);
      if (old) { // never deleted, never recreated
        if (!old.dirty || all.has(`${b.repo}-${b.name}`)) return {code: 409, body: {ok: false, error: 'that worktree already exists; finish or clean it by hand'}};
        const rec: Rec = {id: `${b.repo}-${b.name}`, repo: b.repo, name: b.name, worktree: old.worktree, sessionId: '', version: '', status: 'needs-human', turnDone: false, unread: false, asks: []};
        all.set(rec.id, {rec, inputs: new Map(), stopping: false, n: 0}); save();
        return {code: 200, body: {ok: true, id: rec.id, status: 'needs-human'}};
      }
      reserved++; let d: Dispatched;
      try { d = await deps.dispatch(b.repo, b.name); } catch { return {code: 502, body: {ok: false, error: 'dispatch failed'}}; } finally { reserved--; }
      if (!d.ok) return {code: 403, body: {ok: false, error: d.why}};
      if (all.has(d.id)) return {code: 409, body: {ok: false, error: 'that builder already exists'}};
      const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--permission-mode', 'default', '--name', `builder ${b.name}`];
      if (d.settings) args.push('--settings', d.settings); // the card's own walls (what may be written, which secrets are off limits, the network) that dispatch made; anything else still asks
      if (args.some((a) => BANNED.some((x) => a.includes(x)))) return {code: 500, body: {ok: false, error: 'refused'}};
      const rec: Rec = {id: d.id, repo: b.repo, name: b.name, worktree: d.worktree, sessionId: '', version: '', status: 'running', turnDone: false, unread: false, asks: []};
      let child: Child;
      try { child = deps.spawn(args, d.worktree); } catch { // the worktree exists but no child started: a human looks at it
        rec.status = 'needs-human'; all.set(d.id, {rec, inputs: new Map(), stopping: false, n: 0}); save();
        return {code: 502, body: {ok: false, error: 'the builder could not start', id: d.id}};
      }
      const l: Live = {rec, child, inputs: new Map(), stopping: false, n: 0};
      all.set(d.id, l); child.onLine((x) => onLine(l, x)); child.onExit(() => onExit(l));
      child.write(JSON.stringify({type: 'user', message: {role: 'user', content: d.prompt}})); save();
      return {code: 200, body: {ok: true, id: d.id, status: 'running'}};
    },
    async answer(b: {builder?: unknown; ask?: unknown; choice?: unknown}): Promise<Reply> {
      sweep();
      const l = all.get(String(b.builder)), a = l?.rec.asks.find((x) => x.id === b.ask);
      if (!l || !a) return {code: 404, body: {ok: false, error: 'unknown ask'}};
      if (b.choice !== 'yes' && b.choice !== 'no') return {code: 400, body: {ok: false, error: 'yes or no'}};
      if (a.state !== 'open') return {code: 410, body: {ok: false, error: 'that ask is closed'}};
      const held = l.inputs.get(a.id)!; a.state = 'deciding';
      let allow = b.choice === 'yes';
      if (allow && a.box) { // the risky tools need a click on the Mac itself, not only in the page; it shows the REAL input, not only the model's words
        const real = realInput(held.input);
        if (real.length > SHOWN) { a.state = 'answered'; l.inputs.delete(a.id); save(); respond(l, held.requestId, {behavior: 'deny', message: 'too long to review in a dialog: ask for a shorter step'}); return {code: 200, body: {ok: true, behavior: 'deny'}}; }
        const box = deps.dialog(`Allow ${a.tool}${real ? `: ${clean(real, SHOWN)}` : ''}  (the helper says: ${clean(a.summary.replace(/^[^:]*:\s*/, ''), 80)})`);
        try { allow = await Promise.race([box, new Promise<boolean>((ok) => { const t = setTimeout(() => ok(false), dialogMs); t.unref?.(); })]); } catch { allow = false; } // an error or a box nobody answers is a no
      }
      if (a.state !== 'deciding' || l.rec.status !== 'running') return {code: 410, body: {ok: false, error: 'that ask is closed'}}; // the child went away while the box was open
      a.state = 'answered'; l.inputs.delete(a.id); save();
      respond(l, held.requestId, allow ? {behavior: 'allow', updatedInput: held.input} : {behavior: 'deny', message: b.choice === 'no' ? 'denied by the user' : 'denied at the dialog'});
      return {code: 200, body: {ok: true, behavior: allow ? 'allow' : 'deny'}};
    },
    stop(b: {builder?: unknown}): Reply {
      const l = all.get(String(b.builder));
      if (!l) return {code: 404, body: {ok: false, error: 'unknown builder'}};
      if (!l.child || l.rec.status !== 'running' || l.stopping) return {code: 409, body: {ok: false, error: 'not running'}};
      l.stopping = true; l.child.kill('SIGINT');
      const t = setTimeout(() => { if (l.rec.status === 'running') l.child?.kill('SIGTERM'); }, grace); t.unref?.();
      return {code: 200, body: {ok: true}};
    },
    seen(b: {builder?: unknown}): Reply { const l = all.get(String(b.builder)); if (!l) return {code: 404, body: {ok: false}}; l.rec.unread = false; save(); return {code: 200, body: {ok: true}}; },
    list(): Rec[] { sweep(); return [...all.values()].map((l) => l.rec); }
  };
}

// ---- the real pieces: the dispatch script, the claude program, the Mac dialog, the saved list (each one is an argument list, never a shell string) ----
export function realDeps(o: {vault: string; dispatchPath?: string; claudeBin?: string; projects?: string}): Deps {
  const home = homedir(), projects = o.projects ?? join(home, 'Projects'), file = join(o.vault, 'logs/office-builders.json');
  const dispatchPath = o.dispatchPath ?? process.env.OFFICE_DISPATCH ?? join(home, 'Projects/proof-lab/scripts/dispatch'), claudeBin = o.claudeBin ?? process.env.OFFICE_CLAUDE ?? join(home, '.local/bin/claude');
  const PATHISH = /^\/[\w ./-]{1,300}$/;
  return {
    dispatch: (repo, name) => new Promise<Dispatched>((ok) => execFile('python3', [dispatchPath, repo, '--name', name], {timeout: 60_000}, (e, out, err) => {
      if (e) { const last = String(err).trim().split('\n').filter(Boolean).pop() ?? ''; return ok({ok: false, why: clean(last.replace(/^dispatch:\s*/, ''), 160) || 'dispatch failed'}); }
      const wt = out.match(/^worktree\s+(\S.*?)\s+\(branch /m)?.[1], dd = out.match(/^sandbox\s+(.+)\/settings\.json\s*$/m)?.[1];
      if (!wt || !dd || !PATHISH.test(wt) || !PATHISH.test(dd) || wt.includes('..') || dd.includes('..')) return ok({ok: false, why: 'dispatch printed something unexpected'});
      try { ok({ok: true, worktree: wt, prompt: readFileSync(join(dd, 'prompt.md'), 'utf8'), id: dd.split('/').pop()!, settings: join(dd, 'settings.json')}); } catch { ok({ok: false, why: 'the task prompt is missing'}); }
    })),
    existing: (repo, name) => { // same place dispatch puts it; read only
      const wt = join(projects, `${repo}-wt`, name); if (!existsSync(join(wt, '.git'))) return null;
      try { // uncommitted work, ignoring the helper files dispatch itself puts there; if git cannot answer, a human looks
        const dirty = execFileSync('git', ['-C', wt, 'status', '--porcelain'], {encoding: 'utf8', timeout: 10_000}).split('\n').filter((l) => l.trim() && !/(^|\/)(\.claude\/(card\.md|last-verify\.json)|\.verify-env|node_modules)$/.test(l.slice(3).trim()));
        return {worktree: wt, dirty: dirty.length > 0};
      } catch { return {worktree: wt, dirty: true}; }
    },
    spawn: (args, cwd) => {
      const c = spawn(claudeBin, args, {cwd, stdio: ['pipe', 'pipe', 'ignore']}), rl = createInterface({input: c.stdout!}); c.stdin!.on('error', () => {});
      return {write: (l) => { c.stdin!.write(l + '\n'); }, kill: (sig) => { c.kill(sig); }, onLine: (cb) => { rl.on('line', cb); }, onExit: (cb) => { let done = false; const end = (x: number | null) => { if (!done) { done = true; cb(x); } }; c.on('close', end); c.on('error', () => end(null)); }};
    },
    dialog: (text) => new Promise<boolean>((ok) => execFile('osascript', ['-e', 'on run argv', '-e', 'display dialog (item 1 of argv) buttons {"Deny", "Allow"} default button "Deny" with title "Office: allow a tool?" with icon caution giving up after 120', '-e', 'end run', text], {timeout: 125_000}, (e, out) => ok(!e && /button returned:Allow/.test(String(out)) && !/gave up:true/.test(String(out))))),
    store: {
      load: () => { try { const j = JSON.parse(readFileSync(file, 'utf8')) as unknown; return Array.isArray(j) ? (j as Rec[]) : []; } catch { return []; } },
      save: (r) => { mkdirSync(join(o.vault, 'logs'), {recursive: true}); const tmp = `${file}.tmp`; writeFileSync(tmp, JSON.stringify(r), {mode: 0o600}); chmodSync(tmp, 0o600); renameSync(tmp, file); }
    },
    now: Date.now
  };
}
