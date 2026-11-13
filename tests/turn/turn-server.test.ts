import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, lstatSync, utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
import http from 'node:http';
import {startTurn, realFs, gitHead} from '../../apps/turn/turn-server.ts';

const VERIFY = 'last-' + 'verify.json';
const SHIP = 'last-ship.json';
const HEX = 'a'.repeat(40);
const HEX2 = 'b1'.repeat(20);

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'turn-test-'));
}


function walk(dir: string, out: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isDirectory()) { out[p + '/'] = 'dir'; walk(p, out); }
    else out[p] = st.isSymbolicLink() ? 'link' : readFileSync(p, 'utf8');
  }
  return out;
}


type Res = {status: number; headers: http.IncomingHttpHeaders; body: string};


function req(port: number, method: string, path: string, headers: Record<string, string> = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const r = http.request({host: '127.0.0.1', port, method, path, headers}, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => resolve({status: res.statusCode ?? 0, headers: res.headers, body}));
    });
    r.on('error', reject);
    r.end();
  });
}


const close = (s: http.Server) => new Promise<void>(r => s.close(() => r()));


type Fixture = {vault: string; repo: string; approvals: string};


function fixture(): Fixture {
  const vault = tmp();
  const repo = tmp();
  const approvals = tmp();
  mkdirSync(join(vault, 'cards'), {recursive: true});
  mkdirSync(join(repo, '.claude'), {recursive: true});
  return {vault, repo, approvals};
}


// ---------- startup ----------

test('startTurn binds 127.0.0.1 and returns port, token, url', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, headOf: () => null});
  try {
    const addr = t.server.address() as {address: string; port: number};
    assert.equal(addr.address, '127.0.0.1');
    assert.equal(t.port, addr.port);
    assert.ok(t.port > 0);
    assert.match(t.token, /^[0-9a-f]{16,}$/);
    assert.equal(t.url, `http://127.0.0.1:${t.port}/#t=${t.token}`);
  } finally { await close(t.server); }
});

test('startTurn honours a given token', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'tok123', headOf: () => null});
  try {
    assert.equal(t.token, 'tok123');
    assert.equal(t.url, `http://127.0.0.1:${t.port}/#t=tok123`);
  } finally { await close(t.server); }
});

// ---------- host / origin ----------

test('bad Host header gets 403, localhost host is fine', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'tk', headOf: () => null});
  try {
    const bad = await req(t.port, 'GET', '/api/turn', {host: 'evil.example:' + t.port, 'x-turn-token': 'tk'});
    assert.equal(bad.status, 403);
    const badPort = await req(t.port, 'GET', '/api/turn', {host: '127.0.0.1:1', 'x-turn-token': 'tk'});
    assert.equal(badPort.status, 403);
    const ok = await req(t.port, 'GET', '/api/turn', {host: `localhost:${t.port}`, 'x-turn-token': 'tk'});
    assert.equal(ok.status, 200);
  } finally { await close(t.server); }
});

test('Origin header must be http + allowed host; absent Origin is fine', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'tk', headOf: () => null});
  try {
    const h = (origin?: string) => ({'x-turn-token': 'tk', ...(origin ? {origin} : {})});
    assert.equal((await req(t.port, 'GET', '/api/turn', h())).status, 200);
    assert.equal((await req(t.port, 'GET', '/api/turn', h(`http://127.0.0.1:${t.port}`))).status, 200);
    assert.equal((await req(t.port, 'GET', '/api/turn', h(`http://localhost:${t.port}`))).status, 200);
    assert.equal((await req(t.port, 'GET', '/api/turn', h('http://evil.example'))).status, 403);
    assert.equal((await req(t.port, 'GET', '/api/turn', h(`https://127.0.0.1:${t.port}`))).status, 403);
    assert.equal((await req(t.port, 'GET', '/api/turn', h('null'))).status, 403);
  } finally { await close(t.server); }
});

// ---------- key ----------

