// Pixel office check: the pixel mockup on the left, the live Office view on the right (real log, or --demo made-up helpers).
// Needs the licensed art folder (see office-art.ts). Usage: node scripts/office-pixel-shots.ts <outdir> [--demo]
import {chromium} from 'playwright-core';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {startOffice} from '../apps/observatory/office-server.ts';

const out = process.argv[2] ?? '.', demo = process.argv.includes('--demo');
const home = join(homedir(), 'Projects/proof-lab');
let vault = home, log = join(home, 'logs/office-v1.jsonl');
if (demo) {
  vault = mkdtempSync(join(tmpdir(), 'pix-')); mkdirSync(join(vault, 'logs')); log = join(vault, 'logs/office-v1.jsonl');
  const p = (x: number) => String(x).padStart(2, '0'), at = (ms: number) => { const d = new Date(Date.now() - ms); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  let seq = 0;
  const L = (ms: number, sid: string, project: string, kind: string, o: object = {}) => JSON.stringify({v: 1, seq: ++seq, ts: at(ms), sid, project, kind, tool: null, ok: null, code: null, gate: null, ...o}) + '\n';
  writeFileSync(log, L(240_000, 'h:000000000002', 'command-center', 'needs_you', {code: 'permission'}) + L(20_000, 'h:000000000003', 'coding-agent-crash-tests', 'tool_end', {tool: 'Edit', ok: true}) +
    L(30_000, 'h:000000000004', 'muse-guard', 'tool_end', {tool: 'Bash', ok: true}) + L(10_000, 'h:000000000005', 'jeshwanth.com', 'subagent_start') +
    L(3_600_000, 'h:000000000006', 'proof-lab', 'tool_end', {tool: 'Bash', ok: true}) + L(3_500_000, 'h:000000000007', 'proof-lab', 'gate_result', {gate: {task: 'T-1', verdict: 'PASS', passed: 9, total: 12}}));
}
const r = await startOffice({vault, staticDir: join(import.meta.dirname, '../.work/office-dist'), logPath: log, open: {}, art: {}});
const b = await chromium.launch();
mkdirSync(out, {recursive: true});
try {
  const page = await b.newPage({viewport: {width: 1440, height: 1000}});
  await page.goto(r.url); await page.waitForSelector('.fv-room canvas', {timeout: 20000}); await page.waitForTimeout(2500);
  const live = (await page.screenshot({fullPage: true})).toString('base64'), left = readFileSync(join(home, 'setup/office-mockup/office-pixel-mockup.png')).toString('base64');
  const both = await b.newPage({viewport: {width: 2800, height: 900}});
  await both.setContent(`<body style="margin:0;background:#fff;font:700 22px sans-serif"><div style="display:flex;gap:24px;align-items:flex-start;padding:16px"><figure style="margin:0;flex:1"><figcaption>Mockup</figcaption><img style="width:100%" src="data:image/png;base64,${left}"></figure><figure style="margin:0;flex:1"><figcaption>Live Office view${demo ? ' (demo data)' : ''}</figcaption><img style="width:100%" src="data:image/png;base64,${live}"></figure></div></body>`);
  await both.waitForLoadState('load');
  await both.screenshot({path: join(out, `office-pixel-1440${demo ? '-demo' : ''}.png`), fullPage: true});
  console.log(`wrote office-pixel-1440${demo ? '-demo' : ''}.png`);
} finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
