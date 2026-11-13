import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {findPlaces, placeFile, winner, type Place} from '../../apps/turn/turn-roots.ts';
import {realFs} from '../../apps/turn/turn-server.ts';

type Fs = {read(path: string): string | null; list(path: string): string[] | null; mtime?(path: string): number | null; readTail?(path: string, maxChars: number): string | null};

// In-memory fake: folders exist implicitly (a folder lists the first path piece of every file under it). Only read/list/mtime exist.
const NOW = Date.now();
function fk(files: Record<string, string>, mt: Record<string, unknown> = {}): Fs {
  const m = new Map(Object.entries(files));
  return {
    read: (p) => (m.has(p) ? m.get(p)! : null),
    list: (p) => {
      const names = new Set<string>();
      for (const k of m.keys()) if (k.startsWith(p + '/')) names.add(k.slice(p.length + 1).split('/')[0]!);
      return names.size ? [...names] : null;
    },
    mtime: (p) => (p in mt ? (mt[p] as number) : NOW),
  };
}

const VF = 'last-' + 'verify.json';
const R = '/p/repo', WT = '/p/repo-wt', V = '/vault', ARC = `${V}/90-archive/worktrees`;
const gd = (e: string, text: string) => ({[`${R}/.git/worktrees/${e}/gitdir`]: text});
const live = (name: string, extra: Record<string, string> = {}) => ({...gd(name, `${WT}/${name}/.git\n`), [`${WT}/${name}/.claude/job.json`]: '{}', ...extra});
const PASS = JSON.stringify({verdict: 'PASS'});

test('placeFile: main and live use .claude, archived is flat', () => {
  assert.equal(placeFile({kind: 'main', root: R, name: '', label: 'the main folder'}, 'job.json'), `${R}/.claude/job.json`);
  assert.equal(placeFile({kind: 'live', root: `${WT}/a`, name: 'a', label: 'a build in progress'}, VF), `${WT}/a/.claude/${VF}`);
  assert.equal(placeFile({kind: 'archived', root: `${ARC}/2026-11-13-repo-a`, name: '2026-11-13-repo-a', label: 'x'}, 'card.md'), `${ARC}/2026-11-13-repo-a/card.md`);
});

test('findPlaces: no .git/worktrees means the main place only', () => {
  const r = findPlaces(fk({}), R, V);
  assert.deepEqual(r.places, [{kind: 'main', root: R, name: '', label: 'the main folder'}]);
  assert.deepEqual(r.unreadable, []);
});

test('findPlaces: live worktrees from git files, main first, in listing order', () => {
  const r = findPlaces(fk({...live('r2'), ...live('r1')}), R, V);
  assert.deepEqual(r.places.map((p) => [p.kind, p.root, p.name, p.label]), [
    ['main', R, '', 'the main folder'],
    ['live', `${WT}/r2`, 'r2', 'a build in progress'],
    ['live', `${WT}/r1`, 'r1', 'a build in progress'],
  ]);
  assert.deepEqual(r.unreadable, []);
});

test('findPlaces: empty, odd, elsewhere, dot-dot, two-level and gone ones are ignored silently', () => {
  const fs = fk({
    ...live('ok'),
    ...gd('empty', ''),
    ...gd('odd', 'gitdir: ' + `${WT}/odd/.git`), // not the plain path git writes in this file
    ...gd('rel', 'rel/.git\n'),
    ...gd('else', '/elsewhere/x/.git\n'),
    ...gd('dots', `${WT}/../evil/x/.git\n`),
    ...gd('deep', `${WT}/a/b/.git\n`),
    ...gd('sibling', '/p/repo-wt2/x/.git\n'),
    ...gd('gone', `${WT}/gone/.git\n`), // inside the right folder but the folder does not exist
    [`${WT}/evil/x/.claude/job.json`]: '{}', [`${WT}/a/b/.claude/job.json`]: '{}', '/elsewhere/x/.claude/job.json': '{}', '/p/evil/x/.claude/job.json': '{}', '/p/repo-wt2/x/.claude/job.json': '{}',
  });
  const r = findPlaces(fs, R, V);
  assert.deepEqual(r.places.map((p) => p.name), ['', 'ok']);
  assert.deepEqual(r.unreadable, []);
});

test('findPlaces: a listed entry whose gitdir file cannot be read is reported by project name only', () => {
  const r = findPlaces(fk({...live('ok'), [`${R}/.git/worktrees/bad/HEAD`]: 'x'}), R, V);
  assert.deepEqual(r.places.map((p) => p.name), ['', 'ok']);
  assert.deepEqual(r.unreadable, ['a build folder of repo']);
});

test('findPlaces: at most 100 worktree entries are looked at', () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 130; i++) Object.assign(files, live(`w${String(i).padStart(3, '0')}`));
  assert.equal(findPlaces(fk(files), R, V).places.length, 1 + 100);
});

