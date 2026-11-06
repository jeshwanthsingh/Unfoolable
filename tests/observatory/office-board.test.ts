import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {boardOf, freshness} from '../../apps/observatory/office-board.ts';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import {fromLegacy, type OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {screenStrings} from '../../apps/web/src/annex/copy.ts';

const JARGON = ['hook', 'commit', 'diff', 'verdict', 'token', 'handoff', 'session', 'repo', 'eval', 'json', 'stderr', 'pid', 'verifier', 'cost', 'gate', 'seq'];
const hits = (t: string) => JARGON.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(t));
let n = 0;
const ev = (o: Partial<OfficeEvent>): OfficeEvent => ({v: 1, seq: ++n, ts: '2026-11-05T10:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o});
const all = (b: ReturnType<typeof boardOf>) => [b.sentence, b.sub, ...b.quietLines, ...[b.needs, b.working, b.checking, b.done].flat().flatMap((c) => [c.project, c.label, c.verb, c.time])];

test('lanes: Working = news under 60 s only; quiet helpers collapse into one line; a failed check is in Done today, not Needs you; done only from a PASS', () => {
  const E = [
    ev({sid: 'h:000000000001', kind: 'needs_you', code: 'permission', ts: '2026-11-05T10:00:50'}),
    ev({sid: 'h:000000000002', ts: '2026-11-05T10:00:55'}),
    ev({sid: 'h:000000000003', kind: 'subagent_start', ts: '2026-11-05T10:00:56'}),
    ev({sid: 'h:000000000004', kind: 'gate_result', ts: '2026-11-05T10:00:10', gate: {task: 'T-1', verdict: 'PASS', passed: 9, total: 12}}),
    ev({sid: 'h:000000000005', kind: 'gate_result', ts: '2026-11-05T10:00:20', gate: {task: 'T-2', verdict: 'FAIL', passed: 3, total: 12}}),
    ev({sid: 'h:000000000006', ts: '2026-11-05T08:00:00'}),
    ev({sid: 'h:000000000007', ts: '2026-11-05T09:50:00'}),
  ];
  const b = boardOf(reduce(E, '2026-11-05T10:01:00'));
  assert.deepEqual(b.needs.map((c) => [c.tone, c.button]), [['amber', 'open']]);
  assert.deepEqual([b.working.length, b.working[0]!.tone, b.checking.length], [1, 'blue', 1]);
  assert.deepEqual(b.done.map((c) => [c.tone, c.verb, c.button]).sort(), [['green', 'Saved. 9 of 12 passed.', null], ['red', "Didn't pass: 3 of 12", 'see']]);
  assert.deepEqual(b.quietLines, ['2 quiet helpers on Unfoolable, no news for a while']);
  assert.equal(b.quiet, 2); assert.equal(b.light, 'amber');
  assert.equal(b.sentence, 'Helper 1 on Unfoolable needs you'); // same project, several helpers: distinct labels
  assert.equal(new Set([b.needs, b.working, b.checking, b.done].flat().map((c) => c.label)).size, 5);
  assert.equal(boardOf(reduce([ev({ts: '2026-11-05T10:00:30'})], '2026-11-05T10:01:00')).sentence, 'All good. 1 helper working.');
  assert.equal(boardOf(reduce([ev({ts: '2026-11-05T09:00:00'}), ev({sid: 'h:000000000002', ts: '2026-11-05T09:10:00'})], '2026-11-05T10:01:00')).sentence, 'All good. Nothing is running.'); // the top line never claims more than Working shows
  assert.equal(boardOf(reduce([ev({ts: '2026-11-05T10:00:30'})], '2026-11-05T10:01:00')).working[0]!.label, 'Unfoolable'); // a lone helper keeps the project name
  assert.equal(boardOf(reduce([], '2026-11-05T10:01:00')).sentence, 'No news yet.');
});

test('freshness line: LIVE with seconds, else Not live with the time of the last news', () => {
  assert.equal(freshness(true, 2400, '2026-11-05T20:45:10'), 'LIVE, updated 2 s ago');
  assert.equal(freshness(true, 9000, '2026-11-05T20:45:10'), 'Not live, last news 20:45');
  assert.equal(freshness(false, 100, null), 'Not live, no news yet');
});

test('jargon linter passes on the board built from the REAL log (skipped if absent)', { skip: !existsSync(join(homedir(), 'Projects/proof-lab/logs/usage.jsonl')) }, () => {
  const lines = readFileSync(join(homedir(), 'Projects/proof-lab/logs/usage.jsonl'), 'utf8').split('\n').filter(Boolean);
  const events = fromLegacy(lines);
  for (const now of [events[events.length - 1]!.ts, events[Math.floor(events.length / 2)]!.ts]) {
    assert.deepEqual(all(boardOf(reduce(events, now))).flatMap((t) => hits(t).map((w) => `${w}: ${t}`)), []);
  }
  assert.deepEqual(screenStrings().flatMap((t) => hits(t).map((w) => `${w}: ${t}`)), []);
});

// Browser check: nothing is cut off at 390 and 1280 px. Skipped when the page is not built or no browser can start.
test('board at 390 and 1280 px: no text is cut off', async (t) => {
  const dist = new URL('../../.work/office-dist', import.meta.url).pathname;
  let chromium; try { ({chromium} = await import('playwright-core')); } catch { return t.skip('playwright-core missing'); }
  if (!existsSync(join(dist, 'index.html'))) return t.skip('page not built (npx vite build --config apps/observatory/vite.config.ts)');
  const v = mkdtempSync(join(tmpdir(), 'board-')); mkdirSync(join(v, 'logs'));
  const d = new Date(), p = (x: number) => String(x).padStart(2, '0');
  const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  const L = (project: string, session: string, kind = 'tool') => JSON.stringify({ts, kind, name: 'Bash', session, project});
  writeFileSync(join(v, 'logs/usage.jsonl'), [L('command-center', 'aaaaaaaaaaaa'), L('coding-agent-crash-tests', 'bbbbbbbbbbbb', 'permission_request'), L('a-really-extremely-long-folder-name-x', 'cccccccccccc')].join('\n') + '\n');
  const r = await startOffice({vault: v, staticDir: dist, logPath: join(v, 'logs/usage.jsonl')});
  let b; try { b = await chromium.launch(); } catch { r.server.close(); return t.skip('no browser'); }
  try {
    for (const w of [390, 1280]) {
      const page = await b.newPage({viewport: {width: w, height: 800}});
      await page.goto(r.url); await page.waitForSelector('.ob-card');
      const bad = await page.evaluate(() => [...document.querySelectorAll('.ob-fresh,.ob-card,.ob-card *,.oa-line,.ob-col h2')].filter((e) => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis').map((e) => e.textContent));
      assert.deepEqual(bad, [], `cut-off text at ${w}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${w}px`);
      assert.match(await page.innerText('.ob-fresh'), /LIVE, updated/);
      assert.ok(!/session|hook|commit|verdict/i.test(await page.innerText('main')));
      await page.close();
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
