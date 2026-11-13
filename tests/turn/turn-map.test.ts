import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {buildMap, listMaps, type MapOpts} from '../../apps/turn/turn-map.ts';

type Fs = {read(path: string): string | null; list(path: string): string[] | null; mtime?(path: string): number | null; readTail?(path: string, maxChars: number): string | null};

// In-memory fake: only read/list/mtime exist, so the code under test cannot write.
const NOW = Date.now();
function fakeFs(files: Record<string, string>, dirs: string[] = []): Fs {
  const m = new Map(Object.entries(files));
  return {
    read: (p) => (m.has(p) ? m.get(p)! : null),
    list: (p) => {
      const names = [...m.keys()].filter((k) => k.slice(0, k.lastIndexOf('/')) === p).map((k) => k.slice(k.lastIndexOf('/') + 1));
      return names.length || dirs.includes(p) ? names : null;
    },
    mtime: () => NOW,
  };
}

const V = '/vault', A = '/approvals', R = '/r/main', HEAD = 'c'.repeat(40);
const VERIFY = 'last-' + 'verify.json';
const opts = (o: Partial<MapOpts> = {}): MapOpts => ({vault: V, approvalsDir: A, project: 'proj', headOf: () => HEAD, now: NOW, ...o});
type P = Record<string, unknown>;
const piece = (id: string, o: P = {}): P => ({id, name: `Name ${id}`, plain: `plain ${id}`, status: 'idea', needs: [], model: 'claude', ...o});
const mapJson = (pieces: P[], extra: P = {}): string => JSON.stringify({project: 'proj', repo: R, parts: [{id: 'p1', name: 'Part one', plain: 'part plain', pieces}], ...extra});
const MAP = `${V}/maps/proj.json`;
const J = (o: object): string => JSON.stringify(o);
const job = (o: object = {}) => ({[`${R}/.claude/job.json`]: J({card: 'c1', started_at: '2026-11-13T10:00:00Z', ...o})});
const verify = (v: string) => ({[`${R}/.claude/${VERIFY}`]: J({verdict: v})});
const ship = (v: string, head = HEAD) => ({[`${R}/.claude/last-ship.json`]: J({verdict: v, head})});
const first = (fs: Fs, o: Partial<MapOpts> = {}) => {
  const r = buildMap(fs, opts(o));
  assert.ok(r.ok, 'map should be ok');
  return r.parts[0]!.pieces;
};
const one = (files: Record<string, string>, pieceExtra: P = {card: 'c1'}) => first(fakeFs({[MAP]: mapJson([piece('a', pieceExtra)]), ...files}))[0]!;

// ---------- the seven rules ----------

test('rule 1: ship PASS at HEAD and job card equal: Shipped, from the ship record', () => {
  const p = one({...job(), ...verify('PASS'), ...ship('PASS')});
  assert.equal(p.state, 'Shipped');
  assert.equal(p.from, 'the ship record');
  assert.equal(p.isPlan, false);
});

test('rule 1 is not met for a ship PASS at another head: falls to Built', () => {
  const p = one({...job(), ...verify('PASS'), ...ship('PASS', 'd'.repeat(40))});
  assert.equal(p.state, 'Built');
  assert.equal(p.from, 'the check record');
});

test('rule 1 is not met when headOf is null or the ship verdict is not PASS', () => {
  const files = {[MAP]: mapJson([piece('a', {card: 'c1'})]), ...job(), ...verify('PASS'), ...ship('PASS')};
  assert.equal(first(fakeFs(files), {headOf: () => null})[0]!.state, 'Built');
  assert.equal(one({...job(), ...verify('PASS'), ...ship('FAIL')}).state, 'Built');
});

test('rule 2: verify PASS and job card equal: Built; a FAIL verdict is not Built', () => {
  const p = one({...job(), ...verify('PASS')});
  assert.equal(p.state, 'Built');
  assert.equal(p.from, 'the check record');
  assert.equal(one({...job(), ...verify('FAIL')}).state, 'Started, not finished');
});

test('Shipped and Built need the job card to equal the piece card', () => {
  const p = one({...job({card: 'other'}), ...verify('PASS'), ...ship('PASS')});
  assert.equal(p.isPlan, true);
  assert.equal(p.state, 'idea');
});

