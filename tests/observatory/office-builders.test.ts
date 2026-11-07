import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import fc from 'fast-check';
import {createBuilders, type Child, type Deps, type Rec} from '../../apps/observatory/office-builders.ts';

// A fake `claude` child: tests push stream-json lines to it and read what the office wrote to its stdin.
function fakeChild() {
  const written: string[] = [], kills: string[] = []; let line: (l: string) => void = () => {}, exit: (c: number | null) => void = () => {};
  const child: Child = {write: (l) => { written.push(l); }, kill: (s) => { kills.push(s); }, onLine: (cb) => { line = cb; }, onExit: (cb) => { exit = cb; }};
  return {child, written, kills, say: (o: object) => line(JSON.stringify(o)), die: (c: number | null = 0) => exit(c), sent: () => written.map((w) => JSON.parse(w) as Record<string, any>)};
}
function setup(over: Partial<Deps> = {}, opts: {expiryMs?: number; stopGraceMs?: number; dialogMs?: number} = {}) {
  const children: ReturnType<typeof fakeChild>[] = [], spawns: {args: string[]; cwd: string}[] = [], dialogs: string[] = [], dispatches: string[] = []; let t = 1_000_000, saved: Rec[] = [], dialogAnswer = true;
  const deps: Deps = {
    dispatch: async (repo, name) => { dispatches.push(`${repo}/${name}`); return {ok: true, worktree: `/w/${repo}-wt/${name}`, prompt: `Do the card for ${name}.`, id: `t-${name}`}; },
    existing: () => null,
    spawn: (args, cwd) => { const c = fakeChild(); children.push(c); spawns.push({args, cwd}); return c.child; },
    dialog: async (text) => { dialogs.push(text); return dialogAnswer; },
    store: {load: () => saved, save: (r) => { saved = r.map((x) => ({...x})); }},
    now: () => t, ...over
  };
  const b = createBuilders(deps, {maxRunning: 3, ...opts});
  return {b, children, spawns, dialogs, dispatches, tick: (ms: number) => { t += ms; }, saved: () => saved, setDialog: (v: boolean) => { dialogAnswer = v; }, deps};
}
const ask = (id: string, tool: string, input: object = {file_path: '/w/x.txt'}) => ({type: 'control_request', request_id: id, request: {subtype: 'can_use_tool', tool_name: tool, input, description: `${tool} something`, tool_use_id: 'tu1'}});

test('start: bad repo or name is refused (flags, paths, odd characters); nothing is dispatched', async () => {
  const s = setup();
  for (const [repo, name] of [['--bare', 'x'], ['../x', 'x'], ['a b', 'x'], ['ok', '--dangerously-skip-permissions'], ['ok', 'Bad Name'], ['ok', ''], ['', 'x']] as const) assert.equal((await s.b.start({repo, name})).code, 400, `${repo}|${name}`);
  assert.equal((await s.b.start({repo: 5, name: 'x'})).code, 400);
  assert.equal(s.dispatches.length, 0); assert.equal(s.spawns.length, 0);
});

test('start: a card that is not approved is refused (403) and no child starts', async () => {
  const s = setup({dispatch: async () => ({ok: false, why: 'the card was never approved (run approve-card)'})});
  const r = await s.b.start({repo: 'command-center', name: 'demo'});
  assert.equal(r.code, 403); assert.match(String(r.body.error), /never approved/); assert.equal(s.spawns.length, 0);
});

