import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOpener} from '../../apps/observatory/office-open.ts';
import {startOffice} from '../../apps/observatory/office-server.ts';

const SESSION = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
const H1 = 'h:111111111111', H2 = 'h:222222222222', H3 = 'h:333333333333', H4 = 'h:444444444444';
function setup(extra: Record<string, object> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'open-')), mapPath = join(dir, 'map.json'), logPath = join(dir, 'open.log');
  writeFileSync(mapPath, JSON.stringify({
    [H1]: {session: SESSION, cwd: '/Users/x/Projects/command-center', tmux: 'work:3'},
    [H2]: {session: SESSION, cwd: '/Users/x/Projects/my app', tmux: null},
    [H3]: {session: SESSION, cwd: "/Users/x/Projects/a'; touch /tmp/pwned; '", tmux: null},
    [H4]: {session: 'x; rm -rf ~', cwd: '/Users/x/Projects/ok', tmux: null}, ...extra
  }));
  const calls: [string, string[]][] = [];
  let t = 10_000;
  const opener = createOpener({mapPath, logPath, exec: async (f, a) => { calls.push([f, a]); }, now: () => (t += 1500)});
  return {opener, calls, logPath};
}

test('tmux window: select-window then Terminal forward, as argument lists (no shell)', async () => {
  const {opener, calls} = setup();
  assert.deepEqual(await opener(H1, false), {code: 200, body: {ok: true, how: 'tmux'}});
  assert.deepEqual(calls, [['tmux', ['select-window', '-t', 'work:3']], ['osascript', ['-e', 'tell application "Terminal" to activate']]]);
});

test('no tmux window: asks to confirm first; only resume:true opens a tab running claude --resume', async () => {
  const {opener, calls} = setup();
  assert.deepEqual(await opener(H2, false), {code: 409, body: {ok: false, needs: 'confirm'}});
  assert.equal(calls.length, 0);
  const r = await opener(H2, true);
  assert.equal(r.code, 200); assert.equal(r.body.how, 'resume');
  assert.equal(calls[0]![0], 'osascript');
  assert.ok(calls[0]![1].includes(`tell application "Terminal" to do script "cd '/Users/x/Projects/my app' && claude --resume ${SESSION}"`));
});

test('refuses: unknown id, bad id, odd folder or session characters (nothing is run)', async () => {
  const {opener, calls} = setup();
  assert.equal((await opener('h:999999999999', true)).code, 404);
  for (const bad of ['../../etc/passwd', 'h:zz', 5, null, {}]) assert.equal((await opener(bad, true)).code, 400);
  assert.equal((await opener(H3, true)).code, 422);
  assert.equal((await opener(H4, true)).code, 422);
  assert.equal(calls.length, 0);
});

test('rate limit: a second call within 1 s is refused; the log has no folder and no real session id', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rate-')), mapPath = join(dir, 'm.json'), logPath = join(dir, 'l.log');
  writeFileSync(mapPath, JSON.stringify({[H1]: {session: SESSION, cwd: '/Users/x/Projects/command-center', tmux: 'work:3'}}));
  let t = 5000; const calls: unknown[] = [];
  const opener = createOpener({mapPath, logPath, exec: async (f, a) => { calls.push([f, a]); }, now: () => t});
  assert.equal((await opener(H1, false)).code, 200);
  t += 400; assert.equal((await opener(H1, false)).code, 429);
  t += 700; assert.equal((await opener(H1, false)).code, 200);
  assert.equal(calls.length, 4);
  const log = readFileSync(logPath, 'utf8');
  assert.equal(log.trim().split('\n').length, 2);
  assert.ok(!log.includes(SESSION) && !log.includes('/Users/x') && log.includes(H1));
});

test('POST /open: key header AND Origin required; GET is refused; the server runs the fake exec', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'srv-')); mkdirSync(join(dir, 'logs'));
  const mapPath = join(dir, 'map.json'); writeFileSync(mapPath, JSON.stringify({[H1]: {session: SESSION, cwd: '/Users/x/p', tmux: 'work:3'}}));
  const calls: unknown[] = [];
  const r = await startOffice({vault: dir, open: {mapPath, exec: async (f, a) => { calls.push([f, a]); }}});
  const base = `http://127.0.0.1:${r.port}`, post = (h: Record<string, string>, body: object) => fetch(`${base}/open`, {method: 'POST', headers: h, body: JSON.stringify(body)});
  try {
    assert.equal((await post({origin: base}, {id: H1})).status, 401);
    assert.equal((await post({origin: base, 'x-office-token': 'nope'}, {id: H1})).status, 401);
    assert.equal((await post({'x-office-token': r.token}, {id: H1})).status, 403);
    assert.equal((await post({origin: 'http://evil.example', 'x-office-token': r.token}, {id: H1})).status, 403);
    assert.equal((await fetch(`${base}/open`, {headers: {'x-office-token': r.token}})).status, 404);
    assert.equal(calls.length, 0);
    const ok = await post({origin: base, 'x-office-token': r.token}, {id: H1});
    assert.equal(ok.status, 200); assert.deepEqual(await ok.json(), {ok: true, how: 'tmux'});
    assert.equal(calls.length, 2);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});
