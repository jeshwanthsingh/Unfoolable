// Takes the board screenshots on the REAL log with Playwright. Usage: node apps/observatory/screenshot.ts <outdir>
import {chromium} from 'playwright-core';
import {startOffice} from './office-server.ts';
import {join} from 'node:path';
const out = process.argv[2] ?? '.';
const vault = join(process.env.HOME ?? '', 'Projects/proof-lab');
const r = await startOffice({vault, staticDir: join(import.meta.dirname, '../../.work/office-dist'), logPath: join(vault, 'logs/usage.jsonl')});
const b = await chromium.launch();
for (const [w, h] of [[1280, 900], [390, 844]] as const) {
  const p = await b.newPage({viewport: {width: w, height: h}});
  await p.goto(r.url); await p.waitForSelector('.ob-fresh'); await p.waitForTimeout(1500);
  const cut = await p.evaluate(() => [...document.querySelectorAll('.ob-fresh,.ob-card,.ob-card *,.oa-line,.ob-col h2')].filter((e) => e.scrollWidth > e.clientWidth + 1).length);
  await p.screenshot({path: join(out, `board-${w}.png`), fullPage: true});
  console.log(`${w}px: ${cut} cut-off texts`);
  if (w === 1280) console.log(await p.innerText('main'));
}
await b.close(); r.server.closeAllConnections(); r.server.close();
