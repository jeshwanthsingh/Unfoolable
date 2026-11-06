import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {ART_FILES, artAvailable, artPath} from '../../apps/observatory/office-art.ts';

function fakeArt(): string {
  const d = mkdtempSync(join(tmpdir(), 'art-')); mkdirSync(join(d, '1_Room_Builder_Office'));
  writeFileSync(join(d, 'Modern_Office_32x32.png'), 'OFFICE-SHEET'); writeFileSync(join(d, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), 'ROOM-SHEET');
  writeFileSync(join(d, 'LICENSE.txt'), 'SECRET-LICENSE-TEXT'); // a real neighbour that must never be served
  return d;
}
async function withServer(art: {dir?: string} | undefined, fn: (a: {base: string; key: string; get: (p: string, h?: Record<string, string>) => Promise<Response>}) => Promise<void>) {
  const v = mkdtempSync(join(tmpdir(), 'artsrv-')); mkdirSync(join(v, 'logs'));
  const r = await startOffice({vault: v, ...(art ? {art} : {})});
  const base = `http://127.0.0.1:${r.port}`;
  try { await fn({base, key: r.token, get: (p, h = {}) => fetch(base + p, {headers: h})}); } finally { r.server.closeAllConnections(); r.server.close(); }
}

test('the art route serves only its allowlist, with the key; the manifest says what is there', async () => {
  const dir = fakeArt();
  assert.equal(artAvailable(dir), true);
  await withServer({dir}, async ({key, get}) => {
    const h = {'x-office-token': key};
    assert.equal((await get('/art/office.png')).status, 401);
    assert.equal((await get('/art/office.png', {'x-office-token': 'nope'})).status, 401);
    const ok = await get('/art/office.png', h);
    assert.equal(ok.status, 200); assert.equal(ok.headers.get('content-type'), 'image/png'); assert.equal(await ok.text(), 'OFFICE-SHEET');
    assert.equal(await (await get('/art/rooms.png', h)).text(), 'ROOM-SHEET');
    assert.deepEqual(await (await get('/art/manifest', h)).json(), {available: true, files: Object.keys(ART_FILES)});
    assert.equal(ok.headers.get('access-control-allow-origin'), null);
  });
});

test('everything else is refused: other files of the folder, path tricks, odd keys', async () => {
  await withServer({dir: fakeArt()}, async ({key, get}) => {
    const h = {'x-office-token': key};
    for (const p of ['/art/LICENSE.txt', '/art/Modern_Office_32x32.png', '/art/..%2FLICENSE.txt', '/art/%2e%2e/%2e%2e/etc/passwd', '/art/__proto__', '/art/constructor', '/art/office.png/../../x', '/art/']) {
      const r = await get(p, h);
      assert.ok(r.status === 404, `${p} gave ${r.status}`);
      assert.ok(!(await r.text()).includes('SECRET'));
    }
  });
  assert.equal(artPath('/nonexistent', 'office.png'), null);
  assert.equal(artPath(fakeArt(), '__proto__'), null);
});

test('no art folder: the manifest says so and the sheets are 404, so the page falls back to the simple view; art not configured: no route at all', async () => {
  await withServer({dir: join(tmpdir(), 'no-such-art-folder')}, async ({key, get}) => {
    assert.deepEqual(await (await get('/art/manifest', {'x-office-token': key})).json(), {available: false, files: Object.keys(ART_FILES)});
    assert.equal((await get('/art/office.png', {'x-office-token': key})).status, 404);
  });
  await withServer(undefined, async ({key, get}) => assert.equal((await get('/art/manifest', {'x-office-token': key})).status, 404));
});

test('the licensed art is not in the repo (no sheet, folder or pack name in any tracked file name)', () => {
  const files = execFileSync('git', ['ls-files'], {encoding: 'utf8'}).split('\n');
  assert.deepEqual(files.filter((f) => /Modern_Office|Room_Builder|limezu/i.test(f)), []);
});
