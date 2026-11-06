// Side-by-side design check: the mockup picture on the left, the live board on the right, one image per width.
// Usage: node scripts/office-design-shots.ts <outdir> [--demo]
//   default: the REAL live board (real log).  --demo: a small made-up office with a helper that needs you, so the loud lane can be compared too.
import {chromium} from 'playwright-core';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {startOffice} from '../apps/observatory/office-server.ts';

const out = process.argv[2] ?? '.', demo = process.argv.includes('--demo');
const home = join(homedir(), 'Projects/proof-lab'), mock = join(home, 'setup/office-mockup');
let vault = home, log = join(home, 'logs/office-v1.jsonl');
if (demo) {
  vault = mkdtempSync(join(tmpdir(), 'demo-')); mkdirSync(join(vault, 'logs')); log = join(vault, 'logs/office-v1.jsonl');
  const p = (x: number) => String(x).padStart(2, '0'), at = (ms: number) => { const d = new Date(Date.now() - ms); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  let seq = 0;
  const L = (ms: number, sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts: at(ms), sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(log, L(240_000, 'h:000000000002', 'command-center', 'needs_you', {code: 'permission'}) + L(20_000, 'h:000000000003', 'coding-agent-crash-tests', 'tool_end', {tool: 'Edit', ok: true}) +
    L(30_000, 'h:000000000004', 'muse-guard', 'tool_end', {tool: 'Bash', ok: true}) + L(10_000, 'h:000000000005', 'jeshwanth.com', 'subagent_start') +
    L(3_600_000, 'h:000000000006', 'proof-lab', 'tool_end', {tool: 'Bash', ok: true}) + L(3_500_000, 'h:000000000007', 'proof-lab', 'gate_result', {gate: {task: 'T-1', verdict: 'PASS', passed: 9, total: 12}}));
}
const r = await startOffice({vault, staticDir: join(import.meta.dirname, '../.work/office-dist'), logPath: log, open: {}});
const b = await chromium.launch();
mkdirSync(out, {recursive: true});
try {
  for (const [w, png] of [[1280, 'office-mockup-desktop.png'], [390, 'office-mockup-phone.png']] as const) {
    const page = await b.newPage({viewport: {width: w, height: w === 390 ? 844 : 900}});
    await page.goto(r.url); await page.waitForSelector('.ob-fresh'); await page.waitForTimeout(1500);
    const live = (await page.screenshot({fullPage: true})).toString('base64'), left = readFileSync(join(mock, png)).toString('base64');
    const both = await b.newPage({viewport: {width: w === 390 ? 1000 : 2600, height: 900}});
    await both.setContent(`<body style="margin:0;background:#fff;font:700 22px sans-serif"><div style="display:flex;gap:24px;align-items:flex-start;padding:16px"><figure style="margin:0;flex:1"><figcaption>Mockup</figcaption><img style="width:100%" src="data:image/png;base64,${left}"></figure><figure style="margin:0;flex:1"><figcaption>Live page${demo ? ' (demo data)' : ''}</figcaption><img style="width:100%" src="data:image/png;base64,${live}"></figure></div></body>`);
    await both.waitForLoadState('load');
    await both.screenshot({path: join(out, `office-design-${w}${demo ? '-demo' : ''}.png`), fullPage: true});
    console.log(`wrote office-design-${w}${demo ? '-demo' : ''}.png`);
  }
} finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
