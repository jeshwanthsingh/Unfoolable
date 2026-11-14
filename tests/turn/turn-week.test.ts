import test from 'node:test';
import assert from 'node:assert/strict';
import {railWeek} from '../../apps/turn/turn-week.ts';

// Contract under test: railWeek(fs, {repos, vault, now, headOf, needYou, maps}) -> {strip, week}. Pure: reads through fs only.
//   now: ms since epoch. needYou: a number the server already counted (cards waiting + ships waiting), passed through to strip.needYou.
//   maps: {shipped, total}[] one per vault map; strip.mapShipped / mapTotal = sums over maps with total > 0, both null when none has pieces.
//   Window "now" = (now-7d, now], "before" = (now-14d, now-7d]. A date exactly on now-7d is "before"; after now, or at or before now-14d, counts nowhere.
//   A date is the gate record's "timestamp", last-ship.json "timestamp", job.json "started_at" (ISO text); anything else is ignored.
//   A ship counts when its verdict is PASS and its head equals the head in the same place's gate record (verdict PASS).
type Fs = {read(p: string): string | null; list(p: string): string[] | null; mtime?(p: string): number | null};
function fakeFs(files: Record<string, string>, dirs: string[] = []): Fs {
  const m = new Map(Object.entries(files));
  return {
    read: (p) => (m.has(p) ? m.get(p)! : null),
    list: (p) => { // like a real folder listing: the names of files AND of folders directly inside p
      const pre = `${p}/`, names = new Set<string>();
      for (const k of [...m.keys(), ...dirs]) if (k.startsWith(pre)) names.add(k.slice(pre.length).split('/')[0]!);
      return names.size || dirs.includes(p) ? [...names] : null;
    },
    mtime: () => 1,
  };
}

const NOW = Date.parse('2026-11-13T12:00:00Z');
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (days: number) => iso(NOW - days * DAY);
const V = '/vault';
const REPO = '/p/proj';
const H1 = 'a'.repeat(40), H2 = 'b'.repeat(40);
const J = JSON.stringify;
const VERIFY_FILE = 'last-' + 'verify.json';

// One place's records. main: <repo>/.claude/; live: <repo>-wt/<n>/.claude/ (plus git's worktree list file); archived: flat in the vault.
type Rec = {verify?: unknown; ship?: unknown; job?: unknown};
type PlaceSpec = {kind: 'main' | 'live' | 'archived'; n?: string} & Rec;
function world(places: PlaceSpec[]) {
  const files: Record<string, string> = {};
  const dirs: string[] = [];
  const put = (path: string, v: unknown) => { if (v !== undefined) files[path] = typeof v === 'string' ? v : J(v); };
  places.forEach((p, i) => {
    const n = p.n ?? `w${i}`;
    let dir: string;
    if (p.kind === 'main') dir = `${REPO}/.claude`;
    else if (p.kind === 'live') {
      const wt = `/p/proj-wt/${n}`;
      files[`${REPO}/.git/worktrees/${n}/gitdir`] = `${wt}/.git\n`;
      dirs.push(wt, `${wt}/.claude`);
      dir = `${wt}/.claude`;
    } else dir = `${V}/90-archive/worktrees/2026-11-0${(i % 9) + 1}-proj-${n}`;
    put(`${dir}/${VERIFY_FILE}`, p.verify); put(`${dir}/last-ship.json`, p.ship); put(`${dir}/job.json`, p.job);
    if (p.kind === 'archived') dirs.push(dir);
  });
  return fakeFs(files, dirs);
}
const run = (fs: Fs, o: {needYou?: number; maps?: {shipped: number; total: number}[]; now?: number} = {}) =>
  railWeek(fs, {repos: [REPO], vault: V, now: o.now ?? NOW, headOf: () => H1, needYou: o.needYou ?? 0, maps: o.maps ?? []});
const pass = (head: string, ts: string) => ({verdict: 'PASS', head, timestamp: ts});
const shipped = (head: string, ts: unknown) => ({verdict: 'PASS', head, timestamp: ts});
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const FIGURES = ['shipped', 'problems', 'stepIns', 'typicalTime', 'cost'] as const;