test('/k/<token>: wrong token 401, right token 302 with cookie', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'secret1', headOf: () => null});
  try {
    const bad = await req(t.port, 'GET', '/k/nope');
    assert.equal(bad.status, 401);
    assert.ok(!bad.body.includes('secret1'));
    const ok = await req(t.port, 'GET', '/k/secret1');
    assert.equal(ok.status, 302);
    assert.equal(ok.headers.location, '/');
    const cookie = String(ok.headers['set-cookie']);
    assert.ok(cookie.includes('turn_key=secret1'));
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(/SameSite=Strict/i.test(cookie));
  } finally { await close(t.server); }
});

test('/api/turn is 401 without a key, and leaks neither token nor file content', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: TOPSECRETSCOPE\n');
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'secret2', headOf: () => 'abc123'});
  try {
    const none = await req(t.port, 'GET', '/api/turn');
    assert.equal(none.status, 401);
    const wrong = await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'wrong'});
    assert.equal(wrong.status, 401);
    const wrongCookie = await req(t.port, 'GET', '/api/turn', {cookie: 'turn_key=wrong'});
    assert.equal(wrongCookie.status, 401);
    for (const r of [none, wrong, wrongCookie]) {
      assert.ok(!r.body.includes('secret2'));
      assert.ok(!r.body.includes('TOPSECRETSCOPE'));
    }
  } finally { await close(t.server); }
});

test('/api/turn keyed by header or by cookie returns 200 JSON', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'k3', headOf: () => null});
  try {
    for (const h of [{'x-turn-token': 'k3'}, {cookie: 'a=b; turn_key=k3'}]) {
      const r = await req(t.port, 'GET', '/api/turn', h);
      assert.equal(r.status, 200);
      assert.match(String(r.headers['content-type']), /application\/json/);
      const j = JSON.parse(r.body);
      assert.equal(typeof j.at, 'string');
      assert.deepEqual(j.pending, []);
      assert.deepEqual(j.ships, []);
      assert.deepEqual(j.receipts, []);
    }
  } finally { await close(t.server); }
});

// ---------- /api/turn content ----------

test('/api/turn reports pending card, a repo waiting to ship, and its receipt', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: s\n');
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  writeFileSync(join(f.repo, '.claude', 'job.json'), JSON.stringify({ship_waiting: true}));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k4', headOf: () => 'abc123'});
  try {
    const r = await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k4'});
    assert.equal(r.status, 200);
    const j = JSON.parse(r.body);
    assert.equal(j.pending.length, 1);
    assert.equal(j.pending[0].name, 'new');
    assert.equal(j.pending[0].repo, '/r');
    assert.equal(j.pending[0].scope, 's');
    assert.equal(j.pending[0].approveLine, '~/Projects/proof-lab/scripts/approve-card new');
    assert.deepEqual(j.ships, [{repo: f.repo, head: 'abc123'}]);
    assert.equal(j.receipts.length, 1);
    assert.equal(j.receipts[0].repo, f.repo);
    assert.equal(j.receipts[0].shipped, false);
    assert.equal(typeof j.receipts[0].fields, 'object');
  } finally { await close(t.server); }
});

test('a FAIL verifier record appears in neither ships nor receipts', async () => {
  const f = fixture();
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'FAIL'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k5', headOf: () => 'abc123'});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k5'})).body);
    assert.deepEqual(j.ships, []);
    assert.deepEqual(j.receipts, []);
  } finally { await close(t.server); }
});

test('a ship record matching HEAD: not in ships, receipt shipped=true', async () => {
  const f = fixture();
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  writeFileSync(join(f.repo, '.claude', SHIP), JSON.stringify({verdict: 'PASS', head: 'abc123'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k6', headOf: () => 'abc123'});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k6'})).body);
    assert.deepEqual(j.ships, []);
    assert.equal(j.receipts.length, 1);
    assert.equal(j.receipts[0].shipped, true);
  } finally { await close(t.server); }
});

