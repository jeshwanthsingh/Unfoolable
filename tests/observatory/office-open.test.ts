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

test('the cookie the link was swapped for opens /api/office and /open (with a matching Origin); without the Origin or the key it does not', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cookie-')); mkdirSync(join(dir, 'logs'));
  const mapPath = join(dir, 'map.json'); writeFileSync(mapPath, JSON.stringify({[H1]: {session: SESSION, cwd: '/Users/x/p', tmux: 'work:3'}}));
  const calls: unknown[] = [];
  const r = await startOffice({vault: dir, open: {mapPath, exec: async (f, a) => { calls.push([f, a]); }}});
  const base = `http://127.0.0.1:${r.port}`;
  try {
    const cookie = /office_key=[0-9a-f]+/.exec((await fetch(`${base}/k/${r.token}`, {redirect: 'manual'})).headers.get('set-cookie') ?? '')![0];
    assert.match((await fetch(`${base}/k/${r.token}`, {redirect: 'manual'})).headers.get('set-cookie')!, /HttpOnly; SameSite=Strict/);
    assert.equal((await fetch(`${base}/api/office`, {headers: {cookie}})).status, 200);
    assert.equal((await fetch(`${base}/api/office`)).status, 401);
    const post = (h: Record<string, string>) => fetch(`${base}/open`, {method: 'POST', headers: h, body: JSON.stringify({id: H1})});
    assert.equal((await post({cookie})).status, 403); // no Origin
    assert.equal((await post({cookie: 'office_key=00', origin: base})).status, 401); // wrong key
    assert.equal(calls.length, 0);
    assert.equal((await post({cookie, origin: base})).status, 200);
    assert.equal(calls.length, 2);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

// A failed open says WHY (a class only: timeout, denied, or an exit number), in the log and in the 502 body; never folders, text or session ids.
test('failed open: the class is logged and returned (timeout / denied / exit number), with nothing private', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'why-')), mapPath = join(dir, 'm.json'), logPath = join(dir, 'l.log');
  writeFileSync(mapPath, JSON.stringify({[H2]: {session: SESSION, cwd: '/Users/x/Projects/my app', tmux: null}}));
  let t = 1000; let failure: unknown = null;
  const opener = createOpener({mapPath, logPath, windowsPath: join(dir, 'w.json'), exec: async () => { throw failure; }, now: () => (t += 1500)});
  for (const [err, why] of [[Object.assign(new Error('Command failed'), {killed: true, signal: 'SIGTERM'}), 'timeout'], [Object.assign(new Error('Command failed'), {code: 1, stderr: 'execution error: Not authorized to send Apple events to Terminal. (-1743)'}), 'denied'], [Object.assign(new Error('Command failed'), {code: 7}), 'exit 7'], [new Error('boom'), 'error']] as const) {
    failure = err;
    const r = await opener(H2, true);
    assert.equal(r.code, 502); assert.equal(r.body.why, why);
  }
  const log = readFileSync(logPath, 'utf8');
  assert.match(log, /failed: timeout/); assert.match(log, /failed: denied/); assert.match(log, /failed: exit 7/);
  assert.ok(!log.includes(SESSION) && !log.includes('/Users/x') && !log.includes('Apple events'));
});

// One window per hand-started helper: the first confirmed Open makes ONE window and remembers its id; later Opens only bring it forward.
test('one window: two Opens give one "do script" and one focus call; a closed window asks for the confirm again', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'win-')), mapPath = join(dir, 'm.json'), logPath = join(dir, 'l.log'), windowsPath = join(dir, 'w.json');
  writeFileSync(mapPath, JSON.stringify({[H2]: {session: SESSION, cwd: '/Users/x/Projects/my app', tmux: null}}));
  const calls: string[][] = []; let nextId = 41, closed = false;
  const exec = async (_f: string, a: string[]) => {
    calls.push(a);
    if (a.some((x) => x.includes('do script'))) return `${++nextId}\n`;
    if (a.some((x) => x.includes('set index of window id')) && closed) throw Object.assign(new Error('gone'), {code: 1});
    return '';
  };
  let t = 1000; const opener = createOpener({mapPath, logPath, windowsPath, exec, now: () => (t += 1500)});
  const doScripts = () => calls.filter((a) => a.some((x) => x.includes('do script'))).length, focuses = () => calls.filter((a) => a.some((x) => x.includes('set index of window id'))).length;
  assert.equal((await opener(H2, false)).code, 409); // first time: the confirm
  assert.equal((await opener(H2, true)).body.how, 'resume');
  assert.equal(doScripts(), 1); assert.deepEqual(JSON.parse(readFileSync(windowsPath, 'utf8')), {[H2]: 42});
  const again = await opener(H2, false); // later: no confirm, no new window
  assert.deepEqual(again, {code: 200, body: {ok: true, how: 'focus'}});
  assert.equal(doScripts(), 1); assert.equal(focuses(), 1);
  assert.ok(calls.some((a) => a.includes('tell application "Terminal" to set index of window id 42 to 1')));
  closed = true; // the window was closed: ask again, then open ONE new one
  assert.equal((await opener(H2, false)).code, 409);
  assert.equal((await opener(H2, true)).body.how, 'resume');
  assert.equal(doScripts(), 2); assert.deepEqual(JSON.parse(readFileSync(windowsPath, 'utf8')), {[H2]: 43});
});

test('window file: a null or odd file is treated as empty; a focus that times out or is denied keeps the record (no second window)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'win2-')), mapPath = join(dir, 'm.json'), logPath = join(dir, 'l.log'), windowsPath = join(dir, 'w.json');
  writeFileSync(mapPath, JSON.stringify({[H2]: {session: SESSION, cwd: '/Users/x/Projects/my app', tmux: null}}));
  let t = 1000, focusErr: unknown = null; const calls: string[][] = [];
  const exec = async (_f: string, a: string[]) => { calls.push(a); if (a.some((x) => x.includes('set index of window id')) && focusErr) throw focusErr; return a.some((x) => x.includes('do script')) ? '7\n' : ''; };
  const opener = createOpener({mapPath, logPath, windowsPath, exec, now: () => (t += 1500)});
  for (const odd of ['null', '[1]', '"x"', '{not json']) { writeFileSync(windowsPath, odd); assert.equal((await opener(H2, false)).code, 409, odd); } // no crash, just the confirm
  assert.equal((await opener(H2, true)).body.how, 'resume'); // window 7 recorded
  for (const [err, why] of [[Object.assign(new Error('x'), {killed: true}), 'timeout'], [Object.assign(new Error('x'), {stderr: '(-1743)'}), 'denied']] as const) {
    focusErr = err; const r = await opener(H2, false);
    assert.equal(r.code, 502); assert.equal(r.body.why, why);
    assert.deepEqual(JSON.parse(readFileSync(windowsPath, 'utf8')), {[H2]: 7}, 'the window is probably still there: keep the record');
  }
  focusErr = Object.assign(new Error('gone'), {code: 1}); // a real "no such window"
  assert.equal((await opener(H2, false)).code, 409);
  assert.deepEqual(JSON.parse(readFileSync(windowsPath, 'utf8')), {});
});