test('shape: strip and the five week figures, each {now, before, source}; an empty rail has no cost or time (null, never 0)', () => {
  const r = run(fakeFs({}), {needYou: 3});
  assert.deepEqual(Object.keys(r.week).sort(), [...FIGURES].sort());
  for (const k of FIGURES) {
    const f = r.week[k];
    assert.deepEqual(Object.keys(f).sort(), ['before', 'now', 'source']);
    assert.equal(typeof f.source, 'string');
    assert.ok(f.source.length > 0);
  }
  assert.deepEqual(r.strip, {building: 0, needYou: 3, mapShipped: null, mapTotal: null, costToday: null});
  assert.equal(r.week.typicalTime.now, null);
  assert.equal(r.week.cost.now, null);
  assert.equal(r.week.cost.before, null);
});

test('shipped with proof: only a ship PASS at the gate record head, dated in the window, split at the 7-day line', () => {
  const fs = world([
    {kind: 'main', verify: pass(H1, ago(1)), ship: shipped(H1, ago(1))}, // now
    {kind: 'live', verify: pass(H1, ago(6.9)), ship: shipped(H1, ago(6.9))}, // now
    {kind: 'archived', verify: pass(H1, ago(7)), ship: shipped(H1, ago(7))}, // exactly on the line: before
    {kind: 'archived', verify: pass(H1, ago(10)), ship: shipped(H1, ago(10))}, // before
    {kind: 'archived', verify: pass(H1, ago(14)), ship: shipped(H1, ago(14))}, // on the far edge: neither
    {kind: 'archived', verify: pass(H1, ago(20)), ship: shipped(H1, ago(20))}, // neither
  ]);
  const s = run(fs).week.shipped;
  assert.equal(s.now, 2);
  assert.equal(s.before, 2);
});

test('shipped: a gate PASS alone, a FAIL ship, another head, a future date, a bad date, no date, no gate record are not shipped', () => {
  const fs = world([
    {kind: 'main', verify: pass(H1, ago(1))}, // gate PASS alone
    {kind: 'live', verify: pass(H1, ago(1)), ship: {verdict: 'FAIL', head: H1, timestamp: ago(1)}},
    {kind: 'live', verify: pass(H1, ago(1)), ship: shipped(H2, ago(1))}, // other head
    {kind: 'live', verify: pass(H1, ago(1)), ship: shipped(H1, iso(NOW + DAY))}, // future
    {kind: 'live', verify: pass(H1, ago(1)), ship: shipped(H1, 'not a date')},
    {kind: 'live', verify: pass(H1, ago(1)), ship: {verdict: 'PASS', head: H1}}, // no date
    {kind: 'live', ship: shipped(H1, ago(1))}, // no gate record to match
  ]);
  const s = run(fs).week.shipped;
  assert.ok(s.now === 0 || s.now === null, `now is ${String(s.now)}`);
  assert.ok(s.before === 0 || s.before === null, `before is ${String(s.before)}`);
});

test('problems after shipping and steps in: always null with a source sentence, whatever the records say', () => {
  const fs = world([{kind: 'main', verify: pass(H1, ago(1)), ship: shipped(H1, ago(1)), job: {card: 'c', started_at: ago(1), problems: 5, step_ins: 9, stepped_in: 3}}]);
  const w = run(fs).week;
  for (const k of ['problems', 'stepIns'] as const) {
    assert.equal(w[k].now, null);
    assert.equal(w[k].before, null);
    assert.match(w[k].source, /nothing writes/i);
  }
});

