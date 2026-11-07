import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) ? false : 'page not built';
const p2 = (x: number) => String(x).padStart(2, '0');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function setup(art: boolean) {
  const v = mkdtempSync(join(tmpdir(), 'feed-')); mkdirSync(join(v, 'logs'));
  const d = new Date(), ts = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  writeFileSync(join(v, 'logs/office-v1.jsonl'), JSON.stringify({v: 1, seq: 1, ts, sid: 'h:aaaaaaaaaaaa', project: 'proof-lab', kind: 'needs_you', tool: null, ok: null, code: 'permission', gate: null}) + '\n');
  const dir = mkdtempSync(join(tmpdir(), 'feedart-')); mkdirSync(join(dir, '1_Room_Builder_Office'));
  if (art) { writeFileSync(join(dir, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(dir, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG); }
  return startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl'), open: {}, art: {dir}});
}

// /events answers 503 twice, then recovers: the page must show the snapshot and a "Not live" banner at once, never a blank page, and heal by itself.
for (const [name, art, sel] of [['Office view', true, '.fv-row'], ['Simple view', false, '.ob-cols']] as const) {
  test(`${name}: /events 503 shows the snapshot and a Not live banner; recovers when /events returns`, {skip, timeout: 60000}, async () => {
    const r = await setup(art), b = await chromium.launch();
    try {
      const page = await b.newPage({viewport: {width: 1440, height: 1000}});
      let hits = 0;
      await page.route('**/events', (route) => (++hits <= 2 ? route.fulfill({status: 503, body: 'down'}) : route.continue()));
      await page.goto(r.url);
      await page.waitForSelector('.ob-feedoff', {timeout: 10000});
      assert.match(await page.innerText('.ob-feedoff'), /Not live: can't reach the feed, trying again \(\d+\)/);
      assert.match(await page.innerText('#root'), /proof-lab|Proof Lab|Nothing needs you|needs you|No news/i, 'the snapshot sentence is on the page');
      assert.ok((await page.$$('#root *')).length > 5, 'the page is not blank');
      await page.waitForSelector('.ob-feedoff', {state: 'detached', timeout: 20000}); // retries with backoff, then the stream comes back
      await page.waitForSelector(sel, {timeout: 10000});
      assert.ok(hits >= 3, 'it retried');
    } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
  });
}

test('a second and third viewer also get the stream (no viewer cap)', async () => {
  const r = await setup(false);
  try {
    const tok = new URL(r.url).hash.slice(3);
    const cs = await Promise.all([1, 2, 3, 4, 5].map(() => fetch(`http://127.0.0.1:${r.port}/events`, {headers: {'x-office-token': tok}})));
    assert.deepEqual(cs.map((c) => c.status), [200, 200, 200, 200, 200]);
    for (const c of cs) await c.body?.cancel();
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

// An old cookie (the office restarted): /api/office answers 401, so retrying can never help. The page says so and stops asking.
test('old link: 401 shows "type office" and does not loop', {skip, timeout: 60000}, async () => {
  const r = await setup(false), b = await chromium.launch();
  try {
    const page = await b.newPage({viewport: {width: 1440, height: 1000}});
    let events = 0;
    await page.route('**/events', (route) => { events++; return route.fulfill({status: 503, body: 'down'}); });
    await page.route('**/api/office', (route) => route.fulfill({status: 401, body: 'Needs the launch token.'}));
    await page.goto(r.url);
    await page.waitForSelector('.ob-feedold', {timeout: 10000});
    assert.match(await page.innerText('.ob-feedold'), /This office link is old \(the office restarted\)\. Open a fresh one: type `office` in Terminal\./);
    assert.equal(await page.$('.ob-feedoff'), null, 'no "trying again" banner');
    const before = events; await page.waitForTimeout(5000);
    assert.equal(events, before, 'no more /events requests once the link is known to be old');
    assert.ok(events <= 1, `only the first try (${events})`);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
