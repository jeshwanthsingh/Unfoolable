import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
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