test('typical time: median seconds of gate timestamp minus job started_at, builds with both, dated by the gate timestamp', () => {
  const t = (verifyDaysAgo: number, secs: number) => ({verify: pass(H1, iso(NOW - verifyDaysAgo * DAY)), job: {card: 'c', started_at: iso(NOW - verifyDaysAgo * DAY - secs * 1000)}});
  const odd = world([{kind: 'live', ...t(1, 600)}, {kind: 'live', ...t(2, 3000)}, {kind: 'live', ...t(3, 1200)}, {kind: 'archived', ...t(9, 100)}]);
  const a = run(odd).week.typicalTime;
  assert.equal(a.now, 1200);
  assert.equal(a.before, 100);
  const even = world([{kind: 'live', ...t(1, 600)}, {kind: 'live', ...t(2, 1200)}]);
  assert.equal(run(even).week.typicalTime.now, 900);
  assert.equal(run(even).week.typicalTime.before, null);
});

test('typical time: needs both timestamps; no job, no started_at, no gate timestamp, a gate time before the start, or a bad start gives nothing', () => {
  const fs = world([
    {kind: 'live', verify: pass(H1, ago(1))}, // no job
    {kind: 'live', verify: pass(H1, ago(1)), job: {card: 'c'}}, // no started_at
    {kind: 'live', verify: {verdict: 'PASS', head: H1}, job: {card: 'c', started_at: ago(2)}}, // no gate timestamp
    {kind: 'live', verify: pass(H1, ago(3)), job: {card: 'c', started_at: ago(2)}}, // checked before it started: never a negative time
    {kind: 'live', verify: pass(H1, ago(1)), job: {card: 'c', started_at: 'garbage'}},
  ]);
  const t = run(fs).week.typicalTime;
  assert.equal(t.now, null);
  assert.equal(t.before, null);
});

test('cost: sums numeric non-negative finite job.cost_usd dated by started_at, split now/before; null (never 0) when none exists; a recorded 0 stays 0', () => {
  const j = (cost: unknown, days: number): PlaceSpec => ({kind: 'archived', job: {card: 'c', started_at: ago(days), cost_usd: cost}});
  const fs = world([j(1.5, 1), j(2.25, 2), j(4, 9), j(0, 10), {kind: 'live', job: {card: 'c', started_at: ago(1)}}]);
  const c = run(fs).week.cost;
  assert.equal(c.now, 3.75);
  assert.equal(c.before, 4);
  const none = run(world([{kind: 'live', job: {card: 'c', started_at: ago(1)}}])).week.cost;
  assert.equal(none.now, null);
  assert.equal(none.before, null);
  assert.equal(run(world([j(0, 1)])).week.cost.now, 0);
});

test('cost today: only jobs started on the calendar day of the server clock; none gives null; a start after now is ignored', () => {
  const j = (cost: number, startedAt: string): PlaceSpec => ({kind: 'archived', job: {card: 'c', started_at: startedAt, cost_usd: cost}});
  const fs = world([j(1, '2026-11-13T10:00:00Z'), j(2, '2026-11-13T11:59:00Z'), j(8, '2026-11-12T10:00:00Z'), j(16, '2026-11-13T13:00:00Z')]);
  assert.equal(run(fs).strip.costToday, 3);
  assert.equal(run(world([j(8, '2026-11-12T10:00:00Z')])).strip.costToday, null);
  assert.equal(run(world([j(1, '2026-11-13T10:00:00Z')]), {now: NOW + 2 * DAY}).strip.costToday, null); // the clock decides what "today" is
});

test('building: only a LIVE worktree whose job record has started_at and no finished_at; main, archived, finished, unstarted do not count', () => {
  const fs = world([
    {kind: 'live', job: {card: 'a', started_at: ago(0.1)}}, // building
    {kind: 'live', job: {card: 'b', started_at: ago(0.2)}}, // building
    {kind: 'live', job: {card: 'c', started_at: ago(1), finished_at: ago(0.5)}}, // finished
    {kind: 'live', job: {card: 'd'}}, // not started
    {kind: 'live'}, // no job record
    {kind: 'main', job: {card: 'e', started_at: ago(0.1)}},
    {kind: 'archived', job: {card: 'f', started_at: ago(0.1)}},
  ]);
  assert.equal(run(fs).strip.building, 2);
  assert.equal(run(fs, {needYou: 4}).strip.needYou, 4);
});

