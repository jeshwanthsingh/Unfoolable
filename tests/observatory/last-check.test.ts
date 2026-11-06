import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSnapshot} from '../../apps/observatory/office-data.ts';

const NOW = new Date(2026, 10, 5, 3, 0, 0);
const SECRET = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const pad = (n: number): string => String(n).padStart(2, '0');
const local = (iso: string): string => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function repoWith(content?: string): {name: string; path: string} {
  const p = mkdtempSync(join(tmpdir(), 'lastcheck-repo-'));
  if (content !== undefined) { mkdirSync(join(p, '.claude')); writeFileSync(join(p, '.claude/last-verify.json'), content); }
  return {name: 'AgentRunLab', path: p};
}
const lines = (r: {name: string; path: string}): string[] =>
  buildSnapshot(mkdtempSync(join(tmpdir(), 'lastcheck-vault-')), NOW, [r]).results.map((i) => i.text).filter((t) => t.startsWith('Last save check'));

test('a recorded PASS reads "it works" with its local time, and nothing else from the file', () => {
  const ts = '2026-11-05T10:11:25Z';
  const r = repoWith(JSON.stringify({verdict: 'PASS', timestamp: ts, reasons: [SECRET], test_command: `echo ${SECRET}`}));
  assert.deepEqual(lines(r), [`Last save check (AgentRunLab): it works at ${local(ts)}`]);
  assert.ok(!JSON.stringify(buildSnapshot(mkdtempSync(join(tmpdir(), 'lastcheck-vault-')), NOW, [r])).includes('ABCDEFGHIJ'));
});

test('FAIL reads "something is broken"', () => {
  const ts = '2026-11-05T11:00:00Z';
  assert.deepEqual(lines(repoWith(JSON.stringify({verdict: 'FAIL', timestamp: ts}))), [`Last save check (AgentRunLab): something is broken at ${local(ts)}`]);
});

test('a missing, garbled or odd file reads "No save check yet"', () => {
  const none = ['Last save check (AgentRunLab): No save check yet'];
  assert.deepEqual(lines(repoWith()), none);
  assert.deepEqual(lines(repoWith('not json {')), none);
  assert.deepEqual(lines(repoWith(JSON.stringify({verdict: '<b>PASS</b>', timestamp: '2026-11-05T10:11:25Z'}))), none);
  assert.deepEqual(lines(repoWith(JSON.stringify({verdict: 'PASS', timestamp: 'yesterday'}))), none);
});

test('no repos given (the default) adds no line, so older callers are unchanged', () => {
  assert.equal(buildSnapshot(mkdtempSync(join(tmpdir(), 'lastcheck-vault-')), NOW).results.filter((i) => i.text.startsWith('Last save check')).length, 0);
});
