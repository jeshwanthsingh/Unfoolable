import test from 'node:test';
import assert from 'node:assert/strict';
import {readAsks} from '../../apps/turn/turn-asks.ts';

// Contract under test (pure, read only, never throws):
//   readAsks(fs, vault) -> {asks: Ask[]; unreadable: string[]}     reads <vault>/questions/ through fs.list and fs.read only.
//   Ask = {id, kind: 'answer'|'try', title, repo, card?, question?, why?, where?, options: string[], checklist: string[]}
//     id = the file name (with .json). repo = last path part, '' when absent. card/question/why/where are present only when the file gave them.
//     options and checklist are always arrays ([] when absent).
//   Caps after cleaning control and direction characters: title 120, question 400, why 300, where 200, card 120, each option/checklist line 120.
//   At most 4 options and 8 checklist lines (extra lines cut). Order: sorted by file name.
//   Names: ^[a-z0-9-]{1,60}\.json$. A file is read only if it is a regular file (fs.read gives null for a link or a folder) of at most 20480 chars.
//   Anything skipped is named in unreadable (the file name, cleaned, at most 60 chars). Only the first 20 entries (sorted) are looked at;
//   when more exist, the LAST unreadable entry is `${n} more files not read`. No questions folder: {asks: [], unreadable: []}.
type Fs = {read(p: string): string | null; list(p: string): string[] | null};
const V = '/vault';
const D = `${V}/questions`;
const J = JSON.stringify;
function fake(files: Record<string, unknown>, dirs: string[] = []) {
  const reads: string[] = [];
  const fs: Fs = {
    read: (p) => { reads.push(p); const v = files[p.startsWith(`${D}/`) ? p.slice(D.length + 1) : '\0']; return v === undefined ? null : typeof v === 'string' ? v : J(v); },
    list: (p) => (p === D ? [...Object.keys(files), ...dirs] : null),
  };
  return {fs, reads};
}
const ANSWER = {kind: 'answer', title: 'Which login?', repo: '/p/proj', card: 'login-card', question: 'Email or passkey?', why: 'It changes the data we keep.', options: ['Email', 'Passkey']};
const TRY = {kind: 'try', title: 'Try the export', repo: 'proj', where: 'http://localhost:5173', checklist: ['Click Export', 'Open the file']};

test('a good answer file and a good try file become asks, sorted by file name', () => {
  const {fs} = fake({'z-try.json': TRY, 'a-answer.json': ANSWER});
  assert.deepEqual(readAsks(fs, V), {
    asks: [
      {id: 'a-answer.json', kind: 'answer', title: 'Which login?', repo: 'proj', card: 'login-card', question: 'Email or passkey?', why: 'It changes the data we keep.', options: ['Email', 'Passkey'], checklist: []},
      {id: 'z-try.json', kind: 'try', title: 'Try the export', repo: 'proj', where: 'http://localhost:5173', options: [], checklist: ['Click Export', 'Open the file']},
    ],
    unreadable: [],
  });
});

test('optional fields left out stay out; repo is the last path part (trailing slash too)', () => {
  const {fs} = fake({'q1.json': {kind: 'answer', title: 'T', repo: '/a/b/c/', question: 'Q?', options: []}, 'q2.json': {kind: 'try', title: 'T'}});
  const {asks} = readAsks(fs, V);
  assert.deepEqual(asks[0], {id: 'q1.json', kind: 'answer', title: 'T', repo: 'c', question: 'Q?', options: [], checklist: []});
  assert.deepEqual(asks[1], {id: 'q2.json', kind: 'try', title: 'T', repo: '', options: [], checklist: []});
});

test('every text is capped: title 120, question 400, why 300, where 200, each option and checklist line 120, repo is a last part', () => {
  const {fs} = fake({
    'a.json': {kind: 'answer', title: 'T'.repeat(500), repo: `/x/${'r'.repeat(500)}`, question: 'Q'.repeat(900), why: 'W'.repeat(900), options: ['o'.repeat(500)]},
    'b.json': {kind: 'try', title: 't', where: 'H'.repeat(900), checklist: ['c'.repeat(500)]},
  });
  const [a, b] = readAsks(fs, V).asks;
  assert.equal(a!.title.length, 120);
  assert.equal(a!.question!.length, 400);
  assert.equal(a!.why!.length, 300);
  assert.equal(a!.options[0]!.length, 120);
  assert.ok(a!.repo.length <= 200 && !a!.repo.includes('/'));
  assert.equal(b!.where!.length, 200);
  assert.equal(b!.checklist[0]!.length, 120);
});

test('control and direction characters are removed from every text', () => {
  const dirty = (s: string) => s.replace(/(.)/, '$1\u0000\u0007‮⁧⁩‪');
  const {fs} = fake({'a.json': {kind: 'answer', title: dirty('Title'), repo: dirty('/p/repo'), question: dirty('Question'), why: dirty('Why'), options: [dirty('One')]}, 'b.json': {kind: 'try', title: 'x', where: dirty('Where'), checklist: [dirty('Step')]}});
  const [a, b] = readAsks(fs, V).asks;
  assert.deepEqual([a!.title, a!.repo, a!.question, a!.why, a!.options[0], b!.where, b!.checklist[0]], ['Title', 'repo', 'Question', 'Why', 'One', 'Where', 'Step']);
});