test('archived builds count toward the weekly figures but never toward building', () => {
  const fs = world([{kind: 'archived', verify: pass(H1, ago(1)), ship: shipped(H1, ago(1)), job: {card: 'c', started_at: ago(1.01), cost_usd: 2}}]);
  const r = run(fs);
  assert.equal(r.strip.building, 0);
  assert.equal(r.week.shipped.now, 1);
  assert.equal(r.week.cost.now, 2);
});

test('map pieces: sums only maps that have pieces; null and null when no map has any', () => {
  const some = run(fakeFs({}), {maps: [{shipped: 2, total: 5}, {shipped: 1, total: 3}, {shipped: 0, total: 0}]}).strip;
  assert.equal(some.mapShipped, 3);
  assert.equal(some.mapTotal, 8);
  const none = run(fakeFs({}), {maps: [{shipped: 0, total: 0}]}).strip;
  assert.equal(none.mapShipped, null);
  assert.equal(none.mapTotal, null);
});

test('hostile and odd records never throw and never produce a made-up number', () => {
  const bad: string[] = ['not json', '[]', 'null', '"str"', '42', '{"cost_usd": 1e999, "started_at": 5}', J([1, 2]), '{', ''];
  const costs: unknown[] = ['5', 'NaN', 'Infinity', '-3', -1, true, null, [5], {a: 1}, 1e999, '1e3', '$4'];
  const starts: unknown[] = [5, 1e30, -1, [], {}, null, 'NaN', '9999-99-99', '2026-02-31T99:00:00Z', ago(1) + 'junk', 'Invalid Date'];
  const places: PlaceSpec[] = [];
  for (const b of bad) for (const kind of ['live', 'archived', 'main'] as const) places.push({kind, verify: b, ship: b, job: b});
  for (const c of costs) places.push({kind: 'live', job: {card: 'c', started_at: ago(1), cost_usd: c}, verify: pass(H1, ago(0.5)), ship: shipped(H1, c)});
  for (const s of starts) places.push({kind: 'live', job: {card: 'c', started_at: s, finished_at: s, cost_usd: 1}, verify: {verdict: 'PASS', head: H1, timestamp: s}, ship: shipped(H1, s)});
  places.push({kind: 'live', job: {card: ['x'], started_at: ago(1), cost_usd: 1e308}}, {kind: 'live', job: {card: {}, started_at: ago(1), cost_usd: 1e308}});
  const r = run(world(places), {needYou: NaN, maps: [{shipped: NaN, total: 4}, {shipped: -1, total: Infinity}]});
  for (const k of FIGURES) for (const side of ['now', 'before'] as const) {
    const v = r.week[k][side];
    assert.ok(v === null || isNum(v), `${k}.${side} is ${String(v)}`);
  }
  for (const v of [r.strip.building, r.strip.needYou, r.strip.mapShipped, r.strip.mapTotal, r.strip.costToday]) assert.ok(v === null || isNum(v), `strip value ${String(v)}`);
  // text, negatives and non-numbers where a number goes add nothing: one honest 2.5 among them is the whole sum
  const junk: PlaceSpec[] = costs.map((c, i) => ({kind: 'archived' as const, n: `j${i}`, job: {card: 'c', started_at: ago(1), cost_usd: c}})).filter((_, i) => !isNum(costs[i]) || costs[i] === 0);
  const one = world([...junk, {kind: 'archived', n: 'good', job: {card: 'c', started_at: ago(1), cost_usd: 2.5}}]);
  assert.equal(run(one).week.cost.now, 2.5);
});

test('a record dated after the server clock is ignored in the weekly figures', () => {
  const fut = (d: number) => iso(NOW + d * DAY);
  const fs = world([{kind: 'archived', verify: pass(H1, fut(2)), ship: shipped(H1, fut(1)), job: {card: 'c', started_at: fut(1), cost_usd: 7}}]);
  const w = run(fs).week;
  for (const k of ['cost', 'typicalTime'] as const) { assert.equal(w[k].now, null); assert.equal(w[k].before, null); }
  assert.ok(w.shipped.now === 0 || w.shipped.now === null);
});