test('receipts follow repos order and skip repos without a record', async () => {
  const a = fixture();
  const b = fixture();
  const c = fixture();
  writeFileSync(join(b.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  writeFileSync(join(a.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  const t = await startTurn({vault: a.vault, repos: [b.repo, c.repo, a.repo], approvalsDir: a.approvals, token: 'k7', headOf: () => 'h1'});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k7'})).body);
    assert.deepEqual(j.receipts.map((r: {repo: string}) => r.repo), [b.repo, a.repo]);
  } finally { await close(t.server); }
});

test('a fake fs whose read throws once: that request answers 500 JSON and the server survives', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: s\n');
  let thrown = false;
  const fs = {
    read(p: string) {
      if (!thrown) { thrown = true; throw new Error('boom'); }
      return realFs.read(p);
    },
    list: (p: string) => realFs.list(p),
  };
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k8', fs, headOf: () => 'abc123'});
  try {
    const first = await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k8'});
    assert.equal(first.status, 500);
    assert.equal(JSON.parse(first.body).ok, false);
    const second = await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k8'});
    assert.equal(second.status, 200);
    JSON.parse(second.body);
  } finally { await close(t.server); }
});

test('/api/turn says what it could not read, and nothing when all is readable', async () => {
  const f = fixture();
  const ok = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k14', headOf: () => null});
  const bad = await startTurn({vault: join(f.vault, 'gone'), repos: [join(f.repo, 'gone')], approvalsDir: join(f.approvals, 'gone'), token: 'k15', headOf: () => null});
  try {
    assert.deepEqual(JSON.parse((await req(ok.port, 'GET', '/api/turn', {'x-turn-token': 'k14'})).body).notLive, []);
    const j = JSON.parse((await req(bad.port, 'GET', '/api/turn', {'x-turn-token': 'k15'})).body);
    assert.deepEqual(j.notLive, ['the cards folder', 'the approvals folder', 'the project gone']);
    assert.deepEqual(j.pending, []);
  } finally { await close(ok.server); await close(bad.server); }
});

test('/api/turn also says so for files that exist but cannot be read, and for an unknown HEAD', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'big.md'), 'x'.repeat(200001));
  writeFileSync(join(f.approvals, 'broken.json'), '{nope');
  writeFileSync(join(f.repo, '.claude', VERIFY), '{"verdict": "PA');
  const g = fixture();
  writeFileSync(join(g.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo, g.repo], approvalsDir: f.approvals, token: 'k19', headOf: () => null});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k19'})).body);
    const name = (p: string) => p.split('/').pop();
    assert.deepEqual(j.notLive, [
      'the card file big.md', 'the approval record broken.json',
      `a check record of the project ${name(f.repo)}`, `the current version of the project ${name(g.repo)}`,
    ]);
  } finally { await close(t.server); }
});

test('/api/turn does not cry wolf: stray valid files, a project with no .claude, a lone verifier record', async () => {
  const f = fixture();
  const bare = tmp(); // a project with no .claude folder at all
  writeFileSync(join(f.approvals, 'str.json'), '"just a string"'); // valid json that is not an approval: the data layer skips it too
  writeFileSync(join(f.approvals, 'num.json'), '42');
  writeFileSync(join(f.approvals, 'notes.txt'), 'not read at all');
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'})); // only a verify record, no ship record
  const t = await startTurn({vault: f.vault, repos: [f.repo, bare], approvalsDir: f.approvals, token: 'k20', headOf: () => 'abc123'});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k20'})).body);
    assert.deepEqual(j.notLive, []);
  } finally { await close(t.server); }
});

test('/api/turn flags a check record that is valid json but not an object, and a folder named like a card', async () => {
  const f = fixture();
  writeFileSync(join(f.repo, '.claude', VERIFY), '["PASS"]');
  mkdirSync(join(f.vault, 'cards', 'dir.md'));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k21', headOf: () => 'abc123'});
  try {
    const j = JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k21'})).body);
    assert.deepEqual(j.notLive, ['the card file dir.md', `a check record of the project ${f.repo.split('/').pop()}`]);
  } finally { await close(t.server); }
});

// ---------- waiting, older, settled, titles ----------

const DAY_S = 86400;
const getTurn = async (t: {port: number}, key: string) => JSON.parse((await req(t.port, 'GET', '/api/turn', {'x-turn-token': key})).body);

