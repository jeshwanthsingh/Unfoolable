import test from 'node:test';
import assert from 'node:assert/strict';
import {appendFileSync as require_append, existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) ? false : 'page not built (npx vite build --config apps/observatory/vite.config.ts)';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const p2 = (x: number) => String(x).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

// Soak check (a): freeze the log; the OFFICE view (room, figures, tags, side list) must not change by a single pixel. Only clocks may tick.
test('frozen log: 60 s of identical pictures in the Office view (room and tags included)', {skip}, async () => {
  const seconds = Number(process.env.OFFICE_SOAK_SECONDS ?? 60);
  const art = mkdtempSync(join(tmpdir(), 'soakart-')); mkdirSync(join(art, '1_Room_Builder_Office'));
  writeFileSync(join(art, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(art, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG);
  const v = mkdtempSync(join(tmpdir(), 'soak-')); mkdirSync(join(v, 'logs'));
  const old = stamp(new Date(Date.now() - 3 * 3600_000));
  let seq = 0;
  const L = (sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts: old, sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(join(v, 'logs/office-v1.jsonl'), L('h:aaaaaaaaaaaa', 'command-center', 'needs_you', {code: 'permission'}) + L('h:bbbbbbbbbbbb', 'coding-agent-crash-tests', 'subagent_start') + L('h:cccccccccccc', 'muse-guard', 'tool_end', {tool: 'Edit', ok: true}) +
    L('h:dddddddddddd', 'jeshwanth.com', 'tool_end', {tool: 'Bash', ok: true}) + L('h:00000000gate', 'jeshwanth.com', 'gate_result', {gate: {task: 'T', verdict: 'PASS', passed: 9, total: 12}}));
  const r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl'), art: {dir: art}});
  const b = await chromium.launch();
  try {
    const page = await b.newPage({viewport: {width: 1440, height: 1000}});
    await page.goto(r.url); await page.waitForSelector('.fv-who.loud', {timeout: 20000}); await page.waitForTimeout(1500);
    const mask = [page.locator('.ob-fresh'), page.locator('.ob-sub'), page.locator('.fv-li time'), page.locator('.fv-credit ~ *')], frames: Buffer[] = [];
    for (let t = 0; t <= seconds; t += 5) { frames.push(await page.screenshot({fullPage: true, mask})); await page.waitForTimeout(5000); }
    assert.ok(frames.length >= Math.floor(seconds / 5));
    assert.ok(frames.every((f) => f.equals(frames[0]!)), `the Office view changed within ${seconds} s with no new news`);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});

// No gliding: a helper that takes another spot (Edit at the desk, then Read at the library) shows its tag only at the old place or the new one,
// never at a place in between, and a helper that did not change is never seen moving.
test('a helper that changes spot never slides: its tag is only ever at the old place or the new place', {skip}, async () => {
  const art = mkdtempSync(join(tmpdir(), 'glideart-')); mkdirSync(join(art, '1_Room_Builder_Office'));
  writeFileSync(join(art, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(art, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG);
  const v = mkdtempSync(join(tmpdir(), 'glide-')); mkdirSync(join(v, 'logs')); const log = join(v, 'logs/office-v1.jsonl');
  let seq = 0;
  const put = (sid: string, project: string, tool: string) => require_append(log, JSON.stringify({v: 1, seq: ++seq, ts: stamp(new Date()), sid, project, kind: 'tool_end', tool, ok: true, code: null, gate: null}) + '\n');
  writeFileSync(log, '');
  put('h:00000000000a', 'command-center', 'Edit'); put('h:00000000000b', 'muse-guard', 'Edit');
  const r = await startOffice({vault: v, staticDir: DIST, logPath: log, art: {dir: art}});
  const b = await chromium.launch();
  try {
    const page = await b.newPage({viewport: {width: 1440, height: 1000}});
    await page.goto(r.url); await page.waitForSelector('.fv-who', {timeout: 20000}); await page.waitForTimeout(800);
    // A box reported at exactly 0,0 (or with no width) is not laid out or just detached (seen on a loaded machine), not a place: it is left out.
    const where = () => page.$$eval('.fv-spot', (els) => Object.fromEntries(els.filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && (q.left !== 0 || q.top !== 0); }).map((e) => [e.querySelector('b')!.textContent, `${Math.round(e.getBoundingClientRect().left)},${Math.round(e.getBoundingClientRect().top)}`])));
    const before = await where();
    put('h:00000000000a', 'command-center', 'Read'); // A goes to the library; B stays at its desk
    const seen: Record<string, Set<string>> = {};
    let moved = false, extra = 0; // sample until the move has happened (a slow machine may delay the event), then a little longer to catch any slide
    for (let i = 0; i < 400 && extra < 15; i++) { const w = await where(); for (const [k, p] of Object.entries(w)) (seen[k] ??= new Set()).add(p); if (w['Unfoolable'] && w['Unfoolable'] !== before['Unfoolable']) moved = true; if (moved) extra++; await page.waitForTimeout(40); }
    assert.ok(moved, 'the helper never reached the library');
    assert.equal(seen['Muse Guard']?.size, 1, 'a helper that did not change was seen moving');
    assert.deepEqual([...seen['Muse Guard']!], [before['Muse Guard']]);
    assert.ok(seen['Unfoolable']!.size <= 2, `the tag slid through ${[...seen['Unfoolable']!].join(' -> ')}`);
    assert.ok(!seen['Unfoolable']!.has(before['Unfoolable']!) || seen['Unfoolable']!.size === 2, 'the tag should have moved to the library');
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
