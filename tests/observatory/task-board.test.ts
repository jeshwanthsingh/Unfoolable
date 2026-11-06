import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSnapshot} from '../../apps/observatory/office-data.ts';
import {buildFloor} from '../../apps/observatory/office-floor.ts';
import {FLOOR, screenStrings} from '../../apps/web/src/annex/copy.ts';

const NOW = new Date(2026, 10, 5, 12, 0, 0);
const SECRET = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const JARGON = /\b(hook|commit|diff|verdict|token|handoff|session|repo|eval|json|stderr|pid|verifier|worktree|branch|card|gate)s?\b/i;
const BEFORE = '2026-11-05T01:00:00Z'; // a job made before the record below was written

// One dispatched job: meta.json in the vault, a record in its own work folder.
function job(vault: string, name: string, created: string, record?: object | string): void {
  const wt = mkdtempSync(join(tmpdir(), 'board-wt-'));
  if (record !== undefined) { mkdirSync(join(wt, '.claude')); writeFileSync(join(wt, '.claude/last-verify.json'), typeof record === 'string' ? record : JSON.stringify(record)); }
  mkdirSync(join(vault, 'dispatch', name), {recursive: true});
  writeFileSync(join(vault, 'dispatch', name, 'meta.json'), JSON.stringify({id: name, worktree: wt, branch: `b/${name}`, created, secret: SECRET}));
}
const emptyVault = (): string => mkdtempSync(join(tmpdir(), 'board-vault-'));
const board = (v: string): string[] => buildSnapshot(v, NOW).board.map((i) => i.text);
const local = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

test('a job is done ONLY when its own record says PASS and is newer than the job', () => {
  const v = emptyVault(), pass = '2026-11-05T10:11:25Z';
  job(v, 'a-pass', BEFORE, {verdict: 'PASS', timestamp: pass, reasons: [SECRET]});
  job(v, 'b-old', '2026-11-05T12:00:00Z', {verdict: 'PASS', timestamp: pass});
  job(v, 'c-fail', BEFORE, {verdict: 'FAIL', timestamp: pass});
  job(v, 'd-partial', BEFORE, {verdict: 'PARTIAL', timestamp: pass});
  job(v, 'e-none', BEFORE);
  job(v, 'f-garbled', BEFORE, 'nope {');
  job(v, 'g-html', BEFORE, {verdict: '<b>PASS</b>', timestamp: pass});
  const t = Object.fromEntries(board(v).map((x) => [x.split(':')[0], x]));
  assert.equal(t['a pass'], `a pass: done at ${local(new Date(pass))}`);
  for (const k of ['b old', 'd partial', 'e none', 'f garbled', 'g html']) assert.equal(t[k], `${k}: not done yet`, k);
  assert.equal(t['c fail'], `c fail: not done, something is broken (${local(new Date(pass))})`);
  assert.ok(!JSON.stringify(buildSnapshot(v, NOW)).includes('ABCDEFGHIJ'));
});

test('no jobs: the board is empty and nothing else changes', () => {
  assert.deepEqual(board(emptyVault()), []);
});

test('the reader words for the board are plain', () => {
  const v = emptyVault();
  job(v, 'x-one', BEFORE, {verdict: 'FAIL', timestamp: '2026-11-05T10:11:25Z'}); job(v, 'y-two', BEFORE);
  assert.deepEqual(board(v).filter((t) => JARGON.test(t)), []);
});

test('the checker helper appears only when a check ran today, solid if just now, faded if earlier', () => {
  const E: never[] = [], now = '2026-11-05T12:00:00';
  assert.equal(buildFloor(E, now).checker, null);
  assert.deepEqual(buildFloor(E, now, {checkAt: '2026-11-05T11:55:00'}).checker, {at: '11:55', fresh: true});
  assert.deepEqual(buildFloor(E, now, {checkAt: '2026-11-05T09:30:00'}).checker, {at: '09:30', fresh: false});
  assert.equal(buildFloor(E, now, {checkAt: '2026-11-04T23:00:00'}).checker, null);
});

test('a check recorded today in a listed repo puts the checker on the floor', () => {
  const v = emptyVault(), d = new Date(2026, 10, 5, 11, 58, 0);
  const wt = mkdtempSync(join(tmpdir(), 'board-wt-')); mkdirSync(join(wt, '.claude'));
  writeFileSync(join(wt, '.claude/last-verify.json'), JSON.stringify({verdict: 'PASS', timestamp: d.toISOString()}));
  assert.deepEqual(buildSnapshot(v, NOW, [{name: 'R', path: wt}]).floor.checker, {at: '11:58', fresh: true});
  assert.equal(buildSnapshot(v, NOW).floor.checker, null);
});

test('visitors: one per report file (at most two), none without files; secrets hidden', () => {
  const v = emptyVault(); mkdirSync(join(v, 'logs'));
  assert.deepEqual(buildSnapshot(v, NOW).floor.staff, []);
  for (const n of ['2026-11-03', '2026-11-04', '2026-11-05']) writeFileSync(join(v, 'logs', `garden-${n}.md`), `# Garden report ${n} ${SECRET}\n`);
  const s = buildSnapshot(v, NOW).floor.staff;
  assert.equal(s.length, 2);
  assert.ok(!JSON.stringify(s).includes('ABCDEFGHIJ'));
});

test('new picture words are on screen and carry no jargon', () => {
  for (const k of ['checkerAt', 'checkerEarlier', 'staff'] as const) { assert.ok(screenStrings().includes(FLOOR[k]), k); assert.ok(!JARGON.test(FLOOR[k]), k); }
});