test('/api/turn: a fresh card waits (pending, not older)', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: s\n');
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w1', headOf: () => null});
  try {
    const j = await getTurn(t, 'w1');
    assert.deepEqual(j.pending.map((p: {name: string}) => p.name), ['new']);
    assert.deepEqual(j.older, []);
  } finally { await close(t.server); }
});

test('/api/turn: a card whose file is 4 days old is older, with only name and repo', async () => {
  const f = fixture();
  const file = join(f.vault, 'cards', 'new.md');
  writeFileSync(file, 'repo: /r\nscope: s\n');
  const past = Date.now() / 1000 - 4 * DAY_S;
  utimesSync(file, past, past);
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w2', headOf: () => null});
  try {
    const j = await getTurn(t, 'w2');
    assert.deepEqual(j.pending, []);
    assert.deepEqual(j.older, [{name: 'new', repo: '/r'}]);
    assert.ok(!('approveLine' in j.older[0]));
  } finally { await close(t.server); }
});

test('/api/turn: the clock option feeds the age rule', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\n');
  const later = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w3', headOf: () => null, clock: () => Date.now() + 4 * DAY_S * 1000});
  const now = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w4', headOf: () => null, clock: () => Date.now()});
  try {
    const a = await getTurn(later, 'w3');
    assert.deepEqual(a.pending, []);
    assert.deepEqual(a.older, [{name: 'new', repo: '/r'}]);
    const b = await getTurn(now, 'w4');
    assert.equal(b.pending.length, 1);
    assert.deepEqual(b.older, []);
  } finally { await close(later.server); await close(now.server); }
});

test('/api/turn: a card named in the history file is in neither list', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'gone.md'), 'repo: /r\n');
  writeFileSync(join(f.vault, 'cards', 'kept.md'), 'repo: /r\n');
  const old = join(f.vault, 'cards', 'gone-old.md');
  writeFileSync(old, 'repo: /r\n');
  const past = Date.now() / 1000 - 9 * DAY_S;
  utimesSync(old, past, past);
  mkdirSync(join(f.vault, 'logs'));
  writeFileSync(join(f.vault, 'logs', 'approvals-history.jsonl'), `{broken\n${JSON.stringify({card: 'gone.md'})}\n${JSON.stringify({card: 'gone-old.md'})}\n`);
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w5', headOf: () => null});
  try {
    const j = await getTurn(t, 'w5');
    assert.deepEqual(j.pending.map((p: {name: string}) => p.name), ['kept']);
    assert.deepEqual(j.older, []);
    assert.deepEqual(j.settled, ['gone-old', 'gone'], 'a card settled by the history stays visible as a name, never silently gone (sorted by file name)');
  } finally { await close(t.server); }
});

test('/api/turn: historyPath overrides the default history file', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'gone.md'), 'repo: /r\n');
  const hist = join(tmp(), 'h.jsonl');
  writeFileSync(hist, JSON.stringify({card: 'gone.md'}) + '\n');
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'w6', headOf: () => null, historyPath: hist});
  try {
    const j = await getTurn(t, 'w6');
    assert.deepEqual(j.pending, []);
    assert.deepEqual(j.older, []);
  } finally { await close(t.server); }
});

