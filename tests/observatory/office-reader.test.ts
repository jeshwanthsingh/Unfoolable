import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {buildSnapshot, esc} from '../../apps/observatory/office-data.ts';

const SECRET = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function vault(): string {
  const v = mkdtempSync(join(tmpdir(), 'office-'));
  mkdirSync(join(v, 'logs')); mkdirSync(join(v, 'evals')); mkdirSync(join(v, 'mailbox'));
  const L = (ts: string, kind: string, extra: object = {}) => JSON.stringify({ts, kind, name: 'Bash', session: 'aaaaaaaaaaaa', project: 'demo', secret_field: SECRET, ...extra});
  writeFileSync(join(v, 'logs/usage.jsonl'), [
    L('2026-11-05T01:00:00', 'session_start'), L('2026-11-05T01:00:05', 'tool'), L('2026-11-05T01:00:06', 'hook_block'),
    L('2026-11-05T02:00:00', 'permission_request', {needs_you: true}), 'not json', JSON.stringify({ts: '2026-11-05T02:00:01', kind: 'weird_kind', session: 'aaaaaaaaaaaa'})
  ].join('\n'));
  writeFileSync(join(v, 'evals/scoreboard.csv'), 'date,batch,verdict,cost_usd,valid_run\n2026-11-05,b1,safe,0.5,true\n2026-11-05,b1,risky,0.25,true\n');
  writeFileSync(join(v, 'mailbox/to-chat.md'), `# x\n\n- 2026-11-05 · claude code · <script>alert(1)</script> done: key ${SECRET}\n`);
  writeFileSync(join(v, 'logs/garden-2026-11-05.md'), `# Garden report <b>bold</b> ${SECRET}\n`);
  return v;
}
const NOW = new Date(2026, 10, 5, 3, 0, 0);
const get = (port: number, path: string, headers: Record<string, string> = {}, method = 'GET'): Promise<{code: number; body: string}> =>
  new Promise((ok, bad) => { const r = request({host: '127.0.0.1', port, path, method, headers}, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => ok({code: res.statusCode ?? 0, body: b})); }); r.on('error', bad); r.end(); });

test('snapshot: counts, needs-you, unknown fields and kinds dropped', () => {
  const s = buildSnapshot(vault(), NOW);
  assert.equal(s.light, 'amber');
  assert.equal(s.needsYou.length, 1);
  assert.equal(s.today.guardNo, 1);
  assert.equal(s.today.spent, '$0.75');
  assert.ok(s.results.some((r) => r.text.includes('1 worked, 1 did not')));
  assert.ok(!JSON.stringify(s).includes('secret_field'));
});

test('a secret-looking string in any source file never appears, and markup is escaped', () => {
  const out = JSON.stringify(buildSnapshot(vault(), NOW));
  assert.ok(!out.includes('ABCDEFGHIJKLMNOP'));
  assert.ok(!out.includes('<script') && !out.includes('<b>'));
  assert.equal(esc('<a href="x">&'), '&#60;a href=&#34;x&#34;&#62;&#38;');
});

test('missing files give a calm grey page, not a crash', () => {
  const s = buildSnapshot(mkdtempSync(join(tmpdir(), 'office-empty-')), NOW);
  assert.equal(s.light, 'grey');
});

test('server: loopback only, token, host, origin, read-only', async () => {
  const v = vault();
  const {server, port, token} = await startOffice({vault: v});
  try {
    assert.equal((server.address() as {address: string}).address, '127.0.0.1');
    const h = {host: `127.0.0.1:${port}`};
    assert.equal((await get(port, '/api/office', h)).code, 401, 'no token');
    assert.equal((await get(port, '/api/office', {...h, 'x-office-token': 'wrong'})).code, 401);
    assert.equal((await get(port, '/api/office', {host: 'evil.test', 'x-office-token': token})).code, 403, 'bad host');
    assert.equal((await get(port, '/api/office', {...h, origin: 'http://evil.test', 'x-office-token': token})).code, 403, 'bad origin');
    const ok = await get(port, '/api/office', {...h, origin: `http://127.0.0.1:${port}`, 'x-office-token': token});
    assert.equal(ok.code, 200);
    assert.ok(!ok.body.includes('ABCDEFGHIJKLMNOP'));
    for (const m of ['POST', 'PUT', 'DELETE']) assert.equal((await get(port, '/api/office', {...h, 'x-office-token': token}, m)).code, 405, m);
    assert.equal((await get(port, '/../etc/passwd', h)).code, 404);
  } finally { server.close(); }
});

test('read-only: the reader never changes the source files', async () => {
  const v = vault();
  const snap = () => ['logs/usage.jsonl', 'evals/scoreboard.csv', 'mailbox/to-chat.md'].map((f) => readFileSync(join(v, f), 'utf8') + statSync(join(v, f)).mtimeMs);
  const before = snap(), names = readdirSync(join(v, 'logs')).join();
  buildSnapshot(v, NOW);
  assert.deepEqual(snap(), before);
  assert.equal(readdirSync(join(v, 'logs')).join(), names);
});

test('reader source never touches the database, ticket_events, Keep or verdict code', () => {
  for (const f of ['office-data.ts', 'office-server.ts', 'annex-events.ts']) {
    let src = readFileSync(new URL(`../../apps/observatory/${f}`, import.meta.url), 'utf8');
    if (f === 'office-server.ts') { // the one write the server has: the Ask box's atomic rewrite of the mailbox file (its fs import line and the createAsker statement); any other write still fails
      const lines = src.split('\n');
      assert.equal(lines.filter((l) => l.includes('createAsker({')).length, 1, 'exactly one mailbox writer');
      src = lines.filter((l) => !l.includes('createAsker({') && !/^import .* from 'node:fs';$/.test(l)).join('\n');
    }
    assert.ok(!/ticket_events|node:sqlite|apps\/server|writeFile|appendFile|unlink|rmSync/.test(src), f);
  }
});
