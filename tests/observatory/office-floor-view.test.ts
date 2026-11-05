import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {buildFloor} from '../../apps/observatory/office-floor.ts';
import {FLOOR, screenStrings} from '../../apps/web/src/annex/copy.ts';

const JARGON = /\b(hook|commit|diff|verdict|token|handoff|session|repo|eval|json|stderr|pid)s?\b/i;

test('picture words are included in the on-screen strings and carry no jargon', () => {
  assert.ok(screenStrings().includes(FLOOR.legend));
  assert.deepEqual(Object.values(FLOOR).filter((s) => JARGON.test(s)), []);
});

test('desk words the reader writes carry no jargon in any state', () => {
  const L = (ts: string, kind: 'tool' | 'session_end' | 'permission_request', name = 'Bash', needsYou = false) => ({ts, kind, name, session: 'aaaaaaaaaaaa', project: 'demo', needsYou});
  const now = '2026-11-05T03:10:00';
  const words = [
    buildFloor([L('2026-11-05T03:09:00', 'tool')], now), buildFloor([L('2026-11-05T03:00:00', 'tool', 'Read')], now),
    buildFloor([L('2026-11-05T01:00:00', 'tool')], now), buildFloor([L('2026-11-05T03:00:00', 'permission_request', '', true)], now),
    buildFloor([L('2026-11-05T02:00:00', 'session_end', '')], now)
  ].flatMap((f) => f.desks.map((d) => d.word));
  assert.equal(words.length, 5);
  assert.deepEqual(words.filter((w) => JARGON.test(w)), []);
});

test('the server sends the sprite sheet as an image and nothing else binary', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'office-static-'));
  writeFileSync(join(dir, 'builder.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const {server, port} = await startOffice({vault: dir, staticDir: dir});
  try {
    const get = (path: string): Promise<{code: number; type: string; len: number}> => new Promise((ok, bad) => {
      const r = request({host: '127.0.0.1', port, path, headers: {host: `127.0.0.1:${port}`}}, (res) => { let n = 0; res.on('data', (d: Buffer) => (n += d.length)); res.on('end', () => ok({code: res.statusCode ?? 0, type: String(res.headers['content-type']), len: n})); });
      r.on('error', bad); r.end();
    });
    assert.deepEqual(await get('/builder.png'), {code: 200, type: 'image/png', len: 4});
    assert.equal((await get('/other.bin')).code, 404);
  } finally { server.close(); }
});