test('/api/turn: a receipt title is the approved card name for that repo, absent with no record', async () => {
  const f = fixture();
  const g = fixture();
  for (const x of [f, g]) writeFileSync(join(x.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  writeFileSync(join(f.approvals, 'one.json'), JSON.stringify({repo: f.repo, source: 'my-card.md', card_sha256: 'c'.repeat(64), approved_at: '2026-01-01T00:00:00Z'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo, g.repo], approvalsDir: f.approvals, token: 'w7', headOf: () => 'abc123'});
  try {
    const j = await getTurn(t, 'w7');
    assert.deepEqual(j.receipts.map((r: {repo: string; title?: string}) => [r.repo, r.title]), [[f.repo, 'my-card'], [g.repo, undefined]]);
    assert.deepEqual(j.receipts.map((r: {titleSource?: string}) => r.titleSource), ['approved', undefined]);
  } finally { await close(t.server); }
});

test('/api/turn: a job.json card name beats the approved name (titleSource job); a bad one falls back; a bare check PASS is not a ship', async () => {
  const [f, g, h] = [fixture(), fixture(), fixture()];
  for (const x of [f, g, h]) {
    writeFileSync(join(x.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
    writeFileSync(join(f.approvals, `${basename(x.repo)}.json`), JSON.stringify({repo: x.repo, source: 'approved-name.md', card_sha256: 'c'.repeat(64), approved_at: '2026-01-01T00:00:00Z'}));
  }
  writeFileSync(join(f.repo, '.claude', 'job.json'), JSON.stringify({card: 'job-name'}));
  writeFileSync(join(g.repo, '.claude', 'job.json'), JSON.stringify({card: 42})); // wrong type: not a title
  const t = await startTurn({vault: f.vault, repos: [f.repo, g.repo, h.repo], approvalsDir: f.approvals, token: 'w8', headOf: () => 'abc123'});
  try {
    const j = await getTurn(t, 'w8');
    assert.deepEqual(j.receipts.map((r: {title?: string; titleSource?: string}) => [r.title, r.titleSource]), [['job-name', 'job'], ['approved-name', 'approved'], ['approved-name', 'approved']]);
    assert.deepEqual(j.ships, []); // no job.json ship_waiting anywhere
    assert.equal(j.receipts[0].fields['reviewer'], 'not recorded');
  } finally { await close(t.server); }
});

test('/api/turn: a symlinked or huge job.json counts as missing (no title, no ship, not recorded)', async () => {
  const [f, g] = [fixture(), fixture()];
  const real = join(tmp(), 'real-job.json');
  writeFileSync(real, JSON.stringify({card: 'linked', ship_waiting: true, tests_first: true}));
  symlinkSync(real, join(f.repo, '.claude', 'job.json'));
  writeFileSync(join(g.repo, '.claude', 'job.json'), JSON.stringify({card: 'huge', ship_waiting: true, tried: 'x'.repeat(200001)}));
  for (const x of [f, g]) writeFileSync(join(x.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo, g.repo], approvalsDir: f.approvals, token: 'w9', headOf: () => 'abc123'});
  try {
    const j = await getTurn(t, 'w9');
    assert.deepEqual(j.ships, []);
    assert.deepEqual(j.receipts.map((r: {title?: string}) => r.title), [undefined, undefined]);
    assert.deepEqual(j.receipts.map((r: {fields: Record<string, string>}) => r.fields['tests written first']), ['not recorded', 'not recorded']);
  } finally { await close(t.server); }
});

// ---------- read only ----------

test('GET routes read the rail but write nothing', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: s\n');
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k16', headOf: () => 'abc123'});
  const snap = () => JSON.stringify([walk(f.vault), walk(f.repo), walk(f.approvals)]);
  const before = snap();
  try {
    await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k16'});
    await req(t.port, 'GET', '/k/k16');
    await req(t.port, 'GET', '/');
    assert.equal(snap(), before);
  } finally { await close(t.server); }
});

test('a non-GET with a wrong Host or Origin still answers 405', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'k17', headOf: () => null});
  try {
    for (const method of ['POST', 'DELETE']) {
      assert.equal((await req(t.port, method, '/api/turn', {host: 'evil.example:' + t.port})).status, 405);
      assert.equal((await req(t.port, method, '/api/turn', {origin: 'http://evil.example'})).status, 405);
    }
  } finally { await close(t.server); }
});

test('every non-GET method answers 405 "Read only." and writes nothing', async () => {
  const f = fixture();
  writeFileSync(join(f.vault, 'cards', 'new.md'), 'repo: /r\nscope: s\n');
  writeFileSync(join(f.repo, '.claude', VERIFY), JSON.stringify({verdict: 'PASS'}));
  const t = await startTurn({vault: f.vault, repos: [f.repo], approvalsDir: f.approvals, token: 'k9', headOf: () => 'abc123'});
  const snap = () => JSON.stringify([walk(f.vault), walk(f.repo), walk(f.approvals)]);
  const before = snap();
  try {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const path of ['/api/turn', '/k/x', '/k/k9', '/', '/anything']) {
        for (const h of [{}, {'x-turn-token': 'k9'}]) {
          const r = await req(t.port, method, path, h);
          assert.equal(r.status, 405, `${method} ${path}`);
          assert.ok(r.body.includes('Read only.'), `${method} ${path} body`);
        }
      }
    }
    assert.equal(snap(), before);
  } finally { await close(t.server); }
});

