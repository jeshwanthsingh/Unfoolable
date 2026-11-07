import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import fc from 'fast-check';
import {chromium} from 'playwright-core';
import {startOffice} from '../../apps/observatory/office-server.ts';
import {createAsker} from '../../apps/observatory/office-act.ts';

const HEAD = '# To code (mailbox)\n\nNotes from the chat side.\n\n';
const OLD = '- 2026-11-06 17:45 · from Claude chat · older entry\n  body line\n\n- 2026-11-05 10:00 · from Claude chat · oldest\n  more\n';
const memFs = (init: string) => { let text = init; return {read: () => text, write: (_: string, s: string) => { text = s; }, get text() { return text; }}; };
const NOW = new Date(2026, 10, 7, 9, 5).getTime();
// The entry is the lines after the "- " line, each with its two-space indent removed, up to the blank line.
const entryText = (file: string): string => { const l = file.split('\n'), i = l.findIndex((x) => x.startsWith('- ')); const out: string[] = []; for (let k = i + 1; k < l.length && l[k]!.startsWith('  '); k++) out.push(l[k]!.slice(2)); return out.join('\n'); };

test('ask: entry in the house format, newest on top, everything else untouched', () => {
  const fs = memFs(HEAD + OLD), ask = createAsker({file: '/x/to-code.md', fs, now: () => NOW});
  const r = ask('Fix the login bug\nsecond line');
  assert.equal(r.code, 200);
  assert.equal(fs.text, HEAD + '- 2026-11-07 09:05 · from the office · Fix the login bug [todo, office]\n  Fix the login bug\n  second line\n\n' + OLD);
});

test('ask: limits (empty 400, 2001 chars 413, control chars 400, not a string 400, 2 calls in 1 s 429)', () => {
  let t = NOW; const fs = memFs(HEAD), ask = createAsker({file: '/x', fs, now: () => (t += 2000)});
  assert.equal(ask('').code, 400); assert.equal(ask(5).code, 400);
  assert.equal(ask('a'.repeat(2001)).code, 413); assert.equal(ask('a'.repeat(2000)).code, 200);
  assert.equal(ask('bad\u0007bell').code, 400); assert.equal(ask('tab\there').code, 400); assert.equal(ask('cr\rhere').code, 400);
  let u = NOW; const quick = createAsker({file: '/x', fs: memFs(HEAD), now: () => (u += 100)});
  assert.equal(quick('one').code, 200); assert.equal(quick('two').code, 429);
});

test('ask: a file that cannot be read is never overwritten; a missing file starts empty', () => {
  let touched = false;
  const broken = {read: () => { throw Object.assign(new Error('denied'), {code: 'EACCES'}); }, write: () => { touched = true; }};
  assert.equal(createAsker({file: '/x', fs: broken, now: () => NOW})('hi').code, 500);
  assert.equal(touched, false, 'nothing was written over a file that could not be read');
  let wrote = '';
  const missing = {read: () => { throw Object.assign(new Error('none'), {code: 'ENOENT'}); }, write: (_: string, s: string) => { wrote = s; }};
  assert.equal(createAsker({file: '/x', fs: missing, now: () => NOW})('hi').code, 200);
  assert.match(wrote, /^- 2026-11-07 09:05 · from the office · hi \[todo, office\]\n  hi\n\n$/);
});

test('property (300 runs, fixed seed): the entry equals the typed text; the rest of the file is unchanged', () => {
  const text = fc.array(fc.oneof(fc.integer({min: 32, max: 0x24f}).filter((n) => n !== 127).map((n) => String.fromCharCode(n)), fc.constant('\n'), fc.constant('·'), fc.constant('- ')), {minLength: 1, maxLength: 300}).map((a) => a.join('')).filter((s) => s.trim().length > 0);
  fc.assert(fc.property(text, fc.constantFrom(HEAD + OLD, HEAD, '# only a title\n', OLD, '', '- 2026-01-01 00:00 · x\n  y\n'), (typed, before) => {
    const fs = memFs(before), r = createAsker({file: '/x', fs, now: () => NOW})(typed);
    assert.equal(r.code, 200);
    assert.equal(entryText(fs.text), typed);
    const head = fs.text.split('\n').find((l) => l.startsWith('- '))!;
    assert.match(head, /^- 2026-11-07 09:05 · from the office · .{1,80} \[todo, office\]$/);
    const entry = [head, ...typed.split('\n').map((l) => '  ' + l)].join('\n') + '\n\n';
    assert.equal(fs.text.replace(entry, ''), before, 'everything else is byte-for-byte the same');
  }), {seed: 20261107, numRuns: 300});
});

