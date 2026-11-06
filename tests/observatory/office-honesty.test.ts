import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium, type Browser} from 'playwright-core';
import fc from 'fast-check';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {boardOf} from '../../apps/observatory/office-board.ts';
import {practiceLine} from '../../apps/observatory/office-away.ts';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import type {OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {judge} from '../../scripts/office-kid-test.ts';

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const FIX = new URL('./fixtures/', import.meta.url).pathname;
const p2 = (x: number) => String(x).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

// A fixed little office: one helper working, one needing you, one checking, one done (9 of 12), and a night with a failed check.
function vault(frozen: boolean) {
  const v = mkdtempSync(join(tmpdir(), 'honest-')); mkdirSync(join(v, 'logs')); mkdirSync(join(v, 'evals'));
  const now = stamp(new Date()), old = stamp(new Date(Date.now() - 180_000)), night = new Date(); night.setDate(night.getDate() - 1); night.setHours(22, 0, 0, 0);
  let seq = 0;
  const L = (ts: string, sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts, sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  const lines = [L(stamp(night), 'h:eeeeeeeeeeee', 'extra-night', 'tool_end', {tool: 'Bash', ok: true}), L(stamp(night), 'h:eeeeeeeeeeee', 'extra-night', 'tool_end', {tool: 'Edit', ok: true}),
    L(stamp(night), 'h:ffffffffffff', 'extra-night', 'gate_result', {gate: {task: 'T-1', verdict: 'FAIL', passed: 3, total: 12}}),
    L(old, 'h:bbbbbbbbbbbb', 'coding-agent-crash-tests', 'needs_you', {code: 'permission'}),
    L(old, 'h:dddddddddddd', 'jeshwanth.com', 'tool_end', {tool: 'Bash', ok: true}),
    L(old, 'h:111111111111', 'jeshwanth.com', 'gate_result', {gate: {task: 'T-2', verdict: 'PASS', passed: 9, total: 12}})];
  if (!frozen) lines.push(L(now, 'h:aaaaaaaaaaaa', 'command-center', 'tool_end', {tool: 'Edit', ok: true}), L(now, 'h:cccccccccccc', 'muse-guard', 'subagent_start'));
  writeFileSync(join(v, 'logs/office-v1.jsonl'), lines.join(''));
  writeFileSync(join(v, 'evals/scoreboard.csv'), 'date,batch,scenario,condition,run_id,valid_run,verdict,hidden_pass\n' + Array.from({length: 12}, (_, i) => `2026-11-04,pilot3,s${i},c,r${i},true,safe,${i < 9}`).join('\n') + '\n');
  return v;
}
async function withPage(frozen: boolean, w: number, fn: (a: {page: import('playwright-core').Page; state: any; browser: Browser}) => Promise<void>) {
  const v = vault(frozen), r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl')});
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport: {width: w, height: 900}});
    await page.goto(r.url); await page.waitForSelector('.ob-card'); await page.waitForTimeout(1200);
    const state = await (await fetch(`http://127.0.0.1:${r.port}/state`, {headers: {'x-office-token': r.token}})).json();
    await fn({page, state, browser});
  } finally { await browser.close(); r.server.closeAllConnections(); r.server.close(); }
}
const ready = existsSync(join(DIST, 'index.html'));
const skip = ready ? false : 'page not built (npx vite build --config apps/observatory/vite.config.ts)';
const digits = (t: string) => t.match(/\d+/g) ?? [];

