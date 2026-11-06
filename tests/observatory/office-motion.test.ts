import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {chimeDue, look, poseOf, shouldAnimate} from '../../apps/observatory/office-motion.ts';

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) ? false : 'page not built (npx vite build --config apps/observatory/vite.config.ts)';
const p2 = (x: number) => String(x).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

test('motion rule: only within 30 s of a real event, never with reduced motion, never with no news', () => {
  assert.equal(shouldAnimate(0, false), true);
  assert.equal(shouldAnimate(30, false), true);
  assert.equal(shouldAnimate(31, false), false);
  assert.equal(shouldAnimate(2, true), false);
  assert.equal(shouldAnimate(null, false), false);
});

test('looks: the same project always looks the same; different projects mostly differ; poses follow the card colour', () => {
  assert.deepEqual(look('Unfoolable'), look('Unfoolable'));
  const looks = new Set(['Unfoolable', 'AgentRunLab', 'Muse Guard', 'Website', 'Proof Lab', 'extra-night'].map((p) => JSON.stringify(look(p))));
  assert.ok(looks.size >= 5);
  for (const p of ['Unfoolable', 'x']) { const l = look(p); assert.ok(l.hue >= 0 && l.hue < 360 && l.body < 4 && l.hat < 4); }
  assert.deepEqual((['blue', 'amber', 'purple', 'green', 'red', 'grey'] as const).map(poseOf), ['typing', 'waiting', 'checking', 'passed', 'stuck', 'quiet']);
});

test('chime: only for a card that ENTERS Needs you, never on the first load or for one already there', () => {
  assert.equal(chimeDue(null, ['h:a']), false);
  assert.equal(chimeDue(new Set(['h:a']), ['h:a']), false);
  assert.equal(chimeDue(new Set(['h:a']), ['h:a', 'h:b']), true);
  assert.equal(chimeDue(new Set(), []), false);
});

async function withBoard(fresh: boolean, reducedMotion: 'reduce' | 'no-preference', fn: (page: import('playwright-core').Page) => Promise<void>) {
  const v = mkdtempSync(join(tmpdir(), 'motion-')); mkdirSync(join(v, 'logs'));
  const ts = stamp(fresh ? new Date() : new Date(Date.now() - 3 * 3600_000));
  let seq = 0;
  const L = (sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts, sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(join(v, 'logs/office-v1.jsonl'), L('h:aaaaaaaaaaaa', 'command-center', 'tool_end', {tool: 'Edit', ok: true}) + L('h:bbbbbbbbbbbb', 'coding-agent-crash-tests', 'needs_you', {code: 'permission'}) + L('h:cccccccccccc', 'muse-guard', 'subagent_start'));
  const r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl')});
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({viewport: {width: 1280, height: 900}, reducedMotion})).newPage();
    await page.goto(r.url); await page.waitForSelector('.ob-card'); await page.waitForTimeout(1200);
    await fn(page);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
}

test('characters are decoration: hidden from screen readers, one per card, sound off by default', {skip}, async () => {
  await withBoard(false, 'no-preference', async (page) => {
    assert.equal(await page.locator('.ob-char').count(), await page.locator('.ob-card').count());
    assert.equal(await page.locator('.ob-char:not([aria-hidden="true"])').count(), 0);
    assert.equal(await page.getByRole('button', {name: 'Sound is off'}).getAttribute('aria-pressed'), 'false');
  });
});

test('fresh news: characters move; reduced-motion setting: they do not; old news: still', {skip}, async () => {
  const bobbing = (page: import('playwright-core').Page) => page.evaluate(() => [...document.querySelectorAll('.ob-char')].filter((e) => getComputedStyle(e).animationName !== 'none').length);
  await withBoard(true, 'no-preference', async (page) => assert.ok(await bobbing(page) >= 1, 'a fresh event should move at least one character'));
  await withBoard(true, 'reduce', async (page) => assert.equal(await bobbing(page), 0));
  await withBoard(false, 'no-preference', async (page) => assert.equal(await bobbing(page), 0));
});

test('frozen log: 60 s of identical pictures', {skip}, async () => {
  const seconds = Number(process.env.OFFICE_MOTION_SECONDS ?? 60);
  await withBoard(false, 'no-preference', async (page) => {
    const mask = [page.locator('.ob-fresh')], frames: Buffer[] = [];
    for (let t = 0; t <= seconds; t += 4) { frames.push(await page.screenshot({fullPage: true, mask})); await page.waitForTimeout(4000); }
    assert.ok(frames.length >= Math.floor(seconds / 4));
    assert.ok(frames.every((f) => f.equals(frames[0]!)), `the picture changed within ${seconds} s with no new news`);
  });
});
