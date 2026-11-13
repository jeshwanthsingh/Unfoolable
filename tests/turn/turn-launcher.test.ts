import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {createServer as netServer} from 'node:net';
import {get} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';

const ROOT = new URL('../..', import.meta.url).pathname, SCRIPT = join(ROOT, 'scripts/turn');

const freePort = (): Promise<number> => new Promise((ok) => { const s = netServer().listen(0, () => { const p = (s.address() as {port: number}).port; s.close(() => ok(p)); }); });
const status = (port: number, path: string): Promise<number> => new Promise((ok, bad) => { get({host: '127.0.0.1', port, path}, (r) => { r.resume(); ok(r.statusCode ?? 0); }).on('error', bad); });

// Every folder, port and the fake `open` belong to the test, so nothing real is touched.
async function setup() {
  const tmp = mkdtempSync(join(tmpdir(), 'turn-launch-')), bin = join(tmp, 'bin'), work = join(tmp, 'work');
  for (const d of [bin, work, join(tmp, 'vault/cards'), join(tmp, 'approvals'), join(tmp, 'repos'), join(tmp, 'static')]) mkdirSync(d, {recursive: true});
  const seen = join(tmp, 'opened.txt');
  writeFileSync(join(bin, 'open'), `#!/bin/sh\nfor a; do echo "$a" >> "$FAKE_OPEN_LOG"; done\necho -- >> "$FAKE_OPEN_LOG"\nexit 0\n`); chmodSync(join(bin, 'open'), 0o755);
  const port = await freePort();
  const env = {
    ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_OPEN_LOG: seen, ANTHROPIC_API_KEY: 'sentinel-key',
    TURN_PORT: String(port), TURN_WORK: work, TURN_NO_BUILD: '1', TURN_VAULT: join(tmp, 'vault'),
    TURN_APPROVALS: join(tmp, 'approvals'), TURN_REPOS: join(tmp, 'repos'), TURN_STATIC: join(tmp, 'static'),
  };
  const run = (stamp = 'one') => spawnSync('bash', [SCRIPT], {env: {...env, TURN_STAMP: stamp}, encoding: 'utf8', cwd: ROOT, timeout: 60000});
  const pidOf = () => readFileSync(join(work, 'turn.pid'), 'utf8').trim();
  const links = () => (existsSync(seen) ? readFileSync(seen, 'utf8') : '').split('\n').filter((l) => l.startsWith('http://127.0.0.1:'));
  const stop = () => { try { process.kill(Number(pidOf())); } catch { /* already gone */ } };
  return {tmp, bin, work, seen, port, env, run, pidOf, links, stop};
}
const keyOf = (link: string) => link.split('#t=')[1]!;
const alive = (pid: string) => spawnSync('kill', ['-0', pid]).status === 0;

