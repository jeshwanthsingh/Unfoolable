import test from 'node:test';
import assert from 'node:assert/strict';
import {appendFileSync, mkdtempSync, mkdirSync, writeFileSync, truncateSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTail} from '../../apps/observatory/office-tail.ts';
import {startOffice} from '../../apps/observatory/office-server.ts';

const tmp = () => mkdtempSync(join(tmpdir(), 'live-'));
const T = (s: number) => `2026-11-05T10:00:${String(s).padStart(2, '0')}`;
const line = (s: number, session = 'aaaaaaaaaaaa', kind = 'tool') => JSON.stringify({ts: T(s), kind, name: 'Bash', session, project: 'command-center'}) + '\n';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('tail: only new complete lines; a half-written line waits; a truncated file is read again', () => {
  const f = join(tmp(), 'u.jsonl'); writeFileSync(f, 'one\ntwo\nthr');
  const t = createTail(f);
  assert.deepEqual(t.poll(), {lines: ['one', 'two'], reset: false});
  assert.deepEqual(t.poll().lines, []);
  appendFileSync(f, 'ee\nfour\n');
  assert.deepEqual(t.poll().lines, ['three', 'four']);
  truncateSync(f, 0); appendFileSync(f, 'new\n');
  assert.deepEqual(t.poll(), {lines: ['new'], reset: true});
});

// A tiny SSE client: calls onState for every state message until stop().
function sse(url: string, headers: Record<string, string>, onState: (s: any) => void, onEnd: () => void) {
  const ac = new AbortController();
  (async () => {
    try {
      const res = await fetch(url, {headers, signal: ac.signal});
      const rd = res.body!.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const {done, value} = await rd.read(); if (done) break;
        buf += dec.decode(value, {stream: true});
        let i; while ((i = buf.indexOf('\n\n')) >= 0) { const m = /^data: (.*)$/m.exec(buf.slice(0, i)); buf = buf.slice(i + 2); if (m) onState(JSON.parse(m[1]!)); }
      }
    } catch { /* aborted or server gone */ }
    onEnd();
  })();
  return () => ac.abort();
}
const waitFor = async (cond: () => boolean, ms: number) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) return -1; await sleep(20); } return Date.now() - t0; };

test('a new log line reaches the SSE client in under 2 s; the key is required; the cookie link works', async () => {
  const v = tmp(); mkdirSync(join(v, 'logs')); const log = join(v, 'logs/usage.jsonl'); writeFileSync(log, line(0));
  const r = await startOffice({vault: v, logPath: log});
  const base = `http://127.0.0.1:${r.port}`;
  try {
    assert.equal((await fetch(`${base}/state`)).status, 401);
    assert.equal((await fetch(`${base}/state`, {headers: {'x-office-token': 'nope'}})).status, 401);
    const c = await fetch(`${base}/k/${r.token}`, {redirect: 'manual'});
    assert.equal(c.status, 302);
    const cookie = /office_key=[0-9a-f]+/.exec(c.headers.get('set-cookie') ?? '')![0];
    assert.match(c.headers.get('set-cookie')!, /SameSite=Strict/);
    assert.equal((await fetch(`${base}/state`, {headers: {cookie}})).status, 200);
    assert.equal(c.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(`${base}/state`, {headers: {'x-office-token': r.token, origin: 'http://evil.example'}})).status, 403);

    const seen: any[] = [];
    const stop = sse(`${base}/events`, {cookie}, (s) => seen.push(s), () => {});
    assert.ok(await waitFor(() => seen.length > 0, 2000) >= 0);
    const before = seen[seen.length - 1].events;
    appendFileSync(log, line(1));
    const ms = await waitFor(() => seen[seen.length - 1].events === before + 1, 2000);
    console.log(`new line reached the client in ${ms} ms`);
    assert.ok(ms >= 0 && ms < 2000, `took ${ms} ms`);
    assert.equal(seen[seen.length - 1].live, true);
    stop();
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

test('server restart: the client sees the stream end fast, reconnects within 5 s, and shows each helper once', async () => {
  const v = tmp(); mkdirSync(join(v, 'logs')); const log = join(v, 'logs/usage.jsonl');
  writeFileSync(log, line(0) + line(1, 'bbbbbbbbbbbb'));
  const token = 'ab'.repeat(24);
  let r = await startOffice({vault: v, logPath: log, token});
  const port = r.port, base = `http://127.0.0.1:${port}`;
  let last: any = null, ended = 0, lastMsg = Date.now();
  let stop = () => {};
  const connect = () => { stop = sse(`${base}/events`, {'x-office-token': token, 'last-event-id': String(last?.version ?? 0)}, (s) => { last = s; lastMsg = Date.now(); }, () => { ended = Date.now(); setTimeout(() => { if (!done) connect(); }, 500); }); };
  let done = false; connect();
  assert.ok(await waitFor(() => last !== null, 2000) >= 0);
  const t0 = Date.now();
  r.server.closeAllConnections(); await new Promise((ok) => r.server.close(ok));
  const down = await waitFor(() => ended >= t0, 5000);
  console.log(`"Not live" after ${down} ms`);
  assert.ok(down >= 0 && down < 5000);
  const t1 = Date.now();
  r = await startOffice({vault: v, logPath: log, token, port});
  try {
    const back = await waitFor(() => lastMsg >= t1, 5000);
    console.log(`recovered after ${back} ms`);
    assert.ok(back >= 0 && back < 5000);
    const sids = last.helpers.map((h: any) => h.sid);
    assert.equal(new Set(sids).size, sids.length);
    assert.equal(sids.length, 2);
  } finally { done = true; stop(); r.server.closeAllConnections(); r.server.close(); }
});