test('findPlaces: archived folders matched by date and repo name, newest first, after main and live', () => {
  const f = (n: string) => ({[`${ARC}/${n}/${VF}`]: PASS});
  const fs = fk({
    ...live('w'),
    ...f('2026-11-01-repo-old'), ...f('2026-11-13-repo-new'), ...f('2026-11-13-repo-a-b-c'),
    ...f('2026-11-13-repo2-x'), ...f('2026-11-13-other-x'), ...f('2026-11-13-repo-'), ...f('11-13-repo-x'), ...f('x2026-11-13-repo-x'), ...f('2026-11-13-repo'), ...f('2026-1-13-repo-x'),
  });
  const r = findPlaces(fs, R, V);
  assert.deepEqual(r.places.map((p) => p.kind), ['main', 'live', 'archived', 'archived', 'archived']);
  const arch = r.places.filter((p) => p.kind === 'archived');
  assert.deepEqual(arch.map((p) => p.name), ['2026-11-13-repo-new', '2026-11-13-repo-a-b-c', '2026-11-01-repo-old']);
  assert.deepEqual(arch.map((p) => p.label), ['an archived build (2026-11-13)', 'an archived build (2026-11-13)', 'an archived build (2026-11-01)']);
  assert.equal(arch[0]!.root, `${ARC}/2026-11-13-repo-new`);
});

test('findPlaces: the repo name is matched literally (dots are not wildcards)', () => {
  const fs = fk({[`${ARC}/2026-11-13-axb-x/job.json`]: '{}', [`${ARC}/2026-11-13-a.b-x/job.json`]: '{}'});
  assert.deepEqual(findPlaces(fs, '/p/a.b', V).places.map((p) => p.name), ['', '2026-11-13-a.b-x']);
});

test('findPlaces: at most 200 archived folders, the newest names kept', () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 250; i++) files[`${ARC}/2026-11-${String(1 + (i % 28)).padStart(2, '0')}-repo-n${String(i).padStart(3, '0')}/job.json`] = '{}';
  files[`${ARC}/2026-12-31-repo-newest/job.json`] = '{}';
  const arch = findPlaces(fk(files), R, V).places.filter((p) => p.kind === 'archived');
  assert.equal(arch.length, 200);
  assert.equal(arch[0]!.name, '2026-12-31-repo-newest');
  const names = arch.map((p) => p.name);
  assert.deepEqual(names, [...names].sort().reverse());
});

test('findPlaces: hostile folder names are cleaned in name and label, a path is never in a label', () => {
  const evil = 'a‮b\u0007c⁦d';
  const fs = fk({
    ...gd('e', `${WT}/${evil}/.git\n`), [`${WT}/${evil}/.claude/job.json`]: '{}',
    [`${ARC}/2026-11-13-repo-x‮y\u0007/job.json`]: '{}',
  });
  const r = findPlaces(fs, R, V);
  const l = r.places.find((p) => p.kind === 'live')!, a = r.places.find((p) => p.kind === 'archived')!;
  assert.equal(l.name, 'abcd');
  assert.equal(l.label, 'a build in progress');
  assert.equal(a.label, 'an archived build (2026-11-13)');
  for (const p of r.places) {
    assert.ok(!p.label.includes('/'));
    assert.doesNotMatch(p.name, /[\u0000-\u001f‪-‮⁦-⁩]/u);
    assert.doesNotMatch(p.label, /[\u0000-\u001f‪-‮⁦-⁩]/u);
  }
});

// ---------- winner ----------

const main: Place = {kind: 'main', root: R, name: '', label: 'the main folder'};
const lv: Place = {kind: 'live', root: `${WT}/a`, name: 'a', label: 'a build in progress'};
const ar: Place = {kind: 'archived', root: `${ARC}/2026-11-13-repo-a`, name: '2026-11-13-repo-a', label: 'an archived build (2026-11-13)'};
const vf = (p: Place) => placeFile(p, VF);
const passAll = Object.fromEntries([main, lv, ar].map((p) => [vf(p), PASS]));

test('winner: the newest check record among PASS places', () => {
  assert.equal(winner(fk(passAll, {[vf(main)]: NOW - 1000, [vf(lv)]: NOW - 5000, [vf(ar)]: NOW - 9000}), [ar, lv, main]), main);
  assert.equal(winner(fk(passAll, {[vf(main)]: NOW - 5000, [vf(lv)]: NOW - 9000, [vf(ar)]: NOW - 1000}), [main, lv, ar]), ar);
});

test('winner: ties go live, then main, then archived, then the earlier in the list', () => {
  const fs = fk(passAll); // all the same mtime
  assert.equal(winner(fs, [ar, main, lv]), lv);
  assert.equal(winner(fs, [ar, main]), main);
  assert.equal(winner(fs, [ar]), ar);
  const lv2: Place = {...lv, root: `${WT}/b`, name: 'b'};
  assert.equal(winner(fk({...passAll, [vf(lv2)]: PASS}), [lv2, lv]), lv2);
});

