import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const AXE = new URL('../../node_modules/axe-core/axe.min.js', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) && existsSync(AXE) ? false : 'page not built or axe-core missing';
const p2 = (x: number) => String(x).padStart(2, '0');
// A 1x1 PNG stands in for the licensed sheets: the page only needs two loadable pictures, so no real art is needed here.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('Office view (fake art folder): axe finds no serious problem; every helper has its own colour dot; tags do not overlap each other', {skip}, async () => {
  const art = mkdtempSync(join(tmpdir(), 'fakeart-')); mkdirSync(join(art, '1_Room_Builder_Office'));
  writeFileSync(join(art, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(art, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG);
  const v = mkdtempSync(join(tmpdir(), 'funa11y-')); mkdirSync(join(v, 'logs'));
  const d = new Date(), ts = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  let seq = 0;
  const L = (sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts, sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(join(v, 'logs/office-v1.jsonl'), L('h:aaaaaaaaaaaa', 'command-center', 'needs_you', {code: 'permission'}) + L('h:bbbbbbbbbbbb', 'coding-agent-crash-tests', 'tool_end', {tool: 'Read', ok: true}) +
    L('h:cccccccccccc', 'muse-guard', 'tool_end', {tool: 'Bash', ok: true}) + L('h:dddddddddddd', 'jeshwanth.com', 'subagent_start') + L('h:eeeeeeeeeeee', 'proof-lab', 'tool_end', {tool: 'Edit', ok: true}));
  const r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl'), open: {}, art: {dir: art}});
  const b = await chromium.launch();
  try {
    for (const scheme of ['light', 'dark'] as const) {
      const page = await b.newPage({viewport: {width: 1440, height: 1000}, bypassCSP: true, colorScheme: scheme}); // CSP bypass only so the audit script can run
      await page.goto(r.url); await page.waitForSelector('.fv-who.loud', {timeout: 20000});
      const sideBefore = await page.$eval('.fv-side', (e) => e.getBoundingClientRect().width);
      await page.click('.fv-face >> nth=1'); await page.waitForSelector('.fv-panel'); // a click on the CHARACTER opens its panel
      assert.equal(await page.$eval('.fv-side', (e) => e.getBoundingClientRect().width), sideBefore, 'the panel must not squeeze the side list');
      await page.click('.fv-panel .ob-tool'); await page.waitForSelector('.fv-panel', {state: 'detached'});
      await page.focus('.fv-who.loud >> nth=0'); await page.keyboard.press('Enter'); await page.waitForSelector('.fv-panel'); // and the tag opens it from the keyboard
      assert.equal(await page.evaluate(() => location.hash), '', 'the key must not stay in the address bar');
      await page.addScriptTag({path: AXE});
      const res = await page.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
      assert.deepEqual(res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => `${x.impact} ${x.id} x${x.nodes.length}`), [], `accessibility problems (${scheme})`);
      const dots = await page.$$eval('.fv-dot', (els) => els.map((e) => getComputedStyle(e).backgroundColor));
      assert.ok(dots.length >= 5 && new Set(dots.slice(0, 5)).size === 5, `helpers share a colour: ${dots.join(' ')}`);
      const boxes = await page.$$eval('.fv-who', (els) => els.map((e) => e.getBoundingClientRect()).map((q) => [q.left, q.top, q.right, q.bottom]));
      const hit = boxes.some((a, i) => boxes.some((c, j) => j > i && a[0]! < c[2]! && c[0]! < a[2]! && a[1]! < c[3]! && c[1]! < a[3]!));
      assert.equal(hit, false, 'two name tags overlap');
      await page.close();
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