test('rule 3: job card equal, valid started_at, no finished_at: Started, not finished, from the job record', () => {
  const p = one({...job()});
  assert.equal(p.state, 'Started, not finished');
  assert.equal(p.from, 'the job record');
  assert.equal(p.isPlan, false);
});

test('rule 3 is not met with finished_at or a bad started_at', () => {
  assert.equal(one({...job({finished_at: '2026-11-13T11:00:00Z'})}).isPlan, true);
  for (const bad of ['yesterday', '', 5, null, {}, ['x']]) assert.equal(one({...job({started_at: bad})}).isPlan, true, JSON.stringify(bad));
});

test('rule 4: an archived card ending in -<card>.md: Finished (card archived), from the archive', () => {
  const p = one({[`${V}/90-archive/cards/2026-11-01-c1.md`]: 'x'});
  assert.equal(p.state, 'Finished (card archived)');
  assert.equal(p.from, 'the archive');
  assert.equal(p.isPlan, false);
  assert.equal(one({[`${V}/90-archive/cards/2026-11-01-xc1.md`]: 'x'}).isPlan, true);
  assert.equal(one({[`${V}/90-archive/cards/c1.md.bak`]: 'x'}).isPlan, true);
});

test('rule 5: card named in an approval record or the history: Approved, not started', () => {
  const rec = one({[`${A}/1.json`]: J({source: 'c1.md', repo: R})});
  assert.equal(rec.state, 'Approved, not started');
  assert.equal(rec.from, 'the approval records');
  const hist = one({[`${V}/logs/approvals-history.jsonl`]: J({card: 'c1'}) + '\n'});
  assert.equal(hist.state, 'Approved, not started');
  const custom = first(fakeFs({[MAP]: mapJson([piece('a', {card: 'c1'})]), '/h/hist.jsonl': J({card: 'c1'})}), {historyPath: '/h/hist.jsonl'})[0]!;
  assert.equal(custom.state, 'Approved, not started');
});

test('rule 5 also holds when the card file is in cards/ (approved wins over waiting)', () => {
  const p = one({[`${V}/cards/c1.md`]: 'repo: x\n', [`${A}/1.json`]: J({source: 'c1.md'})});
  assert.equal(p.state, 'Approved, not started');
});

test('rule 6: a fresh unapproved card in cards/: Waiting for your approval, from the cards folder; an old one too', () => {
  const p = one({[`${V}/cards/c1.md`]: 'repo: x\n'});
  assert.equal(p.state, 'Waiting for your approval');
  assert.equal(p.from, 'the cards folder');
  const old = first(fakeFs({[MAP]: mapJson([piece('a', {card: 'c1'})]), [`${V}/cards/c1.md`]: 'repo: x\n'}), {now: NOW + 30 * 86_400_000})[0]!;
  assert.equal(old.state, 'Waiting for your approval');
});

test('rule 7: no card gives the plan status, isPlan, from the map file (plan)', () => {
  for (const s of ['idea', 'queued', 'planned']) {
    const [p] = first(fakeFs({[MAP]: mapJson([piece('a', {status: s})])}));
    assert.equal(p!.state, s);
    assert.equal(p!.plan, s);
    assert.equal(p!.isPlan, true);
    assert.equal(p!.from, 'the map file (plan)');
    assert.equal(p!.card, undefined);
  }
});

test('rule 7: a card matching nothing keeps the plan state and carries the card name', () => {
  const p = one({}, {card: 'ghost', status: 'queued'});
  assert.equal(p.state, 'queued');
  assert.equal(p.isPlan, true);
  assert.equal(p.from, 'the map file (plan)');
  assert.equal(p.card, 'ghost');
});

test('rule 7: a missing or unknown status is "not recorded"', () => {
  for (const s of [undefined, 'bogus', 5, null, 'IDEA']) {
    const [p] = first(fakeFs({[MAP]: mapJson([piece('a', {status: s})])}));
    assert.equal(p!.state, 'not recorded', String(s));
    assert.equal(p!.isPlan, true);
  }
});