test('winner: an unknown, negative, zero, future or non-number mtime counts as the oldest', () => {
  for (const bad of [null, undefined, -5, 0, NOW + 3_600_000, NaN, Infinity, '123' as unknown]) {
    const fs = fk(passAll, {[vf(main)]: NOW - 100_000, [vf(lv)]: bad}); // live would win a tie, but its time is not trusted
    assert.equal(winner(fs, [main, lv]), main, `mtime ${String(bad)}`);
  }
  const allBad = fk(passAll, {[vf(main)]: null, [vf(lv)]: -1, [vf(ar)]: NOW + 9e9});
  assert.equal(winner(allBad, [main, lv, ar]), lv); // all unknown: tie rule
  assert.equal(winner(fk(passAll, {[vf(main)]: NOW + 30_000, [vf(lv)]: NOW - 5000}), [main, lv]), main); // 30 s ahead is a small skew: still a time
});

test('winner: non-PASS, malformed and missing records are ignored; null when none', () => {
  const fs = fk({[vf(main)]: JSON.stringify({verdict: 'FAIL'}), [vf(lv)]: '{nope', [vf(ar)]: JSON.stringify({verdict: 'pass'})});
  assert.equal(winner(fs, [main, lv, ar]), null);
  assert.equal(winner(fk({}), [main, lv, ar]), null);
  assert.equal(winner(fk({}), []), null);
  assert.equal(winner(fk({[vf(main)]: JSON.stringify({verdict: 'FAIL'}), [vf(ar)]: PASS}), [main, lv, ar]), ar);
});

test('winner: a huge, array, null or invalid record is a place without a verdict', () => {
  const huge = JSON.stringify({verdict: 'PASS', pad: 'x'.repeat(200_001)});
  const fs = fk({[vf(main)]: huge, [vf(lv)]: '[{"verdict":"PASS"}]', [vf(ar)]: 'null'});
  assert.equal(winner(fs, [main, lv, ar]), null);
  assert.equal(winner(fk({[vf(main)]: huge, [vf(lv)]: PASS}), [main, lv]), lv);
});

test('winner: needs no fs.mtime at all (every time unknown, tie rule)', () => {
  const fs = {...fk(passAll), mtime: undefined};
  assert.equal(winner(fs as Fs, [main, ar, lv]), lv);
});

// ---------- fixes from the security review ----------

test('findPlaces: two git entries naming the same worktree give one place', () => {
  const r = findPlaces(fk({...live('a'), ...gd('a-again', `${WT}/a/.git\n`)}), R, V);
  assert.deepEqual(r.places.map((p) => p.name), ['', 'a']);
});

test('findPlaces: junk entries do not hide real worktrees (the cap counts only real places)', () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 150; i++) Object.assign(files, gd(`junk${i}`, 'not a path'));
  Object.assign(files, live('real1'), live('real2'));
  assert.deepEqual(findPlaces(fk(files), R, V).places.map((p) => p.name), ['', 'real1', 'real2']);
});

test('findPlaces: a live worktree without a .claude folder is not a place', () => {
  const r = findPlaces(fk({...gd('nc', `${WT}/nc/.git\n`), [`${WT}/nc/other.txt`]: 'x'}), R, V);
  assert.deepEqual(r.places.map((p) => p.name), ['']);
});

test('findPlaces: an archived folder that is not a real folder is not a place', () => {
  const files = {[`${ARC}/2026-11-13-repo-good/job.json`]: '{}', [`${ARC}/2026-11-12-repo-bad/job.json`]: '{}'};
  const base = fk(files);
  const fs: Fs = {...base, list: (p) => (p === `${ARC}/2026-11-12-repo-bad` ? null : base.list(p))};
  assert.deepEqual(findPlaces(fs, R, V).places.map((p) => p.name), ['', '2026-11-13-repo-good']);
});

test('findPlaces over the real filesystem: a symlinked .claude or a symlinked archive folder is not a place; real ones are', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'roots-')));
  const repo = join(root, 'proj'), wtDir = join(root, 'proj-wt'), vault = join(root, 'vault'), other = join(root, 'other');
  for (const d of [join(repo, '.git', 'worktrees', 'sym'), join(repo, '.git', 'worktrees', 'real'), join(wtDir, 'sym'), join(wtDir, 'real', '.claude'), join(vault, '90-archive', 'worktrees', '2026-11-13-proj-real'), other]) mkdirSync(d, {recursive: true});
  writeFileSync(join(other, VF), PASS);
  writeFileSync(join(repo, '.git', 'worktrees', 'sym', 'gitdir'), `${join(wtDir, 'sym')}/.git\n`);
  writeFileSync(join(repo, '.git', 'worktrees', 'real', 'gitdir'), `${join(wtDir, 'real')}/.git\n`);
  symlinkSync(other, join(wtDir, 'sym', '.claude')); // the worktree's .claude points at somebody else's records
  symlinkSync(other, join(vault, '90-archive', 'worktrees', '2026-11-12-proj-link')); // an archive entry that is a link
  const places = findPlaces(realFs, repo, vault).places;
  assert.deepEqual(places.map((p) => [p.kind, p.name]), [['main', ''], ['live', 'real'], ['archived', '2026-11-13-proj-real']]);
});
