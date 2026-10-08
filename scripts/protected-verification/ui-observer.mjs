// Trusted observer imports only browser tooling. Candidate JavaScript runs in Chromium.
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
const [bundle, depsRoot, scratch] = process.argv.slice(2);
const write = fs.writeSync.bind(fs), stringify = JSON.stringify.bind(JSON);
const fd = Number(process.env.CC_OBSERVATION_FD);
if (!Number.isInteger(fd) || fd < 3) throw new Error('parent-owned observation FD required');
// Parent releases stdin only after recording ownership; do not launch before this gate.
const requests = JSON.parse(fs.readFileSync(0, 'utf8')).requests;
if (!Array.isArray(requests) || requests.length > 30) throw new Error('invalid requests');
const requireBrowser = createRequire('/Users/jeshwanthsingh/Projects/ai-lab/tooling/lib/node_modules/@playwright/cli/package.json');
const { chromium } = requireBrowser('playwright');
const installedShell = '/Users/jeshwanthsingh/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browserExecutable = fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : installedShell;
const bundleBytes = fs.readFileSync(bundle);
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/candidate.js"></script></body></html>';
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || !['/', '/candidate.js'].includes(req.url)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': req.url === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(req.url === '/' ? html : bundleBytes);
});
let browser;
const rows = [];
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: browserExecutable, args: ['--disable-background-networking', '--disable-extensions'], env: { PATH: process.env.PATH ?? '', HOME: scratch, TMPDIR: scratch } });
  for (const request of requests) {
    const row = { id: request.id, html: '', text: '', missingElements: [], exception: null };
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
    const errors = [];
    try {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin === origin && ['/', '/candidate.js'].includes(url.pathname) ? route.continue() : route.abort('blockedbyclient');
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error));
      page.setDefaultTimeout(2000);
      await page.goto(origin, { waitUntil: 'load', timeout: 10000 });
      await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 2000 });
      for (const op of request.operations ?? []) {
        if (op.action === 'fill') {
          const element = page.getByLabel(op.label, { exact: true });
          if (await element.count() !== 1) { row.missingElements.push({ action: op.action, label: op.label }); continue; }
          await element.fill(op.value);
        } else if (op.action === 'click') {
          const element = page.getByRole('button', { name: op.text, exact: true });
          if (await element.count() !== 1) { row.missingElements.push({ action: op.action, text: op.text }); continue; }
          await element.click();
        } else throw new Error('unsupported operation');
      }
      // CDP reads the browser's DOM tree without invoking Candidate-controlled DOM getters.
      const cdp = await context.newCDPSession(page);
      const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
      const findRoot = node => (node.attributes ?? []).some((v, i, a) => i % 2 === 0 && v === 'id' && a[i + 1] === 'root') ? node : (node.children ?? []).map(findRoot).find(Boolean);
      const mount = findRoot(root);
      if (!mount) throw new Error('mount element missing');
      const outer = await cdp.send('DOM.getOuterHTML', { nodeId: mount.nodeId });
      row.html = outer.outerHTML.replace(/^<div\b[^>]*>/, '').replace(/<\/div>$/, '');
      const textOf = node => node.nodeType === 3 ? node.nodeValue : (node.children ?? []).map(textOf).join('');
      row.text = textOf(mount);
      if (row.html.length > 1048576 || row.text.length > 262144) throw new Error('DOM observation limit exceeded');
      if (errors.length) throw errors[0];
    } catch (error) { row.exception = { name: error?.name ?? 'Error', message: String(error?.message ?? error).slice(0, 2048) }; }
    finally { await context.close(); }
    rows.push(row);
  }
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
write(fd, stringify({ version: 'observations-v1', observations: rows }) + '\n');
