// Takes the office screenshots with Playwright. Usage: node apps/observatory/screenshot.ts <outdir>
import {chromium} from 'playwright-core';
import {startOffice} from './office-server.ts';
import {join} from 'node:path';
const out = process.argv[2] ?? '.';
const r = await startOffice({vault: join(process.env.HOME ?? '', 'Projects/proof-lab'), staticDir: join(import.meta.dirname, '../../.work/office-dist')});
const b = await chromium.launch();
for (const [w, h, scheme] of [[1440, 900, 'light'], [390, 844, 'light'], [1440, 900, 'dark'], [390, 844, 'dark']] as const) {
  const p = await b.newPage({viewport: {width: w, height: h}, colorScheme: scheme});
  await p.goto(r.url); await p.waitForSelector('.oa-line');
  await p.screenshot({path: join(out, `office-${w}-${scheme}.png`), fullPage: true});
  if (scheme === 'light' && w === 1440) console.log(await p.innerText('main'));
}
await b.close(); r.server.close();
