import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {away, awayWindow, practiceLine} from '../../apps/observatory/office-away.ts';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import {fromLegacy, type OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {createLive} from '../../apps/observatory/office-live.ts';

const NOW = '2026-11-06T09:30:00';
let n = 0;
const ev = (o: Partial<OfficeEvent>): OfficeEvent => ({v: 1, seq: ++n, ts: '2026-11-05T23:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o});

test('window: yesterday 20:00 until today 08:00, or until now before 08:00', () => {
  assert.deepEqual(awayWindow(NOW), {from: '2026-11-05T20:00:00', to: '2026-11-06T08:00:00'});
  assert.deepEqual(awayWindow('2026-11-06T06:15:00'), {from: '2026-11-05T20:00:00', to: '2026-11-06T06:15:00'});
});

test('a built night: helpers, steps, the 9 of 12 result and a missed-news gap, all from events', () => {
  const A = 'h:aaaaaaaaaaaa', B = 'h:bbbbbbbbbbbb';
  const E = [ev({seq: 1, ts: '2026-11-05T19:00:00', sid: 'h:cccccccccccc'}), // before the window: not counted
    ev({seq: 2, ts: '2026-11-05T22:00:00', sid: A}), ev({seq: 3, ts: '2026-11-05T22:05:00', sid: A}), ev({seq: 4, ts: '2026-11-05T22:06:00', sid: B, project: 'AgentRunLab'}),
    ev({seq: 8, ts: '2026-11-05T23:14:00', sid: A}), // seq jumps by 3: news was missed
    ev({seq: 9, sid: 'h:gate00000001', kind: 'gate_result', ts: '2026-11-05T23:20:00', gate: {task: 'T-041', verdict: 'PASS', passed: 9, total: 12}}),
    ev({seq: 10, ts: '2026-11-06T08:30:00', sid: A})]; // after the window: not counted
  const a = away(E, NOW);
  assert.equal(a.helpers, 2);
  assert.equal(a.steps, 4);
  assert.deepEqual(a.results.map((r) => [r.project, r.text, r.passed]), [['Unfoolable', '9 of 12 passed', true]]);
  assert.deepEqual(a.gaps, ['I missed some news between 22:06 and 23:14.']);
  assert.equal(a.sentence, '2 helpers worked. 4 steps done.');
  assert.equal(away([], NOW).sentence, 'No news from last night.');
});

test('a gate result with no session of its own is given to the helper of the same project, which turns done', () => {
  const E = [ev({ts: '2026-11-05T22:00:00'}), ev({sid: 'h:gate00000001', kind: 'gate_result', ts: '2026-11-05T22:01:00', gate: {task: 'T', verdict: 'PASS', passed: 9, total: 12}})];
  const r = reduce(E, '2026-11-05T22:02:00');
  assert.equal(r.helpers.length, 1);
  assert.deepEqual([r.helpers[0]!.status, r.helpers[0]!.gate?.text], ['done', '9 of 12 passed']);
  const lone = reduce([E[1]!], '2026-11-05T22:02:00'); // no helper to give it to: kept on its own, never lost
  assert.equal(lone.helpers.length, 1);
});

test('REAL recorded sessions replayed as a night: the strip equals the reducer numbers', () => {
  const lines = readFileSync(new URL('./fixtures/office-day.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean);
  const E = fromLegacy(lines).map((e) => ({...e, ts: e.ts.replace(/T\d\d/, 'T23')}));
  const a = away(E, NOW), r = reduce(E.filter((e) => e.ts >= a.from && e.ts < a.to), a.to);
  assert.equal(a.helpers, r.helpers.length);
  assert.equal(a.steps, r.helpers.reduce((s, h) => s + h.steps, 0));
  assert.equal(a.steps, E.filter((e) => e.kind === 'tool_end').length);
  assert.equal(a.results.length, 0, 'the old log has no gate results, so there is nothing to report as passed');
});

test('property: the strip never disagrees with the events or the reducer, and never invents a result', () => {
  const kinds = ['tool_end', 'tool_end', 'turn_end', 'needs_you', 'subagent_start', 'subagent_end', 'gate_result', 'session_end'] as const;
  const one = fc.record({k: fc.constantFrom(...kinds), s: fc.constantFrom('h:aaaaaaaaaaaa', 'h:bbbbbbbbbbbb', 'h:gate00000001'), p: fc.constantFrom('Unfoolable', 'AgentRunLab'), v: fc.constantFrom('PASS', 'FAIL', 'PARTIAL'), t: fc.integer({min: 0, max: 8 * 3600}), pass: fc.integer({min: 0, max: 12})});
  fc.assert(fc.property(fc.array(one, {maxLength: 60}), fc.integer({min: 0, max: 3}), (rows, skip) => {
    let seq = 0;
    const E: OfficeEvent[] = rows.sort((a, b) => a.t - b.t).map((r) => {
      seq += 1 + (skip && seq % 7 === 0 ? skip : 0);
      const d = new Date(2026, 10, 5, 20, 0, 0); d.setSeconds(d.getSeconds() + r.t);
      const p = (x: number) => String(x).padStart(2, '0');
      const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      return {v: 1, seq, ts, sid: r.s, project: r.p, kind: r.k, tool: r.k === 'tool_end' ? 'Bash' : null, ok: r.k === 'tool_end' ? true : null, code: r.k === 'needs_you' ? 'permission' : null,
        gate: r.k === 'gate_result' ? {task: 'T', verdict: r.v as 'PASS', passed: r.pass, total: 12} : null};
    });
    const a = away(E, NOW), r = reduce(E, a.to);
    const gates = E.filter((e) => e.kind === 'gate_result');
    assert.equal(a.helpers, new Set(E.filter((e) => e.kind !== 'gate_result').map((e) => e.sid)).size);
    assert.equal(a.steps, E.filter((e) => e.kind === 'tool_end').length);
    assert.equal(a.results.length, gates.length);
    assert.equal(a.results.filter((x) => x.passed).length, gates.filter((g) => g.gate!.verdict === 'PASS').length);
    assert.ok(r.summary.done <= gates.filter((g) => g.gate!.verdict === 'PASS').length, 'done needs a gate PASS');
    assert.equal(a.gaps.length, r.gaps.length);
  }), {numRuns: 300, seed: 7});
});

test('practice card: newest scoreboard batch gives "9 of 12 passed" with a time', () => {
  const v = mkdtempSync(join(tmpdir(), 'prac-')); mkdirSync(join(v, 'logs')); mkdirSync(join(v, 'evals'));
  writeFileSync(join(v, 'logs/usage.jsonl'), '');
  const rows = Array.from({length: 12}, (_, i) => `2026-11-04,phase2-pilot3-haiku,s${i},c,r${i},true,safe,${i < 9},1,1`);
  writeFileSync(join(v, 'evals/scoreboard.csv'), 'date,batch,scenario,condition,run_id,valid_run,verdict,hidden_pass,hidden_passed,hidden_total\n2026-11-03,old-batch,s,c,r,true,safe,false,0,1\n' + rows.join('\n') + '\n');
  const live = createLive(join(v, 'logs/usage.jsonl')); const s = live.state(); live.stop();
  assert.deepEqual([s.practice?.passed, s.practice?.total], [9, 12]);
  assert.match(practiceLine(s.practice!), /^Practice tests: 9 of 12 passed, \d\d:\d\d$/);
});

test('scratch and tiny folders (r1, r2, tmp ...) never show in the away strip', () => {
  const E = [ev({ts: '2026-11-05T22:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable'}), ev({ts: '2026-11-05T22:01:00', sid: 'h:bbbbbbbbbbbb', project: 'r1'}), ev({ts: '2026-11-05T22:02:00', sid: 'h:cccccccccccc', project: 'scratch-2026-11-05-ab12'}),
    ev({sid: 'h:dddddddddddd', project: 'r2', kind: 'gate_result', ts: '2026-11-05T22:03:00', gate: {task: 'x', verdict: 'FAIL', passed: 0, total: 1}}),
    ev({sid: 'h:eeeeeeeeeeee', project: 'Unfoolable', kind: 'gate_result', ts: '2026-11-05T22:04:00', gate: {task: 'T', verdict: 'PASS', passed: 9, total: 12}})];
  const a = away(E, NOW);
  assert.deepEqual(a.results.map((r) => [r.project, r.text]), [['Unfoolable', '9 of 12 passed']]);
  assert.equal(a.helpers, 1);
});
