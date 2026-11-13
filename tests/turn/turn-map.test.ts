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

test('order: Shipped beats Built beats Started beats archived beats approved beats waiting', () => {
  const all: Record<string, string> = {...job(), ...verify('PASS'), ...ship('PASS'), [`${V}/90-archive/cards/x-c1.md`]: 'x', [`${A}/1.json`]: J({source: 'c1.md'}), [`${V}/cards/c1.md`]: 'x'};
  const order: [string, string][] = [['Shipped', `${R}/.claude/last-ship.json`], ['Built', `${R}/.claude/${VERIFY}`], ['Started, not finished', `${R}/.claude/job.json`], ['Finished (card archived)', `${V}/90-archive/cards/x-c1.md`], ['Approved, not started', `${A}/1.json`], ['Waiting for your approval', `${V}/cards/c1.md`]];
  for (const [state, key] of order) {
    assert.equal(one(all).state, state);
    delete all[key];
  }
  assert.equal(one(all).state, 'idea');
});

test('a "shipped" or "built" status in the map file is never shown: not recorded', () => {
  for (const s of ['shipped', 'built', 'Shipped', 'Built']) {
    const p = one({}, {status: s});
    assert.equal(p.state, 'not recorded');
    assert.equal(p.isPlan, true);
  }
});

test('property: without records, Shipped/Built never appear, whatever the status text', () => {
  fc.assert(fc.property(fc.oneof(fc.string(), fc.constantFrom('shipped', 'built', 'Shipped', 'idea', 'queued', 'planned')), fc.option(fc.string(), {nil: undefined}), (status, card) => {
    const r = buildMap(fakeFs({[MAP]: mapJson([piece('a', {status, ...(card !== undefined ? {card} : {})})])}), opts());
    if (!r.ok) return true;
    return r.parts.every((pt) => pt.pieces.every((x) => x.state !== 'Shipped' && x.state !== 'Built'));
  }), {numRuns: 100});
});

// ---------- records come only from the map's repo ----------

test('a job record of ANOTHER repo path never matches', () => {
  const p = one({'/r/other/.claude/job.json': J({card: 'c1', started_at: '2026-11-13T10:00:00Z'}), [`/r/other/.claude/${VERIFY}`]: J({verdict: 'PASS'})});
  assert.equal(p.isPlan, true);
  assert.equal(p.state, 'idea');
});

test('an agent-written job.json with the card equal but wrong types does not throw', () => {
  for (const j of [{card: 'c1', started_at: 5, finished_at: {}}, {card: 'c1', started_at: ['x'], finished_at: [1]}, {card: ['c1']}, {card: 'c1', started_at: null}]) {
    const p = one({[`${R}/.claude/job.json`]: J(j), ...verify('PASS')});
    assert.ok(['Built', 'idea'].includes(p.state), p.state);
  }
  for (const text of ['[]', 'null', '"x"', '{bad', '']) assert.doesNotThrow(() => first(fakeFs({[MAP]: mapJson([piece('a', {card: 'c1'})]), [`${R}/.claude/job.json`]: text, [`${R}/.claude/last-ship.json`]: text, [`${R}/.claude/${VERIFY}`]: text})));
});

// ---------- needs / blocked ----------

test('blockedBy lists needed pieces not Built, Shipped or Finished; a missing id is blocked too', () => {
  const pieces = [piece('a', {card: 'c1'}), piece('b', {card: 'c2'}), piece('c', {card: 'c3'}), piece('d'), piece('e', {needs: ['a', 'b', 'c', 'd', 'ghost']})];
  const fs = fakeFs({[MAP]: mapJson(pieces), ...job({card: 'c1'}), ...verify('PASS'), [`${V}/90-archive/cards/x-c2.md`]: 'x'});
  const e = first(fs).find((p) => p.id === 'e')!;
  assert.deepEqual(e.needs, ['a', 'b', 'c', 'd', 'ghost']);
  assert.deepEqual([...e.blockedBy].sort(), ['c', 'd', 'ghost']);
  const ok = first(fakeFs({[MAP]: mapJson([piece('a', {card: 'c1'}), piece('z', {needs: ['a']})]), ...job(), ...verify('PASS')})).find((p) => p.id === 'z')!;
  assert.deepEqual(ok.blockedBy, []);
});

