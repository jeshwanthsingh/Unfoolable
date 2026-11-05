import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFloor, stationOf} from '../../apps/observatory/office-floor.ts';
import type {LogLine} from '../../apps/observatory/annex-events.ts';

const L = (ts: string, kind: LogLine['kind'], name = '', project = 'p', needsYou = false): LogLine => ({ts, kind, name, session: 'aaaaaaaaaaaa', project, needsYou});
const NOW = '2026-11-05T03:10:00';

test('the tool name decides the place', () => {
  assert.equal(stationOf(L('t', 'tool', 'Read')), 'bookshelf');
  assert.equal(stationOf(L('t', 'tool', 'Edit')), 'workbench');
  assert.equal(stationOf(L('t', 'tool', 'Bash')), 'terminal');
  assert.equal(stationOf(L('t', 'tool', 'WebFetch')), 'globe');
  assert.equal(stationOf(L('t', 'slash', 'verify')), 'checker');
  assert.equal(stationOf(L('t', 'tool', 'SomethingNew')), 'desk');
});

test('recent line is solid, older is a faded maybe, oldest is no news', () => {
  const at = (ts: string) => buildFloor([L(ts, 'tool', 'Bash')], NOW).desks[0]!;
  assert.equal(at('2026-11-05T03:09:00').state, 'working');
  assert.equal(at('2026-11-05T03:00:00').state, 'maybe');
  assert.match(at('2026-11-05T03:00:00').word, /^Maybe /);
  assert.equal(at('2026-11-05T01:00:00').state, 'quiet');
  assert.match(at('2026-11-05T01:00:00').word, /^No news since 01:00/);
});

test('needs you stays until later activity; a finished helper keeps its desk', () => {
  assert.equal(buildFloor([L('2026-11-05T03:00:00', 'permission_request', '', 'p', true)], NOW).desks[0]!.state, 'needs');
  assert.notEqual(buildFloor([L('2026-11-05T03:00:00', 'permission_request', '', 'p', true), L('2026-11-05T03:05:00', 'tool', 'Read')], NOW).desks[0]!.state, 'needs');
  const home = buildFloor([L('2026-11-05T02:00:00', 'tool', 'Edit'), L('2026-11-05T02:30:00', 'session_end')], NOW).desks[0]!;
  assert.equal(home.state, 'home');
  assert.equal(home.station, 'workbench');
});

test('one desk per project, guard counts only today', () => {
  const f = buildFloor([L('2026-11-04T23:00:00', 'hook_block', '', 'a'), L('2026-11-05T01:00:00', 'hook_block', '', 'a'), L('2026-11-05T02:00:00', 'tool', 'Read', 'b')], NOW);
  assert.equal(f.desks.length, 2);
  assert.deepEqual(f.guard, {count: 1, last: '01:00'});
});
