import test from 'node:test';
import assert from 'node:assert/strict';
import {appendFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {startOffice} from '../../apps/observatory/office-server.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ts = () => { const d = new Date(), p = (x: number) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
let seq = 0;
const v1 = (o: object) => JSON.stringify({v: 1, seq: ++seq, ts: ts(), sid: 'h:aaaaaaaaaaaa', project: 'command-center', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o}) + '\n';

async function open(log: string) {
  const v = mkdtempSync(join(tmpdir(), 'v1live-'));
  const r = await startOffice({vault: v, logPath: log});
  const states: any[] = [];
  const ac = new AbortController();
  (async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${r.port}/events`, {headers: {'x-office-token': r.token}, signal: ac.signal});
      const rd = res.body!.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) { const {done, value} = await rd.read(); if (done) break; buf += dec.decode(value, {stream: true}); let i; while ((i = buf.indexOf('\n\n')) >= 0) { const m = /^data: (.*)$/m.exec(buf.slice(0, i)); buf = buf.slice(i + 2); if (m) states.push(JSON.parse(m[1]!)); } }
    } catch { /* closed */ }
  })();
  const waitFor = async (cond: (s: any) => boolean, ms: number) => { const t0 = Date.now(); while (!states.length || !cond(states[states.length - 1])) { if (Date.now() - t0 > ms) return -1; await sleep(20); } return Date.now() - t0; };
  return {states, waitFor, close: () => { ac.abort(); r.server.closeAllConnections(); r.server.close(); }};
}

test('v1 log: a permission prompt becomes an amber "needs you" helper in under 2 s; hidden folders leave no gap', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'v1-')), log = join(dir, 'office-v1.jsonl');
  writeFileSync(log, v1({kind: 'session_start', tool: null, ok: null}) + v1({project: 'scratch-2026-11-05-d3ce38', sid: 'h:bbbbbbbbbbbb'}) + v1({}));
  const c = await open(log);
  try {
    assert.ok(await c.waitFor((s) => s.helpers.length === 1, 2000) >= 0);
    const s0 = c.states[c.states.length - 1];
    assert.equal(s0.helpers[0].project, 'Unfoolable');
    assert.deepEqual(s0.gaps, []);
    appendFileSync(log, v1({kind: 'needs_you', code: 'permission', tool: null, ok: null}));
    const ms = await c.waitFor((s) => s.helpers[0]?.status === 'needs_you', 2000);
    console.log(`permission prompt -> needs_you in ${ms} ms`);
    assert.ok(ms >= 0 && ms < 2000);
  } finally { c.close(); }
});

const HOOK = join(homedir(), '.claude', 'hooks', 'usage_hook.py');
test('the INSTALLED hook: a real permission event reaches the board as needs_you in under 2 s', { skip: !existsSync(join(homedir(), '.claude', 'hooks', 'office_emit.py')) }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hook-')), log = join(dir, 'office-v1.jsonl'); mkdirSync(join(dir, 'state'));
  writeFileSync(log, '');
  const c = await open(log);
  try {
    const env: Record<string, string | undefined> = {...process.env, OFFICE_V1_LOG: log, OFFICE_MAP: join(dir, 'map.json'), USAGE_LOG: join(dir, 'usage.jsonl'), USAGE_STATE: join(dir, 'state'), NO_NOTIFY: '1'};
    delete env.DRIFT_LOG;
    const payload = (e: object) => JSON.stringify({session_id: 'fake-session-for-test', cwd: '/Users/x/Projects/command-center', ...e});
    spawnSync('python3', [HOOK], {input: payload({hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: {}}), env});
    assert.ok(await c.waitFor((s) => s.helpers[0]?.status === 'working', 2000) >= 0);
    spawnSync('python3', [HOOK], {input: payload({hook_event_name: 'PermissionRequest', tool_name: 'Bash'}), env});
    const ms = await c.waitFor((s) => s.helpers[0]?.status === 'needs_you', 2000);
    console.log(`real hook: permission request -> needs_you in ${ms} ms`);
    assert.ok(ms >= 0 && ms < 2000);
  } finally { c.close(); }
});