test('at most 4 options and 8 checklist lines: the extra lines are cut, the file is still shown', () => {
  const {fs} = fake({'a.json': {kind: 'answer', title: 'T', question: 'Q', options: ['1', '2', '3', '4', '5', '6']}, 'b.json': {kind: 'try', title: 'T', checklist: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}});
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks[0]!.options, ['1', '2', '3', '4']);
  assert.deepEqual(r.asks[1]!.checklist, ['1', '2', '3', '4', '5', '6', '7', '8']);
  assert.deepEqual(r.unreadable, []);
});

test('bad names are skipped and named: capital, underscore, space, no .json, wrong suffix, 61 characters; 60 is fine', () => {
  const ok = `${'a'.repeat(60)}.json`;
  const bad = ['Upper.json', 'under_score.json', 'has space.json', 'noext', 'x.json.bak', 'notes.md', `${'a'.repeat(61)}.json`, '.json'];
  const {fs} = fake({[ok]: TRY, ...Object.fromEntries(bad.map((n) => [n, TRY]))});
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), [ok]);
  assert.deepEqual([...r.unreadable].sort(), bad.map((n) => n.slice(0, 60)).sort());
});

test('a link or a folder named like a file (read gives null) is skipped and named', () => {
  const {fs} = fake({'good.json': TRY}, ['folder.json']);
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), ['good.json']);
  assert.deepEqual(r.unreadable, ['folder.json']);
});

test('a file over 20 KB is skipped and named; exactly 20480 characters is read', () => {
  const pad = (len: number) => { const base = J({kind: 'try', title: 'T', why: ''}); return J({kind: 'try', title: 'T', why: 'y'.repeat(len - base.length)}); };
  assert.equal(pad(20480).length, 20480);
  const {fs} = fake({'edge.json': pad(20480), 'huge.json': pad(20481)});
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), ['edge.json']);
  assert.deepEqual(r.unreadable, ['huge.json']);
});

test('bad json, json that is not an object, a wrong kind and a missing or non-string title are skipped and named', () => {
  const files = {
    'badjson.json': '{nope', 'array.json': '[1,2]', 'null.json': 'null', 'string.json': '"hi"', 'number.json': '7',
    'kind-wrong.json': {kind: 'ship', title: 'T'}, 'kind-missing.json': {title: 'T'}, 'kind-number.json': {kind: 1, title: 'T'},
    'title-missing.json': {kind: 'try'}, 'title-number.json': {kind: 'try', title: 5}, 'title-empty.json': {kind: 'try', title: ''},
  };
  const {fs} = fake({...files, 'ok.json': TRY});
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), ['ok.json']);
  assert.deepEqual([...r.unreadable].sort(), Object.keys(files).sort());
});

test('wrong types for fields are skipped and named: repo, card, question, why, where, options, checklist and their items', () => {
  const T = {kind: 'answer', title: 'T'};
  const files = {
    'repo-num.json': {...T, repo: 3}, 'card-obj.json': {...T, card: {}}, 'question-num.json': {...T, question: 1}, 'why-arr.json': {...T, why: ['x']},
    'where-num.json': {kind: 'try', title: 'T', where: 9}, 'options-str.json': {...T, options: 'a'}, 'options-item.json': {...T, options: ['a', 2]},
    'check-str.json': {kind: 'try', title: 'T', checklist: 'a'}, 'check-item.json': {kind: 'try', title: 'T', checklist: [null]},
  };
  const {fs} = fake({...files, 'ok.json': ANSWER});
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), ['ok.json']);
  assert.deepEqual([...r.unreadable].sort(), Object.keys(files).sort());
});

test('a file name in unreadable is cleaned and capped at 60', () => {
  const {fs} = fake({'bad‮name\u0007.json': TRY});
  assert.deepEqual(readAsks(fs, V).unreadable, ['badname.json']);
});

test('at most 20 files are read; the rest are not read and the last unreadable entry says how many', () => {
  const names = Array.from({length: 25}, (_, i) => `f${String(i).padStart(2, '0')}.json`);
  const {fs, reads} = fake(Object.fromEntries([...names].reverse().map((n) => [n, TRY])));
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), names.slice(0, 20));
  assert.ok(reads.length <= 20, `read ${reads.length}`);
  assert.deepEqual(r.unreadable, ['5 more files not read']);
});

test('no questions folder: no asks and nothing unreadable; an empty folder too', () => {
  assert.deepEqual(readAsks({read: () => null, list: () => null}, V), {asks: [], unreadable: []});
  assert.deepEqual(readAsks({read: () => null, list: () => []}, V), {asks: [], unreadable: []});
});

test('HTML and script text stays a plain string and is never changed', () => {
  const evil = '<script>alert(1)</script><img src=x onerror="x=1">&amp;';
  const {fs} = fake({'e.json': {kind: 'answer', title: evil, repo: evil, question: evil, why: evil, options: [evil]}});
  const a = readAsks(fs, V).asks[0]!;
  for (const v of [a.title, a.question, a.why, a.options[0]]) assert.equal(v, evil);
  assert.equal(typeof a.title, 'string');
});

test('a reader that meets a throwing fs does not throw out of readAsks for one bad file', () => {
  const fs: Fs = {list: () => ['a.json', 'b.json'], read: (p) => { if (p.endsWith('a.json')) throw new Error('boom'); return J(TRY); }};
  const r = readAsks(fs, V);
  assert.deepEqual(r.asks.map((a) => a.id), ['b.json']);
  assert.deepEqual(r.unreadable, ['a.json']);
});