// ---------- headers ----------

test('responses carry no-store, nosniff and a CSP', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'k10', headOf: () => null});
  try {
    const rs = [
      await req(t.port, 'GET', '/api/turn', {'x-turn-token': 'k10'}),
      await req(t.port, 'GET', '/api/turn'),
      await req(t.port, 'GET', '/nothing'),
      await req(t.port, 'POST', '/api/turn'),
      await req(t.port, 'GET', '/k/k10'),
    ];
    for (const r of rs) {
      assert.equal(r.headers['cache-control'], 'no-store');
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
      const csp = String(r.headers['content-security-policy']);
      assert.ok(csp.includes("default-src 'self'"), csp);
      assert.ok(csp.includes("frame-ancestors 'none'"), csp);
    }
  } finally { await close(t.server); }
});

// ---------- static ----------

test('without staticDir every other GET path is 404', async () => {
  const f = fixture();
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, token: 'k11', headOf: () => null});
  try {
    for (const p of ['/', '/index.html', '/a.js', '/x/y']) {
      assert.equal((await req(t.port, 'GET', p)).status, 404, p);
    }
  } finally { await close(t.server); }
});

test('staticDir serves allowlisted extensions, / is index.html, others 404', async () => {
  const f = fixture();
  const root = tmp();
  const sd = join(root, 'static');
  mkdirSync(join(sd, 'sub'), {recursive: true});
  writeFileSync(join(sd, 'index.html'), '<h1>INDEX</h1>');
  writeFileSync(join(sd, 'app.js'), 'console.log("APPJS")');
  writeFileSync(join(sd, 'style.css'), 'body{}/*CSSBODY*/');
  writeFileSync(join(sd, 'sub', 'icon.svg'), '<svg>SVGBODY</svg>');
  writeFileSync(join(sd, 'notes.txt'), 'TXTBODY');
  writeFileSync(join(sd, 'data.json'), '{"JSONBODY":1}');
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, staticDir: sd, token: 'k12', headOf: () => null});
  try {
    const idx = await req(t.port, 'GET', '/');
    assert.equal(idx.status, 200);
    assert.ok(idx.body.includes('INDEX'));
    assert.equal(idx.headers['cache-control'], 'no-store');
    assert.ok(String(idx.headers['content-security-policy']).includes("default-src 'self'"));
    const js = await req(t.port, 'GET', '/app.js');
    assert.equal(js.status, 200);
    assert.ok(js.body.includes('APPJS'));
    assert.equal((await req(t.port, 'GET', '/style.css')).status, 200);
    const svg = await req(t.port, 'GET', '/sub/icon.svg');
    assert.equal(svg.status, 200);
    assert.ok(svg.body.includes('SVGBODY'));
    for (const p of ['/notes.txt', '/data.json', '/missing.js', '/sub', '/sub/']) {
      const r = await req(t.port, 'GET', p);
      assert.equal(r.status, 404, p);
      assert.ok(!r.body.includes('TXTBODY') && !r.body.includes('JSONBODY'));
    }
  } finally { await close(t.server); }
});