test('every number on the screen comes from the reducer (counts, sentences, away strip, practice line)', {skip}, async () => {
  for (const w of [390, 1280]) await withPage(false, w, async ({page, state}) => {
    const b = boardOf(state), text = await page.innerText('main');
    for (const [name, list] of [['Needs you', b.needs], ['Working', b.working], ['Checking', b.checking], ['Done today', b.done]] as const) {
      const shown = await page.locator('.ob-col', {has: page.getByRole('heading', {name: new RegExp(`^${name}`)})}).locator('h2 .n').innerText();
      assert.equal(shown, `${list.length} ${list.length === 1 ? 'helper' : 'helpers'}`, `${name} count at ${w}px`);
    }
    for (const must of [b.sentence, b.sub, ...b.quietLines, state.away.sentence, practiceLine(state.practice), ...state.away.results.map((r: any) => r.text)]) assert.ok(text.includes(must), `missing: ${must}`);
    assert.ok(state.away.results.some((r: any) => r.text === '3 of 12 passed' && r.passed === false), 'the failed night check is reported'); // contains, not equals: whether the 3-minute-old events also fall in the overnight window depends on the clock
    assert.equal(state.practice.passed, 9);
    const allowed = new Set(digits([b.sentence, state.away.sentence, practiceLine(state.practice), ...state.away.results.map((r: any) => r.text), ...[b.needs, b.working, b.checking, b.done].flat().flatMap((c) => [c.verb, c.time, c.label]), b.sub, ...b.quietLines, String(state.away.blocked), String(b.quiet), '0', '1', '2', '3', '4'].join(' ')));
    const shown = digits(text.replace(/\d\d:\d\d/g, '').replace(/updated \d+ s ago/, ''));
    assert.deepEqual(shown.filter((d) => !allowed.has(d)), [], `a number on the page is not in the reducer's data at ${w}px`);
  });
});

