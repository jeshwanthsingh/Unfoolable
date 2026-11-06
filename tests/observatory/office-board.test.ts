import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import fc from 'fast-check';
import {boardOf, freshness} from '../../apps/observatory/office-board.ts';
import {attachGates, reduce} from '../../apps/observatory/office-reducer.ts';
import {fromLegacy, type OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {screenStrings} from '../../apps/web/src/annex/copy.ts';

const JARGON = ['hook', 'commit', 'diff', 'verdict', 'token', 'handoff', 'session', 'repo', 'eval', 'json', 'stderr', 'pid', 'verifier', 'cost', 'gate', 'seq'];
const hits = (t: string) => JARGON.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(t));
let n = 0;
const ev = (o: Partial<OfficeEvent>): OfficeEvent => ({v: 1, seq: ++n, ts: '2026-11-05T10:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o});
const all = (b: ReturnType<typeof boardOf>) => [b.sentence, b.sub, ...b.quietLines, ...[b.needs, b.working, b.checking, b.done].flat().flatMap((c) => [c.project, c.label, c.verb, c.time])];

test('lanes: Working = news under 60 s only; quiet helpers collapse into one line; a failed check is in its own Didn\'t pass lane, never in Needs you or Done; done only from a PASS', () => {
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
  assert.deepEqual(b.done.map((c) => [c.tone, c.verb, c.button]), [['green', 'Saved. 9 of 12 passed.', null]]);
  assert.deepEqual(b.failed.map((c) => [c.tone, c.verb, c.button]), [['red', "Didn't pass: 3 of 12 passed", 'see']]);
  assert.deepEqual(b.quietLines, ['Helper 6, Helper 7 on Unfoolable: quiet, no news for a while']);
  assert.equal(b.quiet, 2); assert.equal(b.light, 'amber');
  assert.equal(b.sentence, 'Helper 1 on Unfoolable needs you'); // same project, several helpers: distinct labels
  assert.equal(new Set([b.needs, b.working, b.checking, b.done, b.failed].flat().map((c) => c.label)).size, 5);
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
      assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.ob-fresh')!).fontFamily), /^Digits/, 'digits come from the plain-zero font'); // the body font draws a slashed zero
      assert.ok(await page.evaluate(() => document.fonts.check('16px Digits', '0')), 'the digit font is loaded');
      assert.ok(!/session|hook|commit|verdict/i.test(await page.innerText('main')));
      await page.close();
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});

test("a failed check: top line says it didn't pass (light red), zero tests is \"No tests ran\", and a later PASS clears it", () => {
  const fail = (sid: string, passed: number, total: number, ts: string) => ev({sid, kind: 'gate_result', ts, gate: {task: 'T', verdict: 'FAIL', passed, total}});
  const one = boardOf(reduce([ev({sid: 'h:000000000001', ts: '2026-11-05T09:30:00'}), fail('h:000000000002', 0, 1, '2026-11-05T09:31:00')], '2026-11-05T10:01:00'));
  assert.equal(one.sentence, "1 thing didn't pass"); assert.equal(one.light, 'red');
  assert.equal(one.failed[0]!.verb, "Didn't pass: 0 of 1 passed"); assert.ok(!/1 of 1/.test(one.failed[0]!.verb));
  assert.equal(boardOf(reduce([ev({sid: 'h:000000000001', ts: '2026-11-05T09:30:00'}), fail('h:000000000002', 0, 0, '2026-11-05T09:31:00')], '2026-11-05T10:01:00')).failed[0]!.verb, 'No tests ran. Check the setup.');
  const fixed = boardOf(reduce([ev({ts: '2026-11-05T09:30:00'}), ev({sid: 'h:000000000002', kind: 'gate_result', ts: '2026-11-05T09:31:00', gate: {task: 'T', verdict: 'FAIL', passed: 0, total: 1}}), ev({sid: 'h:000000000002', kind: 'gate_result', ts: '2026-11-05T09:40:00', gate: {task: 'T', verdict: 'PASS', passed: 1, total: 1}})], '2026-11-05T10:01:00'));
  assert.equal(fixed.failed.length, 0); assert.ok(fixed.sentence.startsWith('All good'));
});

test('property: nothing whose latest check did not PASS is ever in Done today (any event order)', () => {
  const row = fc.record({k: fc.constantFrom('tool_end', 'turn_end', 'needs_you', 'gate_result', 'gate_result', 'session_end'), s: fc.constantFrom('h:aaaaaaaaaaaa', 'h:bbbbbbbbbbbb', 'h:gate00000001', 'h:gate00000002'), p: fc.constantFrom('Unfoolable', 'AgentRunLab'), v: fc.constantFrom('PASS', 'FAIL', 'PARTIAL'), pass: fc.integer({min: 0, max: 5}), tot: fc.integer({min: 0, max: 5})});
  fc.assert(fc.property(fc.array(row, {minLength: 1, maxLength: 40}), (rows) => {
    const E: OfficeEvent[] = rows.map((r, i) => ({v: 1, seq: i + 1, ts: '2026-11-05T10:00:00', sid: r.s, project: r.p, kind: r.k as OfficeEvent['kind'], tool: null, ok: null, code: r.k === 'needs_you' ? 'permission' : null,
      gate: r.k === 'gate_result' ? {task: 'T', verdict: r.v as 'PASS', passed: Math.min(r.pass, r.tot), total: r.tot} : null}));
    const b = boardOf(reduce(E, '2026-11-05T10:05:00'));
    const last = new Map<string, string>(); // helper id -> verdict of its latest gate result (gate-only ids are handed to their project's single helper first)
    for (const e of attachGates(E)) if (e.kind === 'gate_result') last.set(e.sid, e.gate!.verdict);
    for (const c of b.done) assert.equal(last.get(c.key), 'PASS', `${c.label} is in Done without a PASS`);
    for (const c of b.failed) assert.equal(last.get(c.key), 'FAIL');
    assert.ok(b.done.every((c) => c.tone === 'green') && b.failed.every((c) => c.tone === 'red'));
  }), {numRuns: 400, seed: 21});
});

test('a helper that finished its turn is visible: waiting for your reply for 15 minutes, then quiet', () => {
  const turn = (ts: string) => [ev({ts: '2026-11-05T09:50:00'}), ev({kind: 'turn_end', ts, tool: null})];
  const soon = boardOf(reduce(turn('2026-11-05T09:58:00'), '2026-11-05T10:01:00'));
  assert.deepEqual(soon.needs.map((c) => [c.verb, c.tone, c.button]), [['I finished my turn. Waiting for your reply.', 'amber', 'open']]);
  assert.equal(soon.sentence, 'Unfoolable needs you'); assert.equal(soon.quiet, 0);
  const late = boardOf(reduce(turn('2026-11-05T09:30:00'), '2026-11-05T10:01:00')); // 31 min ago
  assert.deepEqual([late.needs.length, late.quiet], [0, 1]);
  const ended = boardOf(reduce([ev({ts: '2026-11-05T09:50:00'}), ev({kind: 'turn_end', ts: '2026-11-05T09:58:00', tool: null}), ev({kind: 'session_end', ts: '2026-11-05T09:59:00', tool: null})], '2026-11-05T10:01:00'));
  assert.equal(ended.needs.length, 0); // the session is over: nobody is waiting
  const failed = boardOf(reduce([ev({ts: '2026-11-05T09:50:00'}), ev({kind: 'turn_end', ts: '2026-11-05T09:58:00', tool: null, ok: false})], '2026-11-05T10:01:00'));
  assert.equal(failed.needs.length, 0); // a failed turn end is not a reply request
});

test('one label per helper: a helper is never both in a lane and in the quiet line; the same number means the same helper', () => {
  const E = [ev({sid: 'h:000000000001', ts: '2026-11-05T10:00:50'}), ev({sid: 'h:000000000002', ts: '2026-11-05T08:00:00'}), ev({sid: 'h:000000000003', ts: '2026-11-05T08:05:00'})];
  const b = boardOf(reduce(E, '2026-11-05T10:01:00'));
  assert.equal(b.working[0]!.label, 'Helper 1 on Unfoolable');
  assert.deepEqual(b.quietLines, ['Helper 2, Helper 3 on Unfoolable: quiet, no news for a while']);
  assert.equal(boardOf(reduce([ev({sid: 'h:000000000009', ts: '2026-11-05T08:00:00'})], '2026-11-05T10:01:00')).quietLines[0], 'Unfoolable: quiet, no news for a while'); // a lone helper keeps the project name
  const row = fc.record({s: fc.constantFrom('h:000000000001', 'h:000000000002', 'h:000000000003', 'h:000000000004'), p: fc.constantFrom('Unfoolable', 'AgentRunLab'), t: fc.integer({min: 0, max: 7200}), k: fc.constantFrom('tool_end', 'turn_end', 'needs_you')});
  fc.assert(fc.property(fc.array(row, {minLength: 1, maxLength: 30}), (rows) => {
    const evs: OfficeEvent[] = rows.map((r, i) => ({v: 1, seq: i + 1, ts: `2026-11-05T${String(8 + Math.floor(r.t / 3600)).padStart(2, '0')}:${String(Math.floor((r.t % 3600) / 60)).padStart(2, '0')}:00`, sid: `${r.s}${r.p === 'AgentRunLab' ? '' : ''}`, project: r.p, kind: r.k as OfficeEvent['kind'], tool: null, ok: null, code: r.k === 'needs_you' ? 'permission' : null, gate: null}));
    const board = boardOf(reduce(evs, '2026-11-05T10:30:00'));
    const lane = new Set([board.needs, board.working, board.checking, board.done, board.failed].flat().map((c) => c.label));
    for (const q of board.quietLines) for (const n of (/^((?:Helper \d+(?:, )?)+) on (.+):/.exec(q)?.[1] ?? '').match(/Helper \d+/g) ?? []) assert.ok(![...lane].some((l) => l.startsWith(`${n} on `) && q.includes(` on ${l.split(' on ')[1]}:`)), `${n} is in a lane and in the quiet line`);
  }), {numRuns: 300, seed: 33});
});
