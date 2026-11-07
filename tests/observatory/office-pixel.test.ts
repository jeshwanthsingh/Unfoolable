import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import fc from 'fast-check';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {GUARD_AT, ROOM, SLOTS} from '../../apps/web/src/annex/room-map.ts';
import {FRAMES, HAT_COUNT, MOODS, PALETTE_KEYS, spriteRows} from '../../apps/web/src/annex/sprites.ts';

const TILE = 16; // half of a 32 px floor tile: the grid every figure stands on
const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) ? false : 'page not built';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('every standing place (slots and the guard) is on the 16 px tile grid, inside the room', () => {
  const all = [...Object.values(SLOTS).flat(), GUARD_AT] as readonly (readonly number[])[];
  assert.ok(all.length > 20);
  for (const [x, y] of all) { assert.equal(x! % TILE, 0, `x ${x}`); assert.equal(y! % TILE, 0, `y ${y}`); assert.ok(x! > 0 && x! < ROOM.w && y! > 0 && y! < ROOM.h); }
});

test('sprites: every mood x hat x frame is 16 wide, 32 tall, only known colour letters (property, fixed seed)', () => {
  fc.assert(fc.property(fc.constantFrom(...MOODS), fc.integer({min: 0, max: HAT_COUNT - 1}), fc.integer({min: 0, max: FRAMES - 1}), (mood, hat, frame) => {
    const rows = spriteRows(mood, hat, frame);
    assert.equal(rows.length, 32);
    for (const r of rows) { assert.equal(r.length, 16); for (const ch of r) assert.ok(PALETTE_KEYS.includes(ch), `letter ${ch}`); }
    assert.ok(rows.some((r) => r.includes('c')), 'the helper colour is used');
  }), {seed: 20261107, numRuns: 200});
});

// One office server and one browser for a whole test; each width gets its own page (the room needs a WebGL browser, which is heavy).
async function start(helpers = 1) {
  const v = mkdtempSync(join(tmpdir(), 'pix-')); mkdirSync(join(v, 'logs'));
  const log = join(v, 'logs/office-v1.jsonl'), tools = ['Edit', 'Read', 'Bash', 'WebFetch', 'Edit', 'Read'], ts = new Date().toISOString().slice(0, 19);
  writeFileSync(log, Array.from({length: helpers}, (_, i) => JSON.stringify({v: 1, seq: i + 1, ts, sid: `h:${String(i + 1).repeat(12)}`, project: ['proof-lab', 'muse-guard', 'command-center', 'jeshwanth.com', 'agentrunlab', 'unfoolable'][i % 6], kind: i === 0 && helpers > 1 ? 'needs_you' : 'tool_end', tool: i === 0 && helpers > 1 ? null : tools[i % 6], ok: i === 0 && helpers > 1 ? null : true, code: i === 0 && helpers > 1 ? 'permission' : null, gate: null})).join('\n') + '\n');
  const art = mkdtempSync(join(tmpdir(), 'pixart-')); mkdirSync(join(art, '1_Room_Builder_Office'));
  writeFileSync(join(art, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(art, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG);
  const r = await startOffice({vault: v, staticDir: DIST, logPath: log, open: {}, art: {dir: art}});
  const b = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  return {
    done: async () => { await b.close(); r.server.closeAllConnections(); r.server.close(); },
    open: async (w: number, h = 900) => {
      const ctx = await b.newContext({viewport: {width: w, height: h}}), page = await ctx.newPage();
      await page.goto(r.url);
      if (w < 900) await page.click('text=Office'); // a phone starts in the simple view; the room is one tap away
      await page.waitForSelector('.fv-canvas canvas', {timeout: 30000}); await page.waitForSelector('.fv-spot', {timeout: 30000});
      return {page, close: () => ctx.close()};
    }
  };
}

test('the room is drawn at a whole-number size: 640 px wide (or 320 when narrower), never a fraction', {skip, timeout: 180000}, async () => {
  const o = await start();
  try {
    for (const [w, want] of [[1440, 640], [1280, 640], [900, 640], [700, 640], [620, 320], [390, 320]] as const) {
      const {page, close} = await o.open(w);
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => { const c = document.querySelector('.fv-canvas canvas')!.getBoundingClientRect(), r = document.querySelector('.fv-room')!.getBoundingClientRect(); return {cw: c.width, ch: c.height, rw: r.width, rh: r.height}; });
      assert.deepEqual([m.cw, m.ch], [want, want * 1.1], `canvas at ${w} px`);
      assert.deepEqual([m.rw, m.rh], [want + 6, want * 1.1 + 6], `room box at ${w} px (3 px border each side)`);
      await close();
    }
  } finally { await o.done(); }
});

test('no two name tags overlap, also in the narrow room (645, 620 and 390 px; six helpers)', {skip, timeout: 180000}, async () => {
  const o = await start(6);
  try {
    for (const w of [1440, 645, 620, 390]) {
      const {page, close} = await o.open(w);
      await page.waitForTimeout(600);
      const boxes = (await page.$$eval('.fv-who', (els) => els.map((e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom, q.width]; }))).filter((q) => q[4]! > 0);
      assert.ok(boxes.length >= 5, `tags at ${w}: ${boxes.length}`);
      const pairs = boxes.flatMap((a, i) => boxes.filter((c, j) => j > i && a[0]! < c[2]! && c[0]! < a[2]! && a[1]! < c[3]! && c[1]! < a[3]!));
      assert.equal(pairs.length, 0, `${pairs.length} overlapping tag pairs at ${w} px`);
      await close();
    }
  } finally { await o.done(); }
});

test('one pixel size: the figure and the floor next to it are drawn in whole 2 x 2 pixel blocks, aligned to the same grid', {skip, timeout: 120000}, async () => {
  const o = await start(), {page, close} = await o.open(1440);
  try {
    await page.waitForTimeout(1500);
    const [fx, fy] = SLOTS.desk[0]; // the helper's home desk: feet position in room pixels
    const bad = await page.evaluate(async ({fx, fy}) => {
      const img = new Image(); img.src = (document.querySelector('.fv-canvas canvas') as HTMLCanvasElement).toDataURL('image/png'); await img.decode(); // the canvas's own pixels, 1:1
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
      const x0 = fx - 16, y0 = fy - 64, W = 32, H = 64, d = g.getImageData(x0, y0, W, H).data, px = (x: number, y: number) => [...d.slice((y * W + x) * 4, (y * W + x) * 4 + 4)].join(',');
      let odd = 0, colours = new Set<string>();
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { // each 2 x 2 block must be one colour
        const a = px(x, y); colours.add(a);
        if (px(x + 1, y) !== a || px(x, y + 1) !== a || px(x + 1, y + 1) !== a) odd++;
      }
      return {odd, colours: colours.size, size: img.width + 'x' + img.height};
    }, {fx, fy});
    assert.equal(bad.size, '640x704', 'the picture is the canvas at 1:1');
    assert.ok(bad.colours >= 5, `the figure must show several colours (${bad.colours})`);
    assert.equal(bad.odd, 0, `${bad.odd} blocks are not whole 2 x 2 pixels (blurred or half-size pixels)`);
  } finally { await close(); await o.done(); }
});
