import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {boardOf} from '../../apps/observatory/office-board.ts';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import type {OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {sceneOf, PALETTE, ROLE_TINT} from '../../apps/observatory/office-scene.ts';
import {COPY, FUN, screenStrings} from '../../apps/web/src/annex/copy.ts';

let n = 0;
const ev = (o: Partial<OfficeEvent>): OfficeEvent => ({v: 1, seq: ++n, ts: '2026-11-05T10:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o});
const NOW = '2026-11-05T10:01:00';
const E = [
  ev({sid: 'h:000000000001', kind: 'needs_you', code: 'permission', ts: '2026-11-05T10:00:50'}),
  ev({sid: 'h:000000000002', ts: '2026-11-05T10:00:55'}),
  ev({sid: 'h:000000000003', kind: 'subagent_start', ts: '2026-11-05T10:00:56'}),
  ev({sid: 'h:000000000004', kind: 'gate_result', ts: '2026-11-05T10:00:10', gate: {task: 'T-1', verdict: 'PASS', passed: 9, total: 12}}),
  ev({sid: 'h:000000000005', kind: 'gate_result', ts: '2026-11-05T10:00:20', gate: {task: 'T-2', verdict: 'FAIL', passed: 3, total: 12}}),
  ev({sid: 'h:000000000006', ts: '2026-11-05T08:00:00'}),
];

test('both views show the same helpers in the same states (board lanes = scene words)', () => {
  const s = reduce(E, NOW), b = boardOf(s), sc = sceneOf({...s, away: {blocked: 2}});
  const boardWords = new Map<string, string>();
  for (const c of b.needs) boardWords.set(c.key, c.tone === 'red' ? "didn't pass" : 'needs you');
  for (const c of b.working) boardWords.set(c.key, 'working');
  for (const c of b.checking) boardWords.set(c.key, 'checking');
  for (const c of b.done) boardWords.set(c.key, 'done');
  for (const c of b.failed) boardWords.set(c.key, "didn't pass");
  assert.deepEqual(new Map(sc.figures.map((f) => [f.key, f.word])), boardWords);
  assert.deepEqual(sc.figures.map((f) => f.label).sort(), [...b.needs, ...b.working, ...b.checking, ...b.done, ...b.failed].map((c) => c.label).sort());
  assert.equal(sc.quiet, b.quiet); assert.deepEqual(sc.guard, {count: 2});
  assert.equal(sceneOf({...s, away: {blocked: 0}}).guard, null);
  assert.deepEqual(sc.figures.filter((f) => f.loud).map((f) => f.word), ['needs you']);
});

test('spots: each helper has its own slot; checking and failed checks go to the checker, done to the lounge', () => {
  const sc = sceneOf(reduce(E, NOW));
  const by = (spot: string) => sc.figures.filter((f) => f.spot === spot);
  assert.deepEqual(by('checker').map((f) => f.word).sort(), ['checking', "didn't pass"]);
  assert.deepEqual(by('lounge').map((f) => f.word), ['done']);
  for (const spot of ['desk', 'checker', 'lounge']) assert.equal(new Set(by(spot).map((f) => f.slot)).size, by(spot).length);
});

test('truth rule: nobody is "done" without a gate PASS (any event order)', () => {
  const row = fc.record({k: fc.constantFrom('tool_end', 'turn_end', 'needs_you', 'subagent_start', 'subagent_end', 'gate_result', 'session_end'), s: fc.constantFrom('h:aaaaaaaaaaaa', 'h:bbbbbbbbbbbb'), v: fc.constantFrom('PASS', 'FAIL', 'PARTIAL')});
  fc.assert(fc.property(fc.array(row, {minLength: 1, maxLength: 30}), (rows) => {
    const evs: OfficeEvent[] = rows.map((r, i) => ({v: 1, seq: i + 1, ts: '2026-11-05T10:00:00', sid: r.s, project: 'Unfoolable', kind: r.k as OfficeEvent['kind'], tool: null, ok: null, code: r.k === 'needs_you' ? 'permission' : null, gate: r.k === 'gate_result' ? {task: 'T', verdict: r.v as 'PASS', passed: 1, total: 2} : null}));
    const done = sceneOf(reduce(evs, '2026-11-05T10:05:00')).figures.filter((f) => f.word === 'done').length;
    assert.ok(done <= evs.filter((e) => e.kind === 'gate_result' && e.gate!.verdict === 'PASS').length);
  }), {numRuns: 200, seed: 5});
  assert.equal(sceneOf(reduce([ev({ts: '2026-11-05T10:00:50'}), ev({kind: 'session_end', ts: '2026-11-05T10:00:55'})], NOW)).figures.filter((f) => f.word === 'done').length, 0);
});

test('words: the badge and the credit line exist, and the new words carry no jargon', () => {
  assert.equal(COPY.badge, 'Not graded');
  assert.match(FUN.credit, /LimeZu/); assert.match(FUN.credit, /never shared publicly/);
  assert.ok(screenStrings().includes(FUN.credit));
  const JARGON = ['hook', 'commit', 'diff', 'verdict', 'token', 'handoff', 'session', 'repo', 'eval', 'json', 'stderr', 'pid', 'verifier', 'gate'];
  assert.deepEqual(Object.values(FUN).filter((t) => t !== FUN.credit && JARGON.some((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(t))), []);
});

const at = (s: number) => `2026-11-05T10:00:${String(s).padStart(2, '0')}`;
const helper = (sid: string, tool: string, sec: number) => ev({sid, tool, ts: at(sec)});

test('stations by last tool: reading, commands and web only while the tool is under 30 s old; editing and old news stay at the desk', () => {
  const E2 = [helper('h:00000000000a', 'Read', 50), helper('h:00000000000b', 'Bash', 55), helper('h:00000000000c', 'WebSearch', 58), helper('h:00000000000d', 'Edit', 59), helper('h:00000000000e', 'Read', 20)];
  const sc = sceneOf(reduce(E2, '2026-11-05T10:01:00')); // 60 s on the clock: Read at :20 is 40 s old
  const spot = (sid: string) => sc.figures.find((f) => f.key === sid)!.spot;
  assert.deepEqual(['h:00000000000a', 'h:00000000000b', 'h:00000000000c', 'h:00000000000d'].map(spot), ['library', 'terminal', 'window', 'desk']);
  assert.equal(spot('h:00000000000e'), 'desk'); // still working (under 60 s) but its Read is 40 s old: back to the desk
  const stale = sceneOf(reduce([helper('h:00000000000a', 'Read', 40), ev({sid: 'h:00000000000a', kind: 'turn_end', ts: at(41)}), helper('h:00000000000a', 'Edit', 55)], '2026-11-05T10:01:00'));
  assert.equal(stale.figures[0]!.spot, 'desk');
  const old = sceneOf(reduce([helper('h:00000000000a', 'Read', 5), helper('h:00000000000a', 'Edit', 6)], '2026-11-05T10:00:50'));
  assert.equal(old.figures[0]!.spot, 'desk');
});

test('Researcher and Critic stand in the room ONLY while their run is live; every builder has its own colour', () => {
  const none = sceneOf(reduce([ev({ts: at(55)})], '2026-11-05T10:01:00'));
  assert.deepEqual(none.figures.filter((f) => f.role === 'researcher' || f.role === 'critic'), []);
  const run = [ev({sid: 'h:00000000000a', kind: 'prompt', tool: 'research', ts: at(50)}), ev({sid: 'h:00000000000b', kind: 'prompt', tool: 'critic', ts: at(52)}), ev({sid: 'h:00000000000b', ts: at(54)})];
  const live = sceneOf(reduce(run, '2026-11-05T10:01:00'));
  assert.deepEqual(live.figures.filter((f) => f.role === 'researcher' || f.role === 'critic').map((f) => [f.role, f.spot, f.tint]), [['researcher', 'library', ROLE_TINT.researcher], ['critic', 'meeting', ROLE_TINT.critic]]);
  const done = sceneOf(reduce([...run, ev({sid: 'h:00000000000a', kind: 'turn_end', ts: at(56)}), ev({sid: 'h:00000000000b', kind: 'turn_end', ts: at(57)})], '2026-11-05T10:01:00'));
  assert.deepEqual(done.figures.filter((f) => f.role === 'researcher' || f.role === 'critic'), []);
  const six = sceneOf(reduce(Array.from({length: 6}, (_, i) => ev({sid: `h:0000000000${i}0`, ts: at(55)})), '2026-11-05T10:01:00'));
  assert.equal(new Set(six.figures.map((f) => f.tint)).size, 6);
  assert.deepEqual(six.figures.map((f) => f.tint), [...PALETTE]);
});