test('scripts/turn: first call starts the server, opens Chrome on a working link, never prints the key or link', {timeout: 90000}, async () => {
  const t = await setup();
  try {
    const a = t.run();
    assert.equal(a.status, 0, a.stderr);
    assert.doesNotMatch(a.stdout + a.stderr, /#t=|http:\/\/127\.0\.0\.1/, 'link must not reach the terminal');
    const [link] = t.links();
    assert.ok(link, 'open was given a link');
    assert.match(readFileSync(t.seen, 'utf8'), /^-a\nGoogle Chrome\nhttp:\/\/127\.0\.0\.1:\d+\/#t=/);
    const key = keyOf(link!);
    assert.ok(!(a.stdout + a.stderr).includes(key), 'key must not reach the terminal');
    assert.equal(readFileSync(join(t.work, 'turn.stamp'), 'utf8').trim(), 'one');
    assert.ok(alive(t.pidOf()), 'server is running');
    assert.equal(await status(t.port, `/k/${key}`), 302);
    assert.equal(await status(t.port, '/k/wrong'), 401);
  } finally { t.stop(); }
});

test('scripts/turn: same stamp reuses the live server and opens the same working link again', {timeout: 90000}, async () => {
  const t = await setup();
  try {
    assert.equal(t.run().status, 0);
    const first = t.pidOf();
    const b = t.run();
    assert.equal(b.status, 0, b.stderr);
    assert.equal(t.pidOf(), first, 'no second server');
    assert.ok(alive(first));
    const l = t.links();
    assert.equal(l.length, 2);
    assert.equal(l[1], l[0], 'same link');
    assert.equal(await status(t.port, `/k/${keyOf(l[1]!)}`), 302);
  } finally { t.stop(); }
});

test('scripts/turn: a changed stamp restarts only its own server with a new key', {timeout: 90000}, async () => {
  const t = await setup();
  try {
    assert.equal(t.run('one').status, 0);
    const first = t.pidOf(), oldKey = keyOf(t.links()[0]!);
    const b = t.run('two');
    assert.equal(b.status, 0, b.stderr);
    assert.notEqual(t.pidOf(), first, 'new pid');
    assert.equal(alive(first), false, 'old server is gone');
    const newKey = keyOf(t.links().at(-1)!);
    assert.notEqual(newKey, oldKey);
    assert.equal(await status(t.port, `/k/${oldKey}`), 401);
    assert.equal(await status(t.port, `/k/${newKey}`), 302);
  } finally { t.stop(); }
});

test('scripts/turn: a port held by something else fails plainly and starts nothing', {timeout: 60000}, async () => {
  const t = await setup();
  const holder = netServer();
  await new Promise<void>((ok) => holder.listen(t.port, '127.0.0.1', ok));
  try {
    const r = t.run();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /Port/);
    assert.match(r.stdout + r.stderr, /something else/);
    assert.equal(existsSync(join(t.work, 'turn.pid')), false, 'no pid file');
    assert.equal(t.links().length, 0, 'open was not called');
  } finally { holder.close(); t.stop(); }
});

test('scripts/turn: a stale or planted turn.pid never gets a signal: a stranger process is left alone, pid 0 is ignored', {timeout: 90000}, async () => {
  const t = await setup();
  const stranger = spawn('sleep', ['60'], {stdio: 'ignore'});
  try {
    for (const planted of [String(stranger.pid), '0', '1', 'not-a-pid']) {
      writeFileSync(join(t.work, 'turn.pid'), planted + '\n');
      writeFileSync(join(t.work, 'turn.stamp'), 'one\n');
      const r = t.run();
      assert.equal(r.status, 0, `${planted}: ${r.stderr}`);
      assert.ok(alive(String(stranger.pid)), `the stranger process must survive a pid file naming it (${planted})`);
      assert.notEqual(t.pidOf(), String(stranger.pid), 'the script started its own server');
      assert.equal(await status(t.port, `/k/${keyOf(t.links().at(-1)!)}`), 302);
      t.stop();
      await new Promise((ok) => setTimeout(ok, 300));
    }
  } finally { stranger.kill(); t.stop(); }
});

test('scripts/turn: a lock held by another call refuses plainly; the log is private; a bad port is refused', {timeout: 60000}, async () => {
  const t = await setup();
  try {
    mkdirSync(join(t.work, 'turn.lock'));
    const locked = t.run();
    assert.notEqual(locked.status, 0);
    assert.match(locked.stdout + locked.stderr, /Another turn command/);
    assert.equal(t.links().length, 0, 'open was not called');
    const bad = spawnSync('bash', [SCRIPT], {env: {...t.env, TURN_PORT: 'abc', TURN_STAMP: 'x'}, encoding: 'utf8', cwd: ROOT});
    assert.notEqual(bad.status, 0);
    assert.match(bad.stdout + bad.stderr, /TURN_PORT must be a number/);
    spawnSync('rmdir', [join(t.work, 'turn.lock')]);
    assert.equal(t.run().status, 0);
    assert.equal(statSync(join(t.work, 'turn.log')).mode & 0o777, 0o600, 'the log holding the key is private');
    assert.equal(existsSync(join(t.work, 'turn.lock')), false, 'the lock is released');
  } finally { t.stop(); }
});

test('scripts/turn: source checks (unsets ANTHROPIC_API_KEY, never prints the link or key; the server stays read-only)', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  assert.match(script, /unset[^\n]*ANTHROPIC_API_KEY/);
  const printsSecret = script.split('\n').filter((l) => /^\s*[^#]*\b(echo|printf)\b/.test(l)).filter((l) => /\$\{?\w*(link|key|url|token)\w*/i.test(l) || /#t=|127\.0\.0\.1/.test(l));
  assert.deepEqual(printsSecret, [], 'no line echoes the link or key');
  const server = readFileSync(join(ROOT, 'apps/turn/turn-server.ts'), 'utf8');
  for (const bad of ['child_process', 'spawn', 'execSync', 'execFile']) assert.ok(!server.includes(bad), `turn-server.ts must not contain ${bad}`);
});