test('path traversal never serves a file outside staticDir', async () => {
  const f = fixture();
  const root = tmp();
  const sd = join(root, 'static');
  mkdirSync(sd, {recursive: true});
  writeFileSync(join(sd, 'index.html'), 'inside');
  writeFileSync(join(root, 'x.js'), 'OUTSIDE_SECRET');
  writeFileSync(join(root, 'b.js'), 'OUTSIDE_SECRET');
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, staticDir: sd, token: 'k13', headOf: () => null});
  try {
    const paths = [
      '/../x.js', '/%2e%2e/x.js', '/a/../../b.js', '/..%2fx.js', '/%2e%2e%2fx.js',
      '/%2E%2E/x.js', '/..\\x.js', '/static/../x.js', '//etc/passwd', '/sub/..//..//x.js',
    ];
    for (const p of paths) {
      const r = await req(t.port, 'GET', p);
      assert.ok(r.status === 404 || r.status === 400, `${p} -> ${r.status}`);
      assert.ok(!r.body.includes('OUTSIDE_SECRET'), p);
    }
  } finally { await close(t.server); }
});

test('a symlinked folder or file inside staticDir never serves what it points at', async () => {
  const f = fixture();
  const root = tmp();
  const sd = join(root, 'static');
  const outside = join(root, 'outside');
  mkdirSync(sd, {recursive: true});
  mkdirSync(outside);
  writeFileSync(join(sd, 'index.html'), 'inside');
  writeFileSync(join(outside, 's.js'), 'OUTSIDE_SECRET');
  symlinkSync(outside, join(sd, 'assets'));
  symlinkSync(join(outside, 's.js'), join(sd, 'link.js'));
  const t = await startTurn({vault: f.vault, repos: [], approvalsDir: f.approvals, staticDir: sd, token: 'k18', headOf: () => null});
  try {
    for (const p of ['/assets/s.js', '/link.js']) {
      const r = await req(t.port, 'GET', p);
      assert.equal(r.status, 404, p);
      assert.ok(!r.body.includes('OUTSIDE_SECRET'), p);
    }
    assert.equal((await req(t.port, 'GET', '/')).status, 200);
  } finally { await close(t.server); }
});

// ---------- realFs ----------

test('realFs.read: regular file only, max 200000 chars, no symlinks', () => {
  const d = tmp();
  const file = join(d, 'f.txt');
  writeFileSync(file, 'hello');
  assert.equal(realFs.read(file), 'hello');
  const big = 'x'.repeat(200000);
  writeFileSync(join(d, 'big.txt'), big);
  assert.equal(realFs.read(join(d, 'big.txt')), big);
  writeFileSync(join(d, 'toobig.txt'), 'x'.repeat(200001));
  assert.equal(realFs.read(join(d, 'toobig.txt')), null);
  symlinkSync(file, join(d, 'link-file'));
  assert.equal(realFs.read(join(d, 'link-file')), null);
  mkdirSync(join(d, 'sub'));
  symlinkSync(join(d, 'sub'), join(d, 'link-dir'));
  assert.equal(realFs.read(join(d, 'link-dir')), null);
  assert.equal(realFs.read(join(d, 'sub')), null);
  assert.equal(realFs.read(join(d, 'missing')), null);
});

test('realFs.list: names of a real directory, null for missing, file or symlink', () => {
  const d = tmp();
  mkdirSync(join(d, 'real'));
  writeFileSync(join(d, 'real', 'a.md'), '1');
  writeFileSync(join(d, 'real', 'b.md'), '2');
  const names = realFs.list(join(d, 'real'));
  assert.ok(names);
  assert.deepEqual([...names!].sort(), ['a.md', 'b.md']);
  assert.equal(realFs.list(join(d, 'nope')), null);
  assert.equal(realFs.list(join(d, 'real', 'a.md')), null);
  symlinkSync(join(d, 'real'), join(d, 'linkdir'));
  assert.equal(realFs.list(join(d, 'linkdir')), null);
});

test('realFs.mtime: ms since epoch for a regular file, null for missing or symlink', () => {
  const d = tmp();
  const file = join(d, 'f.txt');
  writeFileSync(file, 'x');
  const m = realFs.mtime!(file);
  assert.equal(typeof m, 'number');
  assert.ok(Math.abs(m! - Date.now()) < 1000, `mtime ${m} vs ${Date.now()}`);
  assert.equal(realFs.mtime!(join(d, 'missing')), null);
  symlinkSync(file, join(d, 'link'));
  assert.equal(realFs.mtime!(join(d, 'link')), null);
});