test('start: one child with an argument list (no shell), in the worktree; the card brief is the first user message; init gives session id and version', async () => {
  const s = setup(), r = await s.b.start({repo: 'command-center', name: 'demo'});
  assert.equal(r.code, 200);
  assert.deepEqual(s.spawns[0]!.args, ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--permission-mode', 'default', '--name', 'builder demo']);
  assert.equal(s.spawns[0]!.cwd, '/w/command-center-wt/demo');
  assert.deepEqual(s.children[0]!.sent()[0], {type: 'user', message: {role: 'user', content: 'Do the card for demo.'}});
  s.children[0]!.say({type: 'system', subtype: 'init', session_id: '11111111-2222-3333-4444-555555555555', claude_code_version: '2.1.319'});
  const l = s.b.list()[0]!;
  assert.equal(l.status, 'running'); assert.equal(l.sessionId, '11111111-2222-3333-4444-555555555555'); assert.equal(l.version, '2.1.319');
});

test('asks: a permission ask is one Needs-you item; the input never leaves the server; [Yes] on a risky tool needs the native dialog, then writes allow with the same input', async () => {
  const s = setup(); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!;
  c.say(ask('r1', 'Write', {file_path: '/w/secret-path.txt', content: 'TOP-SECRET-BODY'}));
  const a = s.b.list()[0]!.asks;
  assert.equal(a.length, 1); assert.equal(a[0]!.tool, 'Write'); assert.equal(a[0]!.state, 'open');
  assert.ok(!JSON.stringify(s.b.list()).includes('TOP-SECRET-BODY'), 'the tool input stays on the server');
  assert.equal((await s.b.answer({builder: s.b.list()[0]!.id, ask: a[0]!.id, choice: 'yes'})).code, 200);
  assert.equal(s.dialogs.length, 1); assert.match(s.dialogs[0]!, /Write/);
  assert.deepEqual(c.sent().at(-1), {type: 'control_response', response: {subtype: 'success', request_id: 'r1', response: {behavior: 'allow', updatedInput: {file_path: '/w/secret-path.txt', content: 'TOP-SECRET-BODY'}}}});
  assert.equal(s.b.list()[0]!.asks[0]!.state, 'answered');
});

test('asks: the dialog says no -> deny; [No] -> deny without a dialog; a read-only tool needs no dialog', async () => {
  const s = setup(); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!, id = s.b.list()[0]!.id;
  c.say(ask('r1', 'Bash')); c.say(ask('r2', 'Edit')); c.say(ask('r3', 'Read'));
  const [a1, a2, a3] = s.b.list()[0]!.asks;
  s.setDialog(false); await s.b.answer({builder: id, ask: a1!.id, choice: 'yes'});
  assert.equal(c.sent().at(-1)!.response.response.behavior, 'deny');
  const before = s.dialogs.length; await s.b.answer({builder: id, ask: a2!.id, choice: 'no'});
  assert.equal(s.dialogs.length, before); assert.equal(c.sent().at(-1)!.response.response.behavior, 'deny');
  await s.b.answer({builder: id, ask: a3!.id, choice: 'yes'});
  assert.equal(s.dialogs.length, before); assert.equal(c.sent().at(-1)!.response.response.behavior, 'allow');
});

test('asks: answers are only yes or no (nothing inferred); unknown builder 404, unknown ask 404, answered twice 410', async () => {
  const s = setup(); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Read'));
  const a = s.b.list()[0]!.asks[0]!;
  assert.equal((await s.b.answer({builder: id, ask: a.id, choice: 'maybe'})).code, 400);
  assert.equal((await s.b.answer({builder: 'nope', ask: a.id, choice: 'yes'})).code, 404);
  assert.equal((await s.b.answer({builder: id, ask: 'nope', choice: 'yes'})).code, 404);
  assert.equal((await s.b.answer({builder: id, ask: a.id, choice: 'yes'})).code, 200);
  const writes = c.written.length;
  assert.equal((await s.b.answer({builder: id, ask: a.id, choice: 'yes'})).code, 410); assert.equal(c.written.length, writes);
});

test('S6: an ask carries created-at and an expiry; a stale one is withdrawn (deny), and a late [Yes] does nothing', async () => {
  const s = setup({}, {expiryMs: 60_000}); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Edit'));
  const a = s.b.list()[0]!.asks[0]!; assert.ok(a.createdAt > 0 && a.expiresAt === a.createdAt + 60_000);
  s.tick(61_000);
  const after = s.b.list()[0]!.asks[0]!; assert.equal(after.state, 'withdrawn');
  assert.deepEqual(c.sent().at(-1)!.response.response, {behavior: 'deny', message: 'withdrawn: the ask went stale'});
  const writes = c.written.length;
  assert.equal((await s.b.answer({builder: id, ask: a.id, choice: 'yes'})).code, 410);
  assert.equal(c.written.length, writes); assert.equal(s.dialogs.length, 0);
});

test('S4 + S7: a result means "finished a turn" (never done), sets an unread mark, opening the card clears it', async () => {
  const s = setup(); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!, id = s.b.list()[0]!.id;
  c.say({type: 'result', subtype: 'success'});
  const l = s.b.list()[0]!; assert.equal(l.status, 'running'); assert.equal(l.turnDone, true); assert.equal(l.unread, true);
  assert.ok(!('done' in l) && String(l.status) !== 'done');
  assert.equal(s.b.seen({builder: id}).code, 200); assert.equal(s.b.list()[0]!.unread, false);
});

test('at most 3 running: the 4th start is 429; a finished one frees a place', async () => {
  const s = setup();
  for (const n of ['a', 'b', 'c']) assert.equal((await s.b.start({repo: 'r', name: n})).code, 200);
  assert.equal((await s.b.start({repo: 'r', name: 'd'})).code, 429);
  s.children[0]!.die(0);
  assert.equal((await s.b.start({repo: 'r', name: 'd'})).code, 200);
});

test('stop: SIGINT first, then SIGTERM if it is still there; an exit ends the builder; withdrawn asks are denied', async () => {
  const s = setup({}, {stopGraceMs: 15}); await s.b.start({repo: 'command-center', name: 'demo'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Bash'));
  assert.equal(s.b.stop({builder: id}).code, 200); assert.deepEqual(c.kills, ['SIGINT']);
  await new Promise((x) => setTimeout(x, 40)); assert.deepEqual(c.kills, ['SIGINT', 'SIGTERM']);
  c.die(null); assert.equal(s.b.list()[0]!.status, 'stopped');
  assert.equal(s.b.stop({builder: 'nope'}).code, 404);
});

test('an exit the user did not ask for ends the builder as "ended" (not done)', async () => {
  const s = setup(); await s.b.start({repo: 'r', name: 'x'}); s.children[0]!.die(1); assert.equal(s.b.list()[0]!.status, 'ended');
});

test('S4: a restart lists builders that were running as "lost, resume by hand" with their session id', async () => {
  const s = setup(); await s.b.start({repo: 'command-center', name: 'demo'}); s.children[0]!.say({type: 'system', subtype: 'init', session_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', claude_code_version: '2.1.319'});
  const again = createBuilders({...s.deps, store: {load: () => s.saved(), save: () => {}}});
  const l = again.list()[0]!; assert.equal(l.status, 'lost'); assert.equal(l.sessionId, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});

test('S10: a worktree that already exists is never deleted or recreated: dirty -> "needs a human" (nothing started); clean -> 409', async () => {
  const dirty = setup({existing: () => ({worktree: '/w/r-wt/x', dirty: true})});
  const r = await dirty.b.start({repo: 'r', name: 'x'});
  assert.equal(r.code, 200); assert.equal(dirty.b.list()[0]!.status, 'needs-human'); assert.equal(dirty.dispatches.length, 0); assert.equal(dirty.spawns.length, 0);
  const clean = setup({existing: () => ({worktree: '/w/r-wt/x', dirty: false})});
  assert.equal((await clean.b.start({repo: 'r', name: 'x'})).code, 409); assert.equal(clean.spawns.length, 0);
});

test('S9 (property, fixed seed): whatever repo and name are asked for, the child never gets a bypass or --bare flag', async () => {
  const BANNED = ['--dangerously-skip-permissions', '--allow-dangerously-skip-permissions', 'bypassPermissions', '--bare'];
  await fc.assert(fc.asyncProperty(fc.string({maxLength: 30}), fc.string({maxLength: 30}), async (repo, name) => {
    const s = setup(); await s.b.start({repo, name});
    for (const sp of s.spawns) for (const a of sp.args) assert.ok(!BANNED.some((x) => a.includes(x)), a);
  }), {seed: 20261107, numRuns: 150});
});

test('guard: the new code has no bypass flag outside its refusal list, no shell string, no delete of a worktree', () => {
  const src = readFileSync(join(new URL('../../apps/observatory/', import.meta.url).pathname, 'office-builders.ts'), 'utf8').split('\n').filter((l) => !l.includes('const BANNED')).join('\n');
  assert.doesNotMatch(src, /dangerously|bypassPermissions|--bare|shell:\s*true|\bexec\(|rmSync|unlinkSync|worktree\s+remove|--force|approve-card|approvals/i);
});

// ---- found by the first verifier ----
test('a child that exits while the dialog is open: the answer is 410, nothing is written to the dead child, the ask stays withdrawn', async () => {
  let release: (v: boolean) => void = () => {}; const s = setup({dialog: () => new Promise<boolean>((ok) => { release = ok; })});
  await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Bash')); const a = s.b.list()[0]!.asks[0]!;
  const pending = s.b.answer({builder: id, ask: a.id, choice: 'yes'}); c.die(1); const writes = c.written.length; release(true);
  assert.equal((await pending).code, 410); assert.equal(c.written.length, writes); assert.equal(s.b.list()[0]!.asks[0]!.state, 'withdrawn');
});

test('a dialog that throws counts as no (deny), never a hang', async () => {
  const s = setup({dialog: async () => { throw new Error('osascript missing'); }}); await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Edit'));
  const r = await s.b.answer({builder: id, ask: s.b.list()[0]!.asks[0]!.id, choice: 'yes'});
  assert.equal(r.code, 200); assert.equal(c.sent().at(-1)!.response.response.behavior, 'deny'); assert.equal(s.b.list()[0]!.asks[0]!.state, 'answered');
});

test('five starts at the same moment: only 3 children (the cap counts a start that is still being dispatched)', async () => {
  const s = setup(); const rs = await Promise.all(['a', 'b', 'c', 'd', 'e'].map((n) => s.b.start({repo: 'r', name: n})));
  assert.deepEqual(rs.map((r) => r.code).sort(), [200, 200, 200, 429, 429]); assert.equal(s.spawns.length, 3);
});

test('the same id twice is refused (409): the first builder is not overwritten', async () => {
  const s = setup({dispatch: async () => ({ok: true, worktree: '/w/x', prompt: 'p', id: 'same'})}); await s.b.start({repo: 'r', name: 'x'});
  assert.equal((await s.b.start({repo: 'r', name: 'y'})).code, 409); assert.equal(s.b.list().length, 1); assert.equal(s.spawns.length, 1);
  const d = setup({existing: () => ({worktree: '/w/x', dirty: true})}); await d.b.start({repo: 'r', name: 'x'});
  assert.equal((await d.b.start({repo: 'r', name: 'x'})).code, 409);
});

test('a tampered store never stops the office from booting; odd records are dropped, an odd status becomes "lost" (never "done")', () => {
  const odd = [null, 5, {id: 'only'}, {id: 'a', repo: 'r', name: 'n', worktree: '/w', status: 'done', asks: 'zz', sessionId: 7}, {id: 'b', repo: 'r', name: 'n2', worktree: '/w2', status: 'stopped', asks: [null, {id: 'a1', tool: 'Bash', summary: 's', state: 'open', createdAt: 1, expiresAt: 2}]}] as unknown as Rec[];
  const s = setup({store: {load: () => odd, save: () => {}}}); const l = s.b.list();
  assert.deepEqual(l.map((r) => [r.id, r.status]), [['a', 'lost'], ['b', 'stopped']]);
  assert.equal(l[0]!.sessionId, ''); assert.deepEqual(l[0]!.asks, []); assert.equal(l[1]!.asks.length, 1); assert.equal(l[1]!.asks[0]!.state, 'withdrawn');
  assert.equal(createBuilders({...s.deps, store: {load: () => 'nope' as unknown as Rec[], save: () => {}}}).list().length, 0);
});

test('the native dialog shows the REAL command or path (not only the model\'s words) and no hidden formatting characters', async () => {
  const s = setup(); await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!, id = s.b.list()[0]!.id;
  c.say({type: 'control_request', request_id: 'r1', request: {subtype: 'can_use_tool', tool_name: 'Bash', input: {command: 'rm -rf ./build'}, description: 'Run a harmless ‮test​'}});
  await s.b.answer({builder: id, ask: s.b.list()[0]!.asks[0]!.id, choice: 'yes'});
  assert.match(s.dialogs[0]!, /Bash/); assert.match(s.dialogs[0]!, /rm -rf \.\/build/); assert.doesNotMatch(s.dialogs[0]!, /[‮​]/);
  assert.doesNotMatch(JSON.stringify(s.b.list()), /[‮​]/);
});

test('too many open asks: the 21st is denied at once and not stored; old closed asks are pruned', async () => {
  const s = setup(); await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!;
  for (let i = 0; i < 25; i++) c.say(ask(`r${i}`, 'Read'));
  assert.equal(s.b.list()[0]!.asks.filter((a) => a.state === 'open').length, 20);
  assert.equal(c.sent().filter((m) => m.type === 'control_response' && m.response.response.behavior === 'deny').length, 5);
  const id = s.b.list()[0]!.id; for (const a of s.b.list()[0]!.asks.slice()) await s.b.answer({builder: id, ask: a.id, choice: 'no'});
  for (let i = 0; i < 80; i++) c.say(ask(`q${i}`, 'Read')); for (const a of s.b.list()[0]!.asks.filter((x) => x.state === 'open').slice()) await s.b.answer({builder: id, ask: a.id, choice: 'no'});
  assert.ok(s.b.list()[0]!.asks.length <= 50, `asks kept: ${s.b.list()[0]!.asks.length}`);
});

test('a child that cannot start (spawn throws) is "needs-human" with a 502, not a crash; a cancelled ask is withdrawn without a reply; stop twice stacks nothing', async () => {
  const bad = setup({spawn: () => { throw new Error('ENOENT'); }}); const r = await bad.b.start({repo: 'r', name: 'x'});
  assert.equal(r.code, 502); assert.equal(bad.b.list()[0]!.status, 'needs-human');
  const s = setup({}, {stopGraceMs: 10}); await s.b.start({repo: 'r', name: 'y'}); const c = s.children[0]!, id = s.b.list()[0]!.id; c.say(ask('r1', 'Bash'));
  const w = c.written.length; c.say({type: 'control_cancel_request', request_id: 'r1'}); assert.equal(s.b.list()[0]!.asks[0]!.state, 'withdrawn'); assert.equal(c.written.length, w);
  assert.equal(s.b.stop({builder: id}).code, 200); assert.equal(s.b.stop({builder: id}).code, 409);
  await new Promise((x) => setTimeout(x, 40)); assert.deepEqual(c.kills, ['SIGINT', 'SIGTERM']);
});

// ---- found by the second verifier ----
test('a command too long to read in the dialog is DENIED at once (never shown cut off and then allowed in full)', async () => {
  const s = setup(); await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!, id = s.b.list()[0]!.id;
  c.say({type: 'control_request', request_id: 'r1', request: {subtype: 'can_use_tool', tool_name: 'Bash', input: {command: 'echo ' + 'a'.repeat(240) + ' ; rm -rf ~'}, description: 'x'}});
  const r = await s.b.answer({builder: id, ask: s.b.list()[0]!.asks[0]!.id, choice: 'yes'});
  assert.equal(r.code, 200); assert.equal(s.dialogs.length, 0);
  assert.deepEqual(c.sent().at(-1)!.response.response, {behavior: 'deny', message: 'too long to review in a dialog: ask for a shorter step'});
});

test('a tool with no known input key still shows its real input (as JSON), never only the model\'s words', async () => {
  const s = setup(); await s.b.start({repo: 'r', name: 'x'}); const c = s.children[0]!, id = s.b.list()[0]!.id;
  c.say({type: 'control_request', request_id: 'r1', request: {subtype: 'can_use_tool', tool_name: 'mcp__thing__send', input: {to: 'bob', body: 'hi'}, description: 'Send a harmless note'}});
  await s.b.answer({builder: id, ask: s.b.list()[0]!.asks[0]!.id, choice: 'yes'});
  assert.match(s.dialogs[0]!, /to\W+bob/);
});

test('a store that cannot save never breaks start or the stream; a dialog that nobody answers becomes a deny', async () => {
  const full = setup({store: {load: () => [], save: () => { throw new Error('disk full'); }}}); assert.equal((await full.b.start({repo: 'r', name: 'x'})).code, 200); full.children[0]!.say(ask('r1', 'Read')); full.children[0]!.die(0);
  const slow = setup({dialog: () => new Promise<boolean>(() => {})}, {dialogMs: 30}); await slow.b.start({repo: 'r', name: 'x'}); const c = slow.children[0]!; c.say(ask('r1', 'Bash'));
  const r = await slow.b.answer({builder: slow.b.list()[0]!.id, ask: slow.b.list()[0]!.asks[0]!.id, choice: 'yes'});
  assert.equal(r.code, 200); assert.equal(c.sent().at(-1)!.response.response.behavior, 'deny');
  const old: Rec = {id: 'old', repo: 'r', name: 'n', worktree: '/w', sessionId: '', version: '', status: 'stopped', turnDone: false, unread: false, asks: [{id: 'a51', tool: 'Read', summary: 's', state: 'answered', createdAt: 1, expiresAt: 2}]};
  const again = setup({store: {load: () => [old], save: () => {}}}); assert.equal(again.b.list()[0]!.asks[0]!.id, 'a51');
});

// ---- slice 3: the real pieces (shims, no real Claude, Terminal or dialog) and the HTTP routes ----
import {chmodSync, mkdirSync, mkdtempSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {realDeps} from '../../apps/observatory/office-builders.ts';
const sh = (dir: string, name: string, body: string) => { const p = join(dir, name); writeFileSync(p, body); chmodSync(p, 0o755); return p; };
const wait = async (f: () => boolean, ms = 4000) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((x) => setTimeout(x, 20)); };

test('real dispatch: the dispatch script runs with an argument list; its worktree and prompt are read; a refusal becomes the reason', async () => {
  const d = mkdtempSync(join(tmpdir(), 'rd-')), dd = join(d, 'dispatch', 't-demo'); mkdirSync(dd, {recursive: true}); writeFileSync(join(dd, 'prompt.md'), 'You are a Builder.');
  const ok = sh(d, 'ok.py', `#!/usr/bin/env python3\nimport sys\nopen("${d}/argv.txt","w").write("|".join(sys.argv[1:]))\nprint("dispatched.\\nrepo      /x\\nworktree  ${d}/r-wt/demo  (branch b/demo)\\nsandbox   ${dd}/settings.json")\n`);
  assert.deepEqual(await realDeps({vault: d, dispatchPath: ok}).dispatch('r', 'demo'), {ok: true, worktree: `${d}/r-wt/demo`, prompt: 'You are a Builder.', id: 't-demo', settings: `${dd}/settings.json`});
  assert.equal(readFileSync(join(d, 'argv.txt'), 'utf8'), 'r|--name|demo');
  const no = sh(d, 'no.py', '#!/usr/bin/env python3\nimport sys\nsys.exit("dispatch: the card was never approved (run approve-card)")\n');
  const bad = await realDeps({vault: d, dispatchPath: no}).dispatch('r', 'demo');
  assert.equal(bad.ok, false); assert.match((bad as {why: string}).why, /never approved/);
});

test('real existing(): a worktree with uncommitted work is dirty; a clean or missing one is not', () => {
  const home = mkdtempSync(join(tmpdir(), 'ex-')), wt = join(home, 'r-wt', 'demo'); mkdirSync(wt, {recursive: true});
  execFileSync('git', ['init', '-q', wt]); execFileSync('git', ['-C', wt, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x']);
  const deps = realDeps({vault: home, projects: home});
  assert.deepEqual(deps.existing('r', 'demo'), {worktree: wt, dirty: false}); writeFileSync(join(wt, 'edit.txt'), 'x');
  assert.deepEqual(deps.existing('r', 'demo'), {worktree: wt, dirty: true}); assert.equal(deps.existing('r', 'other'), null);
});

test('real child: the claude program is run with the argument list in the worktree; lines in, lines out, exit reported', async () => {
  const d = mkdtempSync(join(tmpdir(), 'ch-')), claude = sh(d, 'claude', '#!/usr/bin/env node\nprocess.stdin.setEncoding("utf8");let b="";process.stdin.on("data",(c)=>{b+=c;if(b.includes("\\n")){console.log(JSON.stringify({cwd:process.cwd(),argv:process.argv.slice(2),got:b.trim()}));process.exit(3);}});\n');
  const child = realDeps({vault: d, claudeBin: claude}).spawn(['-p', '--name', 'builder demo'], d); const lines: string[] = []; let code: number | null | undefined;
  child.onLine((l) => lines.push(l)); child.onExit((c) => { code = c; }); child.write('{"type":"user"}');
  await wait(() => code !== undefined); const m = JSON.parse(lines[0]!);
  assert.equal(code, 3); assert.deepEqual(m.argv, ['-p', '--name', 'builder demo']); assert.equal(m.got, '{"type":"user"}'); assert.equal(m.cwd.replace('/private', ''), d.replace('/private', ''));
});

test('real dialog: osascript gets the text as an argument (never inside the script); Allow is yes; Deny, gave up, failure are no', async () => {
  const d = mkdtempSync(join(tmpdir(), 'dl-')), bin = join(d, 'bin'); mkdirSync(bin); const was = process.env.PATH; process.env.PATH = `${bin}:${was}`;
  try {
    const text = 'Allow Bash: echo "hi"; do shell script "x"';
    for (const [out, want] of [['button returned:Allow, gave up:false', true], ['button returned:Deny, gave up:false', false], ['button returned:Allow, gave up:true', false], ['', false]] as const) {
      sh(bin, 'osascript', `#!/bin/sh\nfor a; do echo "$a" >> "${d}/args.txt"; done\n${out === '' ? 'exit 1' : `echo "${out}"`}\n`);
      assert.equal(await realDeps({vault: d}).dialog(text), want, out);
    }
    const args = readFileSync(join(d, 'args.txt'), 'utf8').split('\n');
    assert.ok(args.includes(text), 'the text is one argument'); assert.ok(!args.filter((a) => a.startsWith('display dialog') || a === 'on run argv').some((a) => a.includes('do shell script "x"')), 'never inside the script');
  } finally { process.env.PATH = was; }
});

test('real store: saved owner-only and loaded back; a missing or broken file loads as empty', () => {
  const d = mkdtempSync(join(tmpdir(), 'st-')), deps = realDeps({vault: d}); mkdirSync(join(d, 'logs'));
  assert.deepEqual(deps.store.load(), []); deps.store.save([{id: 'a'} as never]); assert.deepEqual(deps.store.load(), [{id: 'a'}]);
  assert.equal((statSync(join(d, 'logs/office-builders.json')).mode & 0o777).toString(8), '600'); writeFileSync(join(d, 'logs/office-builders.json'), '{nope'); assert.deepEqual(deps.store.load(), []);
});

test('routes: /start /answer /stop /seen and GET /builders need the key AND a matching Origin; a round trip works; the tool input never leaves the server', async () => {
  const d = mkdtempSync(join(tmpdir(), 'rt-')); mkdirSync(join(d, 'logs')); const f = setup(); const r = await startOffice({vault: d, builders: f.deps});
  const base = `http://127.0.0.1:${r.port}`, tok = r.token, dialogs = f.dialogs;
  const post = (path: string, body: object, h: Record<string, string> = {origin: base, 'x-office-token': tok}) => fetch(`${base}${path}`, {method: 'POST', headers: {'content-type': 'application/json', ...h}, body: JSON.stringify(body)});
  try {
    for (const path of ['/start', '/answer', '/stop', '/seen']) {
      assert.equal((await post(path, {}, {origin: base})).status, 401, `${path} no key`); assert.equal((await post(path, {}, {'x-office-token': tok})).status, 403, `${path} no origin`);
      assert.equal((await post(path, {}, {origin: 'http://evil.example', 'x-office-token': tok})).status, 403, `${path} wrong origin`);
    }
    assert.equal((await fetch(`${base}/builders`)).status, 401);
    assert.equal((await post('/start', {repo: 'r', name: 'demo'})).status, 200);
    f.children[0]!.say({type: 'control_request', request_id: 'q1', request: {subtype: 'can_use_tool', tool_name: 'Write', input: {file_path: '/w/a.txt', content: 'SECRET-BODY'}, description: 'Write a file'}});
    const list = await (await fetch(`${base}/builders`, {headers: {'x-office-token': tok}})).json() as {builders: {id: string; asks: {id: string}[]}[]};
    assert.ok(!JSON.stringify(list).includes('SECRET-BODY')); const b = list.builders[0]!;
    assert.equal((await post('/answer', {builder: b.id, ask: b.asks[0]!.id, choice: 'yes'})).status, 200); assert.equal(dialogs.length, 1);
    assert.equal(f.children[0]!.sent().at(-1)!.response.response.behavior, 'allow');
    assert.equal((await post('/seen', {builder: b.id})).status, 200); assert.equal((await post('/stop', {builder: b.id})).status, 200);
    assert.equal((await post('/start', {repo: '--bare', name: 'x'})).status, 400);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

test('without builders configured the routes do not exist (405 for POST, 404 for GET)', async () => {
  const d = mkdtempSync(join(tmpdir(), 'nb-')); const r = await startOffice({vault: d}); const base = `http://127.0.0.1:${r.port}`;
  try {
    assert.equal((await fetch(`${base}/start`, {method: 'POST', headers: {origin: base, 'x-office-token': r.token}, body: '{}'})).status, 405);
    assert.equal((await fetch(`${base}/builders`, {headers: {'x-office-token': r.token}})).status, 404);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

test('the sandbox that dispatch made for the card is applied to the child (--settings), after the fixed arguments; without one the arguments are unchanged', async () => {
  const s = setup({dispatch: async (repo, name) => ({ok: true, worktree: `/w/${repo}-wt/${name}`, prompt: 'p', id: `t-${name}`, settings: `/d/t-${name}/settings.json`})});
  await s.b.start({repo: 'r', name: 'x'});
  assert.deepEqual(s.spawns[0]!.args.slice(-4), ['--name', 'builder x', '--settings', '/d/t-x/settings.json']);
});

test('a null, array or odd JSON body never crashes the server (every route answers with an error code)', async () => {
  const d = mkdtempSync(join(tmpdir(), 'nul-')); mkdirSync(join(d, 'logs')); const f = setup(); const r = await startOffice({vault: d, builders: f.deps}); const base = `http://127.0.0.1:${r.port}`;
  try {
    for (const path of ['/start', '/answer', '/stop', '/seen']) for (const body of ['null', '[]', '"x"', '5', '{']) {
      const res = await fetch(`${base}${path}`, {method: 'POST', headers: {origin: base, 'x-office-token': r.token}, body}); assert.ok(res.status >= 400 && res.status < 500, `${path} ${body} -> ${res.status}`);
    }
    assert.equal((await fetch(`${base}/builders`, {headers: {'x-office-token': r.token}})).status, 200);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

// ---- slice 4: the page ----
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
const DIST = new URL('../../.work/office-dist', import.meta.url).pathname, AXE = new URL('../../node_modules/axe-core/axe.min.js', import.meta.url).pathname;
const skipPage = existsSync(join(DIST, 'index.html')) && existsSync(AXE) ? false : 'page not built or axe-core missing';

test('page: start a builder from the office; an ask is an amber Needs-you item (no tool input shown); Yes/No answer it; a risky Yes asks the Mac; a result sets a mark that opening clears; a stale ask is withdrawn; Stop; axe clean', {skip: skipPage, timeout: 120000}, async () => {
  const d = mkdtempSync(join(tmpdir(), 'pg-')); mkdirSync(join(d, 'logs')); const f = setup(); const r = await startOffice({vault: d, staticDir: DIST, builders: f.deps});
  const b = await chromium.launch(); const page = await b.newPage({viewport: {width: 1280, height: 1000}, bypassCSP: true});
  try {
    await page.goto(r.url); await page.waitForSelector('.oa-builders', {timeout: 20000});
    await page.fill('.oa-bstart input[name=repo]', 'r'); await page.fill('.oa-bstart input[name=name]', 'demo'); await page.click('.oa-bstart button');
    await page.waitForSelector('.oa-b'); assert.match(await page.innerText('.oa-b'), /demo/);
    const c = f.children[0]!;
    c.say(ask('q1', 'Write', {file_path: '/w/a.txt', content: 'SECRET-BODY'})); await page.waitForSelector('.oa-askitem', {timeout: 8000});
    assert.match(await page.innerText('.oa-askitem'), /Write/); assert.ok(!(await page.innerText('body')).includes('SECRET-BODY'));
    await page.click('.oa-askitem .oa-yes'); await page.waitForSelector('.oa-askitem.done', {timeout: 8000});
    assert.equal(f.dialogs.length, 1); assert.equal(c.sent().at(-1)!.response.response.behavior, 'allow');
    c.say(ask('q2', 'Read')); await page.waitForSelector('.oa-askitem:not(.done)', {timeout: 8000}); await page.click('.oa-askitem:not(.done) .oa-no');
    await page.waitForFunction(() => document.querySelectorAll('.oa-askitem.done').length === 2, null, {timeout: 8000});
    assert.equal(c.sent().at(-1)!.response.response.behavior, 'deny'); assert.equal(f.dialogs.length, 1, 'a No never opens a box');
    c.say({type: 'result', subtype: 'success'}); await page.waitForSelector('.oa-new', {timeout: 8000});
    assert.match(await page.innerText('.oa-b'), /Finished a turn/); assert.doesNotMatch(await page.innerText('.oa-b'), /\bdone\b/i);
    await page.click('.oa-btitle'); await page.waitForSelector('.oa-new', {state: 'detached', timeout: 8000});
    c.say(ask('q3', 'Bash')); await page.waitForSelector('.oa-askitem:not(.done)', {timeout: 8000}); f.tick(16 * 60_000);
    await page.waitForSelector('.oa-askitem.stale', {timeout: 8000}); assert.equal(await page.$('.oa-askitem.stale .oa-yes'), null); assert.match(await page.innerText('.oa-askitem.stale'), /stale/i);
    for (const scheme of ['light', 'dark'] as const) for (const w of [1280, 390]) {
      await page.emulateMedia({colorScheme: scheme}); await page.setViewportSize({width: w, height: 900}); await page.waitForTimeout(300);
      await page.addScriptTag({path: AXE}); const res = await page.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: {target: string[]}[]}[]};
      assert.deepEqual(res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => `${x.id} ${x.nodes.map((n) => n.target.join(' ')).join(' | ')}`), [], `axe ${scheme} ${w}`);
    }
    await page.click('.oa-bstop'); await wait(() => c.kills.includes('SIGINT')); assert.ok(c.kills.includes('SIGINT'));
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});

test('S8: "quiet" is withdrawn when the feed is not live (the page says it cannot tell), and never implies anything else', {skip: skipPage, timeout: 90000}, async () => {
  const d = mkdtempSync(join(tmpdir(), 'q8-')); mkdirSync(join(d, 'logs')); const p2 = (n: number) => String(n).padStart(2, '0'), t = new Date(Date.now() - 300_000);
  const ts = `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}T${p2(t.getHours())}:${p2(t.getMinutes())}:${p2(t.getSeconds())}`;
  const log = join(d, 'logs/office-v1.jsonl'); writeFileSync(log, JSON.stringify({v: 1, seq: 1, ts, sid: 'h:aaaaaaaaaaaa', project: 'proof-lab', kind: 'tool_end', tool: 'Read', ok: true, code: null, gate: null}) + '\n');
  const r = await startOffice({vault: d, staticDir: DIST, logPath: log}); const b = await chromium.launch(); const page = await b.newPage({viewport: {width: 1280, height: 900}});
  try {
    await page.goto(r.url); await page.waitForFunction(() => /quiet/i.test(document.body.innerText) && /LIVE/.test(document.body.innerText), null, {timeout: 20000});
    await page.route('**/events', (route) => route.abort()); r.server.closeAllConnections();
    await page.waitForFunction(() => /Not live/.test(document.body.innerText), null, {timeout: 20000});
    const text = await page.innerText('body'); assert.doesNotMatch(text, /quiet, no news/i); assert.match(text, /can't tell who is quiet/i);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});

test('page: when /builders answers 404 or 401 the strip disappears AND polling stops (no endless requests or console errors)', {skip: skipPage, timeout: 60000}, async () => {
  const d = mkdtempSync(join(tmpdir(), 'np-')); mkdirSync(join(d, 'logs')); const r = await startOffice({vault: d, staticDir: DIST}); const b = await chromium.launch();
  try {
    for (const url of [r.url, `http://127.0.0.1:${r.port}/`]) { // no builders configured (404), then no key in the link (401, cookie not set yet)
      const ctx = await b.newContext(), page = await ctx.newPage(); let n = 0; page.on('request', (q) => { if (q.url().endsWith('/builders')) n++; });
      await page.goto(url); await page.waitForTimeout(4500); assert.ok(n <= 2, `${n} requests to /builders in 4.5 s (${url === r.url ? '404' : '401'})`); assert.equal(await page.$('.oa-builders'), null); await ctx.close();
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});

test('page: if the builders list cannot be reached the strip says it may be old and the Yes/No buttons are off; a failed Yes says why in plain words', {skip: skipPage, timeout: 90000}, async () => {
  const d = mkdtempSync(join(tmpdir(), 'dn-')); mkdirSync(join(d, 'logs')); const f = setup(); const r = await startOffice({vault: d, staticDir: DIST, builders: f.deps}); const b = await chromium.launch(); const page = await b.newPage({viewport: {width: 1280, height: 900}});
  try {
    await page.goto(r.url); await page.waitForSelector('.oa-builders'); await page.fill('.oa-bstart input[name=repo]', 'r'); await page.fill('.oa-bstart input[name=name]', 'demo'); await page.click('.oa-bstart button'); await page.waitForSelector('.oa-b');
    f.children[0]!.say(ask('q1', 'Read')); await page.waitForSelector('.oa-askitem .oa-yes', {timeout: 8000});
    assert.match(await page.innerText('.oa-b'), /demo/); await page.route('**/builders', (route) => route.abort());
    await page.waitForFunction(() => /can't reach the builders/i.test(document.querySelector('.oa-builders')?.textContent ?? ''), null, {timeout: 8000});
    assert.equal(await page.isDisabled('.oa-askitem .oa-yes'), true); assert.equal(await page.isDisabled('.oa-askitem .oa-no'), true);
    await page.unroute('**/builders'); await page.waitForFunction(() => !/can't reach the builders/i.test(document.querySelector('.oa-builders')?.textContent ?? ''), null, {timeout: 8000});
    await page.route('**/answer', (route) => route.fulfill({status: 410, contentType: 'application/json', body: JSON.stringify({ok: false, error: 'that ask is closed'})}));
    await page.click('.oa-askitem .oa-yes'); await page.waitForSelector('.oa-builders [role=alert]'); assert.match(await page.innerText('.oa-builders [role=alert]'), /that ask is closed/); assert.doesNotMatch(await page.innerText('.oa-builders [role=alert]'), /Could not start/);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
