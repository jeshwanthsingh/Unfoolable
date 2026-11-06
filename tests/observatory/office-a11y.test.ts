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

// axe-core audit of the board with every kind of card on it (needs you with its Open button, working, checking, done). Fails on serious or critical.
test('axe: no serious or critical accessibility problems on the board at 390 and 1280 px', {skip}, async () => {
  const v = mkdtempSync(join(tmpdir(), 'a11y-')); mkdirSync(join(v, 'logs'));
  const d = new Date(), ts = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  let seq = 0;
  const L = (sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts, sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(join(v, 'logs/office-v1.jsonl'), L('h:aaaaaaaaaaaa', 'command-center', 'tool_end', {tool: 'Edit', ok: true}) + L('h:bbbbbbbbbbbb', 'coding-agent-crash-tests', 'needs_you', {code: 'permission'}) +
    L('h:cccccccccccc', 'muse-guard', 'subagent_start') + L('h:dddddddddddd', 'jeshwanth.com', 'tool_end', {tool: 'Bash', ok: true}) + L('h:111111111111', 'jeshwanth.com', 'gate_result', {gate: {task: 'T', verdict: 'PASS', passed: 9, total: 12}}));
  const r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl'), open: {}});
  const b = await chromium.launch();
  try {
    for (const w of [390, 1280]) for (const scheme of ['light', 'dark'] as const) {
      const page = await b.newPage({viewport: {width: w, height: 900}, bypassCSP: true, colorScheme: scheme}); // CSP bypass only so the audit script can run
      await page.goto(r.url); await page.waitForSelector('.ob-card'); await page.waitForTimeout(800);
      await page.addScriptTag({path: AXE});
      const res = await page.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
      const bad = res.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => `${x.impact} ${x.id} x${x.nodes.length}`);
      assert.deepEqual(bad, [], `accessibility problems at ${w}px ${scheme}`);
      await page.close();
    }
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
