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
function setup(over: Partial<Deps> = {}, opts: {expiryMs?: number; stopGraceMs?: number} = {}) {
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
