// Free steps of the kid test: (1) jargon linter, (2) reading-level report.
import test from 'node:test';
import assert from 'node:assert/strict';
import {screenStrings, COPY} from '../../apps/web/src/annex/copy.ts';
import {buildSnapshot} from '../../apps/observatory/office-data.ts';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const JARGON = ['hook', 'commit', 'diff', 'verdict', 'token', 'handoff', 'session', 'repo', 'eval', 'json', 'stderr', 'pid', 'verifier', 'cost'];
const hits = (t: string) => JARGON.filter((w) => new RegExp(`\\b${w}s?\\b`, 'i').test(t));

function syllables(w: string): number {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}
export function grade(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syl / words.length) - 15.59;
}

test('jargon linter: no technical word in any on-screen string', () => {
  const bad = screenStrings().flatMap((s) => hits(s).map((w) => `${w}: ${s}`));
  assert.deepEqual(bad, []);
});

test('jargon linter: also clean on the sentences the reader writes (empty and busy)', () => {
  const s = buildSnapshot(mkdtempSync(join(tmpdir(), 'kid-')), new Date(2026, 10, 5, 3, 0, 0));
  const all = [s.sentence, ...s.lastNight.map((i) => i.text), ...s.needsYou.map((i) => i.text)];
  assert.deepEqual(all.flatMap(hits), []);
});

test('reading level: about US grade 4 or lower (reported)', () => {
  const sample = [...screenStrings().filter((t) => t.length > 12), 'A helper on my project wants your OK.', 'Nothing needs you. Last news at 02:10.', '2 helpers worked. 40 steps done.'].map((t) => (/[.!?]$/.test(t) ? t : t + '.')).join(' ');
  const g = grade(sample);
  console.log(`Reading level (Flesch-Kincaid): grade ${g.toFixed(1)} over ${sample.split(/\s+/).length} words`);
  assert.ok(g <= 4.5, `grade ${g.toFixed(1)} is above 4.5`);
  assert.ok(COPY.panels.needs.title);
});