test('code stays small and unable to run anything: no exec, spawn, child_process, shell string, approvals or cards in office-act.ts or the server', () => {
  const dir = new URL('../../apps/observatory/', import.meta.url).pathname;
  const act = readFileSync(join(dir, 'office-act.ts'), 'utf8'), srv = readFileSync(join(dir, 'office-server.ts'), 'utf8');
  for (const [name, src] of [['office-act.ts', act], ['office-server.ts', srv]] as const) {
    assert.doesNotMatch(src, /(?<![.\w])exec\w*\s*\(|child_process|\bspawn|approve-card|approvals|\/approve/i, `${name} must not run anything or touch approvals`);
  }
  assert.doesNotMatch(act, /cards\//, 'office-act.ts must not touch cards/');
});

const DIST = new URL('../../.work/office-dist', import.meta.url).pathname;
const skip = existsSync(join(DIST, 'index.html')) ? false : 'page not built';
async function office(art = false) {
  const v = mkdtempSync(join(tmpdir(), 'act-')); mkdirSync(join(v, 'logs')); mkdirSync(join(v, 'mailbox'));
  writeFileSync(join(v, 'mailbox/to-code.md'), HEAD + OLD); writeFileSync(join(v, 'logs/office-v1.jsonl'), '');
  const dir = mkdtempSync(join(tmpdir(), 'actart-'));
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  if (art) { mkdirSync(join(dir, '1_Room_Builder_Office')); writeFileSync(join(dir, 'Modern_Office_32x32.png'), PNG); writeFileSync(join(dir, '1_Room_Builder_Office/Room_Builder_Office_32x32.png'), PNG); }
  const r = await startOffice({vault: v, staticDir: DIST, logPath: join(v, 'logs/office-v1.jsonl'), open: {}, art: {dir}, mailbox: join(v, 'mailbox/to-code.md')});
  return {r, v, tok: new URL(r.url).hash.slice(3), file: join(v, 'mailbox/to-code.md'), base: `http://127.0.0.1:${r.port}`};
}

test('POST /ask over HTTP: no key 401, wrong or missing Origin 403, 2001 chars 413, control chars 400, 2 calls in 1 s 429, success 200', async () => {
  const {r, tok, file, base} = await office();
  try {
    const post = (body: string, h: Record<string, string> = {}) => fetch(`${base}/ask`, {method: 'POST', headers: {origin: base, 'content-type': 'application/json', ...h}, body});
    const ok = {'x-office-token': tok};
    assert.equal((await post(JSON.stringify({text: 'hi'}))).status, 401);
    assert.equal((await post(JSON.stringify({text: 'hi'}), {...ok, origin: 'http://evil.example'})).status, 403);
    assert.equal((await fetch(`${base}/ask`, {method: 'POST', headers: ok, body: JSON.stringify({text: 'hi'})})).status, 403, 'no Origin at all');
    assert.equal((await post(JSON.stringify({text: 'a'.repeat(2001)}), ok)).status, 413);
    await new Promise((x) => setTimeout(x, 1100));
    assert.equal((await post(JSON.stringify({text: 'bad\u0001'}), ok)).status, 400);
    await new Promise((x) => setTimeout(x, 1100));
    assert.equal((await post(JSON.stringify({text: 'first task'}), ok)).status, 200);
    assert.equal((await post(JSON.stringify({text: 'second task'}), ok)).status, 429);
    assert.match(readFileSync(file, 'utf8'), /^# To code[\s\S]*?\n- \d{4}-\d\d-\d\d \d\d:\d\d · from the office · first task \[todo, office\]\n  first task\n\n- 2026-11-06 17:45/);
  } finally { r.server.closeAllConnections(); r.server.close(); }
});

const needsYou = (v: string) => writeFileSync(join(v, 'logs/office-v1.jsonl'), JSON.stringify({v: 1, seq: 1, ts: new Date().toISOString().slice(0, 19), sid: 'h:aaaaaaaaaaaa', project: 'proof-lab', kind: 'needs_you', tool: null, ok: null, code: 'permission', gate: null}) + '\n');

for (const [name, art] of [['Simple view', false], ['Office view', true]] as const) {
  test(`${name}: ask box sends to the mailbox and says what to do next; a fresh tab with no key or an old cookie is never blank`, {skip, timeout: 90000}, async () => {
    const {r, v, tok, file} = await office(art); needsYou(v);
    const b = await chromium.launch();
    try {
      // 1. fresh tab, no key, no cookie: the old-link message and the page, within 3 s
      const bare = await b.newPage({viewport: {width: 1440, height: 1000}});
      await bare.goto(`http://127.0.0.1:${r.port}/`);
      await bare.waitForSelector('.ob-feedold', {timeout: 3000});
      assert.ok((await bare.$$('#root *')).length > 8, 'the page is not blank');
      assert.match(await bare.innerText('#root'), /This office link is old/);
      await bare.close();
      const ctx = await b.newContext({viewport: {width: 1440, height: 1000}}); // an old cookie: the key from an earlier office run
      await ctx.addCookies([{name: 'office_key', value: 'ab'.repeat(24), url: `http://127.0.0.1:${r.port}/`}]);
      const stale = await ctx.newPage(); await stale.goto(`http://127.0.0.1:${r.port}/`);
      await stale.waitForSelector('.ob-feedold', {timeout: 3000});
      assert.ok((await stale.$$('#root *')).length > 8, 'the page is not blank (old cookie)');
      await ctx.close();
      // 2. the real link: ask box
      const page = await b.newPage({viewport: {width: 1440, height: 1000}});
      await page.goto(r.url);
      await page.waitForSelector('.oa-ask textarea', {timeout: 20000});
      assert.equal(await page.getAttribute('.oa-ask textarea', 'placeholder'), 'What should the builder do?');
      await page.fill('.oa-ask textarea', 'Please add a dark mode toggle');
      await page.click('.oa-ask button');
      await page.waitForSelector('.oa-sent', {timeout: 5000});
      assert.match(await page.innerText('.oa-sent'), /Sent\. In Claude Code say: see mailbox/);
      assert.match(readFileSync(file, 'utf8'), /from the office · Please add a dark mode toggle \[todo, office\]\n  Please add a dark mode toggle/);
      assert.equal(await page.inputValue('.oa-ask textarea'), '', 'the box is empty again');
      assert.equal(tok.length, 48);
      await page.close();
    } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
  });
}

test('Office view: every entry in the side list has an Open or See button', {skip, timeout: 60000}, async () => {
  const {r, v} = await office(true);
  writeFileSync(join(v, 'logs/office-v1.jsonl'), [1, 2, 3].map((n) => JSON.stringify({v: 1, seq: n, ts: new Date().toISOString().slice(0, 19), sid: `h:${String(n).repeat(12)}`, project: ['proof-lab', 'muse-guard', 'command-center'][n - 1], kind: n === 1 ? 'needs_you' : 'tool_end', tool: n === 1 ? null : 'Read', ok: n === 1 ? null : true, code: n === 1 ? 'permission' : null, gate: null})).join('\n') + '\n');
  const b = await chromium.launch();
  try {
    const page = await b.newPage({viewport: {width: 1440, height: 1000}});
    await page.goto(r.url); await page.waitForSelector('.fv-li', {timeout: 20000});
    const entries = await page.$$eval('.fv-side li', (els) => els.map((e) => !!e.querySelector('.fv-open')));
    assert.ok(entries.length >= 3 && entries.every(Boolean), `entries without a button: ${entries.join()}`);
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
});