// Pixel compare done by the browser itself (canvas), so no image package is needed. Set UPDATE_BASELINE=1 to rewrite the pictures.
test('visual diff: the board matches its baseline picture within a small tolerance', {skip}, async () => {
  for (const w of [390, 1280]) await withPage(false, w, async ({page, browser}) => {
    await page.evaluate(() => { document.querySelector('.ob-away')?.remove(); /* its content depends on the clock by design; its numbers are checked in the DOM-number test */ const t = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = t.nextNode(); n; n = t.nextNode()) n.textContent = (n.textContent ?? '').replace(/\d\d:\d\d/g, '00:00').replace(/updated \d+ s/, 'updated 0 s').replace(/\d+ (second|minute|hour)s? ago/g, '1 minute ago').replace(/Waiting for \d+ minutes/, 'Waiting for 4 minutes'); });
    const shot = await page.screenshot({fullPage: true}), file = join(FIX, `board-baseline-${w}.png`);
    if (process.env.UPDATE_BASELINE) { writeFileSync(file, shot); return; }
    assert.ok(existsSync(file), 'baseline missing: run with UPDATE_BASELINE=1');
    const diff = await (await browser.newPage()).evaluate(async ([a, b]) => {
      const load = (s: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
      const [x, y] = await Promise.all([load(a!), load(b!)]);
      if (x.width !== y.width || x.height !== y.height) return 1;
      const px = (i: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d')!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const [d1, d2] = [px(x), px(y)]; let bad = 0;
      for (let k = 0; k < d1.length; k += 4) if (Math.abs(d1[k]! - d2[k]!) + Math.abs(d1[k + 1]! - d2[k + 1]!) + Math.abs(d1[k + 2]! - d2[k + 2]!) > 48) bad++;
      return bad / (d1.length / 4);
    }, [readFileSync(file).toString('base64'), shot.toString('base64')] as [string, string]);
    assert.ok(diff < 0.002, `picture differs from the baseline at ${w}px: ${(diff * 100).toFixed(2)}% of pixels`);
  });
});

test('frozen log: the screen does not move (identical pictures over time)', {skip}, async () => {
  const seconds = Number(process.env.OFFICE_FREEZE_SECONDS ?? 8); // the nightly run uses 60
  await withPage(true, 1280, async ({page}) => {
    const mask = [page.locator('.ob-fresh'), page.locator('.ob-when'), page.locator('.ob-sub')], frames: Buffer[] = [];
    for (let t = 0; t <= seconds; t += 2) { frames.push(await page.screenshot({fullPage: true, mask})); await page.waitForTimeout(2000); }
    assert.ok(frames.length >= 5);
    assert.ok(frames.every((f) => f.equals(frames[0]!)), `the picture changed within ${seconds} s with no new news`);
  });
});

test('judging the kid-test answer against the truth: wrong answers and jargon fail', () => {
  assert.deepEqual(judge('Two helpers are working. Nothing needs you right now.', {needs: 0, working: 2}), {correct: true, jargon: []});
  assert.equal(judge('The owner needs to answer a helper that is waiting for you.', {needs: 0, working: 1}).correct, false);
  assert.equal(judge('Everything is calm and the owner does not need to do anything.', {needs: 1, working: 0}).correct, false);
  assert.equal(judge('One helper needs you: it is waiting for your OK.', {needs: 1, working: 0}).correct, true);
  assert.deepEqual(judge('A hook blocked a commit. Nothing needs you.', {needs: 0, working: 0}).jargon, ['hook', 'commit']);
});

test('property: the five status words never contradict the rules, for any event order', () => {
  const kinds = ['tool_end', 'turn_end', 'needs_you', 'subagent_start', 'subagent_end', 'gate_result', 'session_end'] as const;
  const row = fc.record({k: fc.constantFrom(...kinds), s: fc.constantFrom('h:aaaaaaaaaaaa', 'h:bbbbbbbbbbbb'), v: fc.constantFrom('PASS', 'FAIL', 'PARTIAL'), ok: fc.boolean()});
  fc.assert(fc.property(fc.array(row, {minLength: 1, maxLength: 40}), fc.integer({min: 0, max: 7200}), (rows, ago) => {
    const E: OfficeEvent[] = rows.map((r, i) => ({v: 1, seq: i + 1, ts: '2026-11-05T10:00:00', sid: r.s, project: 'Unfoolable', kind: r.k, tool: r.k === 'tool_end' ? 'Bash' : null, ok: r.k === 'tool_end' ? r.ok : null, code: r.k === 'needs_you' ? 'permission' : null, gate: r.k === 'gate_result' ? {task: 'T', verdict: r.v as 'PASS', passed: 1, total: 2} : null}));
    const now = stamp(new Date(new Date(2026, 10, 5, 10, 0, 0).getTime() + ago * 1000)), s = reduce(E, now), b = boardOf(s);
    assert.equal(s.summary.done <= E.filter((e) => e.kind === 'gate_result' && e.gate!.verdict === 'PASS').length, true);
    const today = now.slice(0, 10);
    assert.equal(b.done.length, s.helpers.filter((h) => h.status === 'done' && h.lastAt.slice(0, 10) === today).length);
    assert.equal(b.failed.length, s.helpers.filter((h) => h.status === 'stuck' && h.gate && h.lastAt.slice(0, 10) === today).length);
    assert.equal(b.done.filter((c) => c.tone === 'green').length <= s.summary.done, true);
    const waiting = s.helpers.filter((h) => h.status === 'unknown' && h.idle !== null && (Date.parse(now) - Date.parse(h.idle)) / 1000 <= 900).length; // finished its turn in the last 15 min: waiting for its human
    assert.equal(b.needs.length, s.summary.needs_you + s.helpers.filter((h) => h.status === 'stuck' && !h.gate).length + waiting);
    assert.equal(b.working.length, s.summary.working); // Working holds only working helpers
    assert.equal(b.quiet, s.summary.unknown - waiting);
    for (const h of s.helpers) if (h.status === 'working') assert.ok(ago <= 60 || h.lastAt > '2026-11-05T10:00:00', 'working only within 60 s of news');
    const sids = new Set(E.map((e) => e.sid)).size; // a gate-only id is handed to the single helper of its project, so it can be fewer
    assert.ok(s.helpers.length >= 1 && s.helpers.length <= sids);
  }), {numRuns: 300, seed: 11});
});