test('realFs.readTail: last N chars of a big file, whole text of a small one, null for symlink, folder, missing', () => {
  const d = tmp();
  writeFileSync(join(d, 'big.txt'), 'a'.repeat(500000) + 'END12345');
  assert.equal(realFs.readTail!(join(d, 'big.txt'), 10), 'aaEND12345');
  assert.equal(realFs.readTail!(join(d, 'big.txt'), 200000)!.length, 200000);
  writeFileSync(join(d, 'small.txt'), 'hello');
  assert.equal(realFs.readTail!(join(d, 'small.txt'), 200000), 'hello');
  assert.equal(realFs.readTail!(join(d, 'small.txt'), 5), 'hello');
  assert.equal(realFs.readTail!(join(d, 'small.txt'), 3), 'llo');
  symlinkSync(join(d, 'small.txt'), join(d, 'link'));
  assert.equal(realFs.readTail!(join(d, 'link'), 10), null);
  mkdirSync(join(d, 'sub'));
  assert.equal(realFs.readTail!(join(d, 'sub'), 10), null);
  assert.equal(realFs.readTail!(join(d, 'missing'), 10), null);
});

// ---------- gitHead ----------

test('gitHead: loose ref', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git', 'refs', 'heads'), {recursive: true});
  writeFileSync(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(repo, '.git', 'refs', 'heads', 'main'), HEX + '\n');
  assert.equal(gitHead(repo), HEX);
});

test('gitHead: packed refs', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git'), {recursive: true});
  writeFileSync(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(
    join(repo, '.git', 'packed-refs'),
    `# pack-refs with: peeled fully-peeled sorted\n${HEX2} refs/heads/other\n${HEX} refs/heads/main\n`,
  );
  assert.equal(gitHead(repo), HEX);
});

test('gitHead: a packed-refs bigger than 200000 characters is still read', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git'), {recursive: true});
  writeFileSync(join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(repo, '.git', 'packed-refs'), `${`${HEX2} refs/tags/t\n`.repeat(6000)}${HEX} refs/heads/main\n`);
  assert.equal(gitHead(repo), HEX);
});

test('gitHead: detached HEAD', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git'), {recursive: true});
  writeFileSync(join(repo, '.git', 'HEAD'), HEX2 + '\n');
  assert.equal(gitHead(repo), HEX2);
});

test('gitHead: linked worktree via gitdir file and commondir', () => {
  const root = tmp();
  const main = join(root, 'main');
  const wtGit = join(main, '.git', 'worktrees', 'wt');
  mkdirSync(wtGit, {recursive: true});
  mkdirSync(join(main, '.git', 'refs', 'heads', 'b'), {recursive: true});
  writeFileSync(join(wtGit, 'HEAD'), 'ref: refs/heads/b/wt\n');
  writeFileSync(join(wtGit, 'commondir'), '../..');
  writeFileSync(join(main, '.git', 'refs', 'heads', 'b', 'wt'), HEX + '\n');
  const wt = join(root, 'wt');
  mkdirSync(wt);
  writeFileSync(join(wt, '.git'), `gitdir: ${wtGit}\n`);
  assert.equal(gitHead(wt), HEX);
});

test('gitHead: garbage inputs give null and never throw', () => {
  const missing = join(tmp(), 'nope');
  assert.equal(gitHead(missing), null);

  const bad = tmp();
  mkdirSync(join(bad, '.git'), {recursive: true});
  writeFileSync(join(bad, '.git', 'HEAD'), 'not-a-hex-value\n');
  assert.equal(gitHead(bad), null);

  const short = tmp();
  mkdirSync(join(short, '.git', 'refs', 'heads'), {recursive: true});
  writeFileSync(join(short, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  writeFileSync(join(short, '.git', 'refs', 'heads', 'main'), 'abc123\n');
  assert.equal(gitHead(short), null);

  const out = tmp();
  writeFileSync(join(out, '.git'), `gitdir: ${join(tmp(), 'does', 'not', 'exist')}\n`);
  assert.equal(gitHead(out), null);

  const empty = tmp();
  assert.equal(gitHead(empty), null);
});