test('blockedBy finds a needed piece in another part, and Shipped counts as done', () => {
  const m = J({project: 'proj', repo: R, parts: [{id: 'p1', name: 'one', plain: '', pieces: [piece('a', {card: 'c1'})]}, {id: 'p2', name: 'two', plain: '', pieces: [piece('b', {needs: ['a']})]}]});
  const r = buildMap(fakeFs({[MAP]: m, ...job(), ...verify('PASS'), ...ship('PASS')}), opts());
  assert.ok(r.ok);
  assert.deepEqual(r.parts[1]!.pieces[0]!.blockedBy, []);
  const r2 = buildMap(fakeFs({[MAP]: m}), opts());
  assert.ok(r2.ok);
  assert.deepEqual(r2.parts[1]!.pieces[0]!.blockedBy, ['a']);
});

// ---------- shape, names, caps, hardening ----------

test('a good map returns project, repo, parts and piece fields', () => {
  const r = buildMap(fakeFs({[MAP]: mapJson([piece('a', {model: 'codex', needs: ['x']})])}), opts());
  assert.ok(r.ok);
  assert.equal(r.project, 'proj');
  assert.equal(r.repo, R);
  assert.deepEqual(r.parts.map((p) => [p.id, p.name, p.plain]), [['p1', 'Part one', 'part plain']]);
  const p = r.parts[0]!.pieces[0]!;
  assert.deepEqual([p.id, p.name, p.plain, p.model, p.plan], ['a', 'Name a', 'plain a', 'codex', 'idea']);
});

test('model must be claude, codex or either, else not recorded', () => {
  for (const m of ['claude', 'codex', 'either']) assert.equal(first(fakeFs({[MAP]: mapJson([piece('a', {model: m})])}))[0]!.model, m);
  for (const m of ['gpt', undefined, 5, 'Claude']) assert.equal(first(fakeFs({[MAP]: mapJson([piece('a', {model: m})])}))[0]!.model, 'not recorded');
});

test('buildMap: missing file is missing; huge, bad json, non-object, no parts array are unreadable', () => {
  assert.deepEqual(buildMap(fakeFs({}), opts()), {ok: false, why: 'missing'});
  for (const t of ['x'.repeat(200_001), '{bad', '[]', 'null', '"s"', '5', '{}', '{"parts":"no"}', '{"parts":{}}', '']) assert.deepEqual(buildMap(fakeFs({[MAP]: t}), opts()), {ok: false, why: 'unreadable'}, t.slice(0, 20));
});

test('buildMap: a bad project name is unreadable and reads no file', () => {
  const reads: string[] = [];
  const fs: Fs = {read: (p) => { reads.push(p); return mapJson([piece('a')]); }, list: () => null};
  for (const n of ['../x', 'A', 'a b', '', 'x'.repeat(41), 'a/b', 'a.json']) assert.deepEqual(buildMap(fs, opts({project: n})), {ok: false, why: 'unreadable'}, n);
  assert.deepEqual(reads, []);
});

test('text is cleaned of control and bidi characters and capped (name 80, plain 200)', () => {
  const evil = 'a‮b\u0007c⁦d\u0000e\nf';
  const [p] = first(fakeFs({[MAP]: mapJson([piece('a', {name: evil + 'n'.repeat(200), plain: evil + 'p'.repeat(500)})])}));
  for (const s of [p!.name, p!.plain]) assert.ok(!/[\p{C}‪-‮⁦-⁩]/u.test(s), JSON.stringify(s));
  assert.ok(p!.name.length <= 80 && p!.name.length > 40);
  assert.ok(p!.plain.length <= 200 && p!.plain.length > 100);
  const r = buildMap(fakeFs({[MAP]: JSON.stringify({project: 'proj', repo: R, parts: [{id: 'p1', name: evil, plain: evil, pieces: []}]})}), opts());
  assert.ok(r.ok);
  assert.ok(!/[\p{C}‪-‮⁦-⁩]/u.test(r.parts[0]!.name + r.parts[0]!.plain));
});

test('markup in text stays text (returned as is, never altered into html)', () => {
  const [p] = first(fakeFs({[MAP]: mapJson([piece('a', {name: '<img src=x onerror=alert(1)>'})])}));
  assert.equal(p!.name, '<img src=x onerror=alert(1)>');
});

test('pieces with a bad id or a non-object are skipped; others stay', () => {
  const bad = ['A', 'a b', '', 'x'.repeat(41), '../x', 5, null, undefined];
  const pieces: unknown[] = [...bad.map((i) => ({id: i, name: 'n', plain: 'p', status: 'idea', needs: [], model: 'claude'})), null, 'str', 5, [], piece('good')];
  const r = buildMap(fakeFs({[MAP]: JSON.stringify({project: 'proj', repo: R, parts: [{id: 'p1', name: 'n', plain: 'p', pieces}]})}), opts());
  assert.ok(r.ok);
  assert.deepEqual(r.parts[0]!.pieces.map((p) => p.id), ['good']);
});

