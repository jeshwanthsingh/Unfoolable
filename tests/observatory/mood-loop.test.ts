import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLine, type LogLine} from '../../apps/observatory/annex-events.ts';
import {buildFloor} from '../../apps/observatory/office-floor.ts';

const NOW = '2026-11-05T03:10:00';
const L = (ts: string, kind: LogLine['kind'], name: string, args?: string, extra: Partial<LogLine> = {}): LogLine =>
  ({ts, kind, name, session: 'aaaaaaaaaaaa', project: 'p', needsYou: false, ...(args === undefined ? {} : {args}), ...extra});
const desk = (events: LogLine[]) => buildFloor(events, NOW).desks[0]!;
const tools = (...a: (string | undefined)[]) => a.map((x, i) => L(`2026-11-05T03:0${6 + i}:30`, 'tool', 'Bash', x));

test('the reader keeps a short hex args and a true/false ok, and drops anything else', () => {
  const raw = (o: object) => JSON.stringify({ts: '2026-11-05T03:00:00', kind: 'tool', name: 'Bash', session: 'aaaaaaaaaaaa', project: 'p', ...o});
  assert.deepEqual([parseLine(raw({args: 'ab12cd34ef', ok: true}))?.args, parseLine(raw({args: 'ab12cd34ef', ok: true}))?.ok], ['ab12cd34ef', true]);
  assert.equal(parseLine(raw({ok: false}))?.ok, false);
  for (const bad of ['rm -rf /', '<b>', 'ZZZ', '', 'a'.repeat(17), 12]) assert.equal(parseLine(raw({args: bad}))?.args, undefined, String(bad));
  assert.equal(parseLine(raw({ok: 'yes'}))?.ok, undefined);
  const old = parseLine(raw({}));
  assert.ok(old && old.args === undefined && old.ok === undefined, 'old lines still parse');
});

test('the same step 3 times in a row is a faded guess: loop is true, the words say maybe, the state is untouched', () => {
  const d = desk(tools('aa11', 'aa11', 'aa11'));
  assert.equal(d.loop, true);
  assert.equal(d.state, 'working');
  assert.match(d.word, /^Maybe going in circles \(same step 3 times\)/);
});

test('3 failed steps with the same args also count; the latest 3 decide', () => {
  const fails = ['aa11', 'aa11', 'aa11'].map((a, i) => L(`2026-11-05T03:0${6 + i}:30`, 'tool_fail', 'Bash', a, {ok: false}));
  assert.equal(desk(fails).loop, true);
  assert.equal(desk(tools('aa11', 'aa11', 'aa11', 'bb22')).loop, false);
  assert.equal(desk(tools('cc33', 'aa11', 'aa11', 'aa11')).loop, true);
});

test('no guess without proof: two steps, different args, different tools, or no args at all', () => {
  assert.equal(desk(tools('aa11', 'aa11')).loop, false);
  assert.equal(desk(tools('aa11', 'bb22', 'aa11')).loop, false);
  assert.equal(desk(tools(undefined, undefined, undefined)).loop, false);
  const mixed = [L('2026-11-05T03:06:30', 'tool', 'Bash', 'aa11'), L('2026-11-05T03:07:30', 'tool', 'Read', 'aa11'), L('2026-11-05T03:08:30', 'tool', 'Bash', 'aa11')];
  assert.equal(desk(mixed).loop, false);
});

test('a desk that needs you or has finished keeps its own words', () => {
  const needs = [...tools('aa11', 'aa11', 'aa11'), L('2026-11-05T03:09:00', 'permission_request', '', undefined, {needsYou: true})];
  assert.equal(desk(needs).state, 'needs');
  assert.match(desk(needs).word, /^Waiting for you/);
  const done = [...tools('aa11', 'aa11', 'aa11'), L('2026-11-05T03:09:00', 'session_end', '')];
  assert.match(desk(done).word, /^Finished/);
});

test('the new words are plain', () => {
  assert.doesNotMatch(desk(tools('aa11', 'aa11', 'aa11')).word, /\b(loop|hash|args|retry|stuck)\b/i);
});
