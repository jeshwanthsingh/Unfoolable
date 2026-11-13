import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {startTurn} from '../../apps/turn/turn-server.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'turn-test-'));
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