test('caps: 12 parts, 40 pieces per part, 20 needs', () => {
  const parts = Array.from({length: 15}, (_, i) => ({id: `p${i}`, name: 'n', plain: 'p', pieces: Array.from({length: 45}, (_, k) => piece(`x${k}`, k === 0 ? {needs: Array.from({length: 30}, (_, n) => `n${n}`)} : {}))}));
  const r = buildMap(fakeFs({[MAP]: JSON.stringify({project: 'proj', repo: R, parts})}), opts());
  assert.ok(r.ok);
  assert.equal(r.parts.length, 12);
  assert.ok(r.parts.every((p) => p.pieces.length === 40));
  assert.equal(r.parts[0]!.pieces[0]!.needs.length, 20);
});

test('an empty parts array is ok with no parts', () => {
  const r = buildMap(fakeFs({[MAP]: J({project: 'proj', repo: R, parts: []})}), opts());
  assert.ok(r.ok);
  assert.deepEqual(r.parts, []);
});

test('buildMap never throws on odd shapes of parts and pieces', () => {
  fc.assert(fc.property(fc.jsonValue(), (v) => {
    for (const text of [JSON.stringify({project: 'proj', repo: R, parts: v}), JSON.stringify({project: 'proj', repo: R, parts: [v, {pieces: v}, {id: 'a', pieces: [v]}]}), JSON.stringify(v)]) buildMap(fakeFs({[MAP]: text}), opts());
    return true;
  }), {numRuns: 100});
});

// ---------- trust: the records must be the ones of THIS card, in a repo the server watches (security review) ----------

test('a map whose repo is not one the server watches reads no records, so it cannot forge Built or Shipped', () => {
  const files = {[MAP]: mapJson([piece('a', {card: 'c1'})]), ...job(), ...verify('PASS'), ...ship('PASS')};
  assert.equal(first(fakeFs(files), {repos: ['/r/other']})[0]!.state, 'idea');
  assert.equal(first(fakeFs(files), {repos: [R]})[0]!.state, 'Shipped');
  assert.equal(first(fakeFs(files), {repos: ['/r/other', R + '/']})[0]!.state, 'Shipped');
  assert.equal(first(fakeFs({...files, [MAP]: mapJson([piece('a', {card: 'c1'})], {repo: R + '/../main2'})}), {repos: [R]})[0]!.state, 'idea');
});

test('Built needs the check PASS to be for this job: different card hashes in the two records mean not Built', () => {
  const A = 'a'.repeat(64), B = 'b'.repeat(64);
  const mk = (jh: string, vh: string) => ({[`${R}/.claude/job.json`]: J({card: 'c1', started_at: '2026-11-13T10:00:00Z', card_sha256: jh}), [`${R}/.claude/${VERIFY}`]: J({verdict: 'PASS', card_sha256: vh}), ...ship('PASS')});
  const old = one(mk(A, B)); // an old PASS and a newly started card
  assert.equal(old.state, 'Started, not finished');
  assert.equal(old.from, 'the job record');
  assert.equal(one(mk(A, A)).state, 'Shipped');
});

test('a ship PASS at the current head never makes a card Shipped when it is not Built', () => {
  assert.equal(one({...job(), ...ship('PASS')}).state, 'Started, not finished');
});

test('a repeated piece id is dropped: the first one wins', () => {
  const pieces = first(fakeFs({[MAP]: mapJson([piece('a', {name: 'First'}), piece('a', {name: 'Second'})])}));
  assert.deepEqual(pieces.map((p) => p.name), ['First']);
});

// ---------- listMaps ----------

test('listMaps: names of maps/*.json, safe names only, sorted, at most 50', () => {
  const files: Record<string, string> = {};
  for (const n of ['zeta', 'alpha', 'Bad', 'has space', 'x'.repeat(41), 'ok-1']) files[`${V}/maps/${n}.json`] = '{}';
  files[`${V}/maps/notes.txt`] = 'x';
  files[`${V}/maps/.json`] = '{}';
  assert.deepEqual(listMaps(fakeFs(files), V), ['alpha', 'ok-1', 'zeta']);
  assert.deepEqual(listMaps(fakeFs({}), V), []);
  const many: Record<string, string> = {};
  for (let i = 0; i < 80; i++) many[`${V}/maps/m${String(i).padStart(3, '0')}.json`] = '{}';
  const got = listMaps(fakeFs(many), V);
  assert.equal(got.length, 50);
  assert.deepEqual(got, [...got].sort());
});
