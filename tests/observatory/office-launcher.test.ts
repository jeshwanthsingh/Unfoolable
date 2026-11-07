import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = new URL('../..', import.meta.url).pathname, SCRIPT = join(ROOT, 'scripts/office');
const skip = existsSync(join(ROOT, '.work/office-dist/index.html')) ? false : 'page not built';

// A fake `open` records the URL it gets instead of starting Chrome. The launcher gets its own work folder and port.
test('scripts/office: starts the office, opens a link with a key, never prints the key, reuses a current server, restarts a stale one', {skip, timeout: 120000}, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'launch-')), bin = join(tmp, 'bin'), seen = join(tmp, 'opened.txt'), work = join(tmp, 'work');
  spawnSync('mkdir', ['-p', bin, work]);
  writeFileSync(join(bin, 'open'), `#!/bin/sh\nfor a; do echo "$a" >> "${seen}"; done\n`); chmodSync(join(bin, 'open'), 0o755);
  const port = String(20000 + Math.floor(Math.random() * 20000));
  const env = {...process.env, PATH: `${bin}:${process.env.PATH}`, OFFICE_PORT: port, OFFICE_WORK: work, OFFICE_VAULT: tmp, OFFICE_NO_BUILD: '1'};
  const run = (stamp?: string) => spawnSync('bash', [SCRIPT], {env: {...env, ...(stamp ? {OFFICE_STAMP: stamp} : {})}, encoding: 'utf8', cwd: ROOT, timeout: 60000});
  const pidOf = () => readFileSync(join(work, 'office.pid'), 'utf8').trim();
  try {
    const a = run('one');
    assert.equal(a.status, 0, a.stderr);
    assert.doesNotMatch(a.stdout + a.stderr, /#t=|[0-9a-f]{48}/, 'the key must not reach the terminal');
    assert.match(readFileSync(seen, 'utf8'), /Google Chrome[\s\S]*http:\/\/127\.0\.0\.1:\d+\/#t=[0-9a-f]{48}/);
    const first = pidOf();
    run('one'); assert.equal(pidOf(), first, 'same stamp: no new server');
    run('two'); assert.notEqual(pidOf(), first, 'changed stamp: restarted');
    assert.equal(spawnSync('kill', ['-0', first]).status !== 0, true, 'the old server is gone');
  } finally { try { process.kill(Number(pidOf())); } catch { /* already gone */ } }
});
