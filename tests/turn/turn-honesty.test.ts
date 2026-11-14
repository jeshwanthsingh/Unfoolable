import {before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {chromium, type Page} from 'playwright-core';
import {realFs, startTurn} from '../../apps/turn/turn-server.ts';
import type {Fs} from '../../apps/turn/turn-data.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIST = join(ROOT, '.work/turn-dist');
const AXE = join(ROOT, 'node_modules/axe-core/axe.min.js');
const VERIFY = 'last-' + 'verify.json';
const SHA = 'a'.repeat(64);
const APPROVE = '~/Projects/proof-lab/scripts/approve-card ';
type Repo = 'ship' | 'done' | 'fail' | 'bare';
type World = {vault: string; approvalsDir: string; repos: string[]; fs?: Fs};

const card = (vault: string, name: string, repo: string, scope: string) => writeFileSync(join(vault, 'cards', `${name}.md`), `repo: ${repo}\nscope: ${scope}\n`);

// A fake vault (cards: null = no cards folder), a fake approvals dir and fake repos, all under a temp dir.
function world(o: {cards?: [string, string, string][] | null; repos?: Repo[]; fs?: Fs} = {}): World {
  const root = mkdtempSync(join(tmpdir(), 'turn-')), vault = join(root, 'vault'), approvalsDir = join(root, 'appr');
  mkdirSync(vault); mkdirSync(approvalsDir);
  if (o.cards !== null) { mkdirSync(join(vault, 'cards')); for (const [n, repo, scope] of o.cards ?? []) card(vault, n, repo, scope); }
  const repos = (o.repos ?? []).map((k, i) => {
    const r = join(root, `repo${i}`); mkdirSync(join(r, '.claude'), {recursive: true});
    const w = (f: string, v: object) => writeFileSync(join(r, '.claude', f), JSON.stringify(v));
    if (k !== 'bare') w(VERIFY, {verdict: k === 'fail' ? 'FAIL' : 'PASS', card_sha256: SHA});
    if (k === 'ship') w('job.json', {ship_waiting: true}); // a bare check PASS is no longer "waiting to ship"
    if (k === 'done') w('last-ship.json', {verdict: 'PASS', head: 'abc123'});
    return r;
  });
  return {vault, approvalsDir, repos, ...(o.fs ? {fs: o.fs} : {})};
}

type Ctx = {r: Awaited<ReturnType<typeof startTurn>>; reqs: string[]};
async function run(w: World, fn: (p: Page, c: Ctx) => Promise<void>, o: {viewport?: {width: number; height: number}; hash?: boolean} = {}) {
  const r = await startTurn({vault: w.vault, repos: w.repos, approvalsDir: w.approvalsDir, staticDir: DIST, token: 'tok123', headOf: () => 'abc123', ...(w.fs ? {fs: w.fs} : {})});
  const b = await chromium.launch();
  try {
    const p = await b.newPage({viewport: o.viewport ?? {width: 1280, height: 900}, bypassCSP: true, colorScheme: 'light'}); // CSP bypass so axe can run and inline handlers could fire
    const reqs: string[] = [];
    p.on('request', (q) => reqs.push(`${q.method()} ${q.url()}`));
    await p.goto(o.hash === false ? `http://127.0.0.1:${r.port}/` : r.url);
    await fn(p, {r, reqs});
  } finally { await b.close(); r.server.closeAllConnections(); r.server.close(); }
}

const id = (p: Page, t: string) => p.getByTestId(t).first();
const wait = (p: Page, t: string, ms = 10000) => id(p, t).waitFor({timeout: ms});
const txt = (p: Page, t: string) => id(p, t).innerText();
const count = (p: Page, t: string) => p.getByTestId(t).count();
const LABELS = ['Checks', 'Written before the code', 'Reviewer (P1 / P2 / P3)', 'Files touched', 'Started', 'Finished', 'You tried it', 'Proof beyond tests', 'AI work (estimate)', 'Builder says', 'Builder says it checked by hand'];
const lab = (t: string): string => LABELS.filter((l) => t.startsWith(l)).sort((a, b) => b.length - a.length)[0] ?? t; // the longest label that starts the text
const POP = (): World => world({cards: [['alpha-card', '/x/proj', 'Build the thing']], repos: ['ship', 'done']});

describe('Your Turn page tells the truth', () => {
  before(() => { execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/turn/vite.config.ts'], {cwd: ROOT, stdio: 'pipe'}); });

  it('decision card: APPROVE, project, scope, exact approve line, copy button, honesty note; no banner, no empty text', {timeout: 60000}, async () => {
    await run(POP(), async (p) => {
      await wait(p, 'decision');
      const d = p.locator('article[data-testid=decision]');
      assert.equal(await d.getByTestId('kind').innerText(), 'APPROVE');
      assert.equal(await d.getByTestId('project').innerText(), 'proj');
      assert.equal(await d.getByTestId('scope').innerText(), 'Build the thing');
      assert.equal(await d.getByTestId('approve-line').innerText(), `${APPROVE}alpha-card`);
      assert.equal(await d.getByRole('button', {name: /Copy/}).count(), 1);
      assert.equal(await d.getByTestId('copy-button').count(), 1);
      assert.match(await d.getByTestId('cant-vouch').innerText(), /can't check/);
      assert.equal(await count(p, 'not-live'), 0);
      assert.equal(await count(p, 'empty'), 0);
    });
  });

  it('a card file name unsafe for a shell: no approve line, no copy button, a plain warning', {timeout: 60000}, async () => {
    await run(world({cards: [['x; rm -rf ~', '/x/proj', 'odd name']]}), async (p) => {
      await wait(p, 'decision');
      assert.match(await txt(p, 'unsafe-name'), /not safe/i);
      assert.equal(await count(p, 'approve-line'), 0);
      assert.equal(await count(p, 'copy-button'), 0);
      assert.equal(await p.getByRole('button', {name: /Copy/}).count(), 0);
    });
  });

  it('no pending card but a repo waits to ship: SHIP card with project, no approve line, receipt says not shipped', {timeout: 60000}, async () => {
    await run(world({repos: ['ship']}), async (p) => {
      await wait(p, 'decision');
      assert.equal(await txt(p, 'kind'), 'SHIP');
      assert.equal(await txt(p, 'project'), 'repo0 · the main folder'); // the project tag now also says where the record came from
      assert.equal(await count(p, 'approve-line'), 0);
      assert.equal(await txt(p, 'receipt-banner'), 'Checked. Not shipped yet.');
      assert.equal(await count(p, 'empty'), 0);
    });
  });

  it('other items and the receipt: next-item for the ship waiting, shipped receipt first, rows say passed / not recorded', {timeout: 60000}, async () => {
    const w = POP();
    await run(w, async (p) => {
      await wait(p, 'receipt');
      const next = p.getByTestId('next-item');
      assert.equal(await next.count(), 1);
      assert.match(await next.first().innerText(), /SHIP[\s\S]*repo0|repo0[\s\S]*SHIP/);
      assert.equal(await txt(p, 'receipt-project'), `${basename(w.repos[1]!)} · the main folder`);
      assert.equal(await txt(p, 'receipt-banner'), 'Really done. Checked, not claimed.');
      assert.equal(await count(p, 'receipt-row'), 11);
      assert.match(await p.getByTestId('receipt-row').filter({hasText: /checks/i}).first().innerText(), /passed/);
      assert.match(await p.getByTestId('receipt-row').filter({hasText: /you tried it/i}).first().innerText(), /not recorded/);
    });
  });

  it('a repo whose verifier says FAIL gets no receipt; the empty page says "Nothing needs you." and shows no example data', {timeout: 60000}, async () => {
    await run(world({cards: [], repos: ['fail']}), async (p) => {
      await wait(p, 'empty');
      assert.match(await txt(p, 'empty'), /Nothing needs you\./);
      assert.match(await txt(p, 'no-receipt'), /No receipt yet/);
      assert.equal(await count(p, 'receipt'), 0);
      assert.equal(await count(p, 'not-live'), 0);
      const body = await p.locator('body').innerText();
      for (const bad of ['Tutor', 'Sign up', '22 of 22', '$', 'jobs running', 'Touch ID', '7ebd']) assert.ok(!body.includes(bad), `example data on the page: ${bad}`);
    });
  });

  it('missing cards folder: "Not live: ..." banner, "Can\'t tell what needs you", never "Nothing needs you"', {timeout: 60000}, async () => {
    await run(world({cards: null}), async (p) => {
      await wait(p, 'not-live');
      const nl = p.getByTestId('not-live');
      assert.equal(await nl.getAttribute('role'), 'status');
      assert.equal(await nl.innerText(), "Not live: can't read the cards folder. What you see may be old.");
      assert.match(await txt(p, 'cant-tell'), /Can't tell what needs you/);
      assert.equal(await count(p, 'empty'), 0);
      assert.ok(!(await p.locator('body').innerText()).includes('Nothing needs you'));
    });
  });

  it('server gone: banner counts attempts (1, 2, 3...) and the last data stays on screen', {timeout: 60000}, async () => {
    await run(POP(), async (p, {r}) => {
      await wait(p, 'decision');
      r.server.closeAllConnections(); r.server.close();
      for (const n of [1, 2, 3]) await p.getByTestId('not-live').filter({hasText: new RegExp(`^Not live: can't reach this page's server, trying again \\(${n}\\)\\.$`)}).waitFor({timeout: 25000});
      assert.equal(await txt(p, 'project'), 'proj');
    });
  });

  it('server answers 5xx: banner, then it goes away by itself when the server is fine again', {timeout: 60000}, async () => {
    let fail = false;
    const flaky: Fs = {...realFs, read: (x) => { if (fail) throw new Error('boom'); return realFs.read(x); }, list: (x) => { if (fail) throw new Error('boom'); return realFs.list(x); }};
    await run({...POP(), fs: flaky}, async (p) => {
      await wait(p, 'decision');
      fail = true;
      await p.getByTestId('not-live').filter({hasText: /trying again \(1\)/}).waitFor({timeout: 15000});
      assert.equal(await txt(p, 'project'), 'proj');
      fail = false;
      await p.getByTestId('not-live').waitFor({state: 'detached', timeout: 20000});
    });
  });

  it('old link (401): says so, does not retry, root is never empty', {timeout: 60000}, async () => {
    await run(POP(), async (p, {reqs}) => {
      assert.ok(await p.evaluate(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0), 'root empty at first paint');
      await wait(p, 'old-link');
      const t = await txt(p, 'old-link');
      assert.ok(t.includes('This link is old') && t.includes('Open a fresh link'), t);
      await p.waitForTimeout(4000);
      assert.ok(reqs.filter((q) => q.includes('/api/turn')).length <= 2, reqs.join('\n'));
      assert.ok(await p.evaluate(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0), 'root empty');
    }, {hash: false});
  });

  it('read only: every request is a GET, no form, no text field', {timeout: 60000}, async () => {
    await run(POP(), async (p, {reqs}) => {
      await wait(p, 'decision');
      await p.waitForTimeout(6000); // one poll
      assert.ok(reqs.length > 2);
      assert.deepEqual(reqs.filter((q) => !q.startsWith('GET ')), []);
      assert.equal(await p.locator('form, input, textarea, [role=textbox]').count(), 0);
    });
  });

  it('untrusted text from a card renders as plain text', {timeout: 60000}, async () => {
    const scope = '<img src=x onerror="window.__pwned=1"><b>BOLD</b>';
    await run(world({cards: [['evil', '/x/<script>window.__pwned=1</script>', scope]]}), async (p) => {
      await wait(p, 'decision');
      const d = p.getByTestId('decision');
      assert.equal(await d.locator('img, script, b').count(), 0);
      assert.ok((await d.innerText()).includes('<b>BOLD</b>'));
      await p.waitForTimeout(500);
      assert.equal(await p.evaluate(() => (window as any).__pwned), undefined);
    });
  });

  it('polling: a card added after load appears within 9 s', {timeout: 60000}, async () => {
    const w = world({cards: []});
    await run(w, async (p) => {
      await wait(p, 'empty');
      card(w.vault, 'late-card', '/x/late', 'arrived later');
      await wait(p, 'decision', 9000);
      assert.equal(await txt(p, 'project'), 'late');
      assert.equal(await count(p, 'empty'), 0);
    });
  });

  it('no horizontal scroll at 390 px on the populated page', {timeout: 60000}, async () => {
    await run(POP(), async (p) => {
      await wait(p, 'receipt');
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390);
    }, {viewport: {width: 390, height: 800}});
  });

  it('axe: no serious or critical problem in populated, empty and not-live states at 1280 and 390 px', {timeout: 180000}, async () => {
    assert.ok(existsSync(AXE), 'axe-core missing');
    const states: [string, () => World, string][] = [['populated', POP, 'receipt'], ['empty', () => world({cards: []}), 'empty'], ['not-live', () => world({cards: null}), 'not-live']];
    for (const [name, mk, ready] of states) for (const width of [1280, 390]) {
      await run(mk(), async (p) => {
        await wait(p, ready);
        await p.addScriptTag({path: AXE});
        const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
        assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `${name} at ${width}`);
      }, {viewport: {width, height: width === 390 ? 800 : 900}});
    }
  });

  describe('older cards, settled cards and receipt titles', () => {
    const DAY = 86400000;
    const age = (w: World, name: string, days: number) => { const t = new Date(Date.now() - days * DAY); utimesSync(join(w.vault, 'cards', `${name}.md`), t, t); };
    const approve = (w: World, repo: string, source: string) => writeFileSync(join(w.approvalsDir, `${source}.json`), JSON.stringify({repo, source: `${source}.md`, card_sha256: SHA, approved_at: new Date().toISOString()}));
    const oldWorld = (): World => { const w = world({cards: [['stale-card', '/x/oldproj', 'Old scope']]}); age(w, 'stale-card', 4); return w; };

    it('an old unapproved card is hidden under a closed Older list with no approve line, copy button, code or button; the page says Nothing needs you', {timeout: 60000}, async () => {
      await run(oldWorld(), async (p) => {
        await wait(p, 'older');
        assert.equal(await count(p, 'decision'), 0);
        assert.equal(await count(p, 'next-item'), 0);
        assert.match(await txt(p, 'empty'), /Nothing needs you\./);
        const o = p.locator('details[data-testid=older]');
        assert.equal(await o.count(), 1);
        assert.equal(await o.getAttribute('open'), null);
        const summary = await o.locator('summary').innerText();
        assert.ok(summary.includes('Older (hidden)') && summary.includes('1'), summary);
        const item = o.getByTestId('older-item');
        assert.equal(await item.count(), 1);
        const t = (await item.first().textContent()) ?? ''; // textContent: the list is closed, so innerText would be empty
        assert.ok(t.includes('stale-card') && !t.includes('stale-card.md') && t.includes('oldproj'), t);
        for (const bad of ['approve-line', 'copy-button', 'decision']) assert.equal(await o.getByTestId(bad).count(), 0, bad);
        assert.equal(await o.locator('code, button').count(), 0);
        assert.equal(await o.getByRole('button').count(), 0);
      });
    });

    it('a fresh card is the decision and an old one is under Older', {timeout: 60000}, async () => {
      const w = world({cards: [['fresh-card', '/x/freshproj', 'Fresh scope'], ['stale-card', '/x/oldproj', 'Old scope']]});
      age(w, 'stale-card', 4);
      await run(w, async (p) => {
        await wait(p, 'older');
        assert.equal(await count(p, 'decision'), 1);
        assert.equal(await txt(p, 'project'), 'freshproj');
        assert.equal(await txt(p, 'approve-line'), `${APPROVE}fresh-card`);
        assert.equal(await count(p, 'older-item'), 1);
        assert.match((await p.getByTestId('older-item').first().textContent()) ?? '', /stale-card/);
        assert.equal(await count(p, 'empty'), 0);
      });
    });

    it('a card named in approvals-history.jsonl is neither waiting nor older', {timeout: 60000}, async () => {
      const w = world({cards: [['fresh-card', '/x/a', 's'], ['stale-card', '/x/b', 's']]});
      age(w, 'stale-card', 4);
      mkdirSync(join(w.vault, 'logs'));
      writeFileSync(join(w.vault, 'logs', 'approvals-history.jsonl'), '{"card":"fresh-card.md"}\n{"card":"stale-card.md"}\n');
      await run(w, async (p) => {
        await wait(p, 'empty');
        assert.equal(await count(p, 'decision'), 0);
        assert.equal(await count(p, 'older'), 0);
        assert.equal(await count(p, 'older-item'), 0);
      });
    });

    it('a card named by an approval record is neither waiting nor older', {timeout: 60000}, async () => {
      const w = world({cards: [['fresh-card', '/x/a', 's'], ['stale-card', '/x/b', 's']]});
      age(w, 'stale-card', 4);
      approve(w, '/x/a', 'fresh-card'); approve(w, '/x/b', 'stale-card');
      await run(w, async (p) => {
        await wait(p, 'empty');
        assert.equal(await count(p, 'decision'), 0);
        assert.equal(await count(p, 'older'), 0);
        assert.equal(await count(p, 'older-item'), 0);
      });
    });

    it('a card settled by the history is counted, not silently gone: the page says how many are already approved', {timeout: 60000}, async () => {
      const w = world({cards: [['done-card', '/x/p', 'S'], ['todo-card', '/x/p', 'S']]});
      mkdirSync(join(w.vault, 'logs'), {recursive: true});
      writeFileSync(join(w.vault, 'logs', 'approvals-history.jsonl'), JSON.stringify({card: 'done-card.md'}) + '\n');
      await run(w, async (p) => {
        await wait(p, 'decision');
        assert.equal(await txt(p, 'project'), 'p');
        assert.match(await txt(p, 'approve-line'), /todo-card$/);
        assert.match(await txt(p, 'settled-note'), /1 card is already approved/);
      });
    });

    it('the empty state points at the older list when older drafts exist', {timeout: 60000}, async () => {
      await run(oldWorld(), async (p) => {
        await wait(p, 'empty');
        assert.match(await txt(p, 'empty'), /Older \(hidden\)/);
      });
    });

    it('receipt: with an approval record the heading is the card name in words and the project sits under it with a note; without one the heading is the project', {timeout: 60000}, async () => {
      const w = world({repos: ['done']});
      approve(w, w.repos[0]!, 'command-center-last-check');
      await run(w, async (p) => {
        await wait(p, 'receipt');
        assert.equal(await txt(p, 'receipt-title'), 'Command center last check');
        assert.equal(await txt(p, 'receipt-project'), `${basename(w.repos[0]!)} · the main folder`);
        assert.match(await txt(p, 'receipt-title-note'), /card now approved/);
        assert.match(await txt(p, 'receipt-title-note'), /may not be the card the last check ran under/, 'the page says this is not proven');
      });
      const w2 = world({repos: ['done']});
      await run(w2, async (p) => {
        await wait(p, 'receipt');
        assert.equal(await txt(p, 'receipt-title'), basename(w2.repos[0]!));
        assert.equal(await txt(p, 'receipt-project'), `${basename(w2.repos[0]!)} · the main folder`);
        assert.equal(await count(p, 'receipt-title-note'), 0);
      });
    });

    it('receipt rows: labels in order; reviewer ok only at P1 0; outside the card is bad; not recorded is na; title note only for the approvals record', {timeout: 60000}, async () => {
      const put = (w: World, f: string, v: object | string) => writeFileSync(join(w.repos[0]!, '.claude', f), typeof v === 'string' ? v : JSON.stringify(v));
      const rows = async (p: Page) => p.getByTestId('receipt-row').evaluateAll((els) => els.map((e) => ({label: e.children[0]!.textContent, value: e.children[1]!.textContent, cls: e.children[1]!.className})));
      const w = world({repos: ['done']});
      put(w, 'critic.md', 'a.ts:1 | P2 | x\nb.ts:2 | P3 | y\n');
      put(w, 'card.md', 'repo: /x\nallowed_files:\n  - a.ts\nscope: s\n');
      put(w, VERIFY, {verdict: 'PASS', card_sha256: SHA, changed_files: ['a.ts', 'b.ts']});
      put(w, 'job.json', {card: 'job-card-name', tests_first: true, checked_by: 'script', started_at: '2026-03-04T05:06:07Z', finished_at: '2026-03-04T07:08:09Z', cost_usd: 1.5, tried: 'opened it'});
      approve(w, w.repos[0]!, 'approved-other-name');
      await run(w, async (p) => {
        await wait(p, 'receipt');
        const r = await rows(p);
        assert.deepEqual(r.map((x) => lab(x.label!)), LABELS); // the label span may carry a note after the label
        const by = Object.fromEntries(r.map((x) => [lab(x.label!), x]));
        assert.equal(by['Written before the code']!.value, 'yes (script check, can be fooled)');
        assert.notEqual(by['Written before the code']!.cls, 'ok');
        assert.equal(by['Builder says']!.value, 'not recorded');
        assert.equal(by['Builder says']!.cls, 'na');
        assert.equal(by['Builder says it checked by hand']!.cls, 'na');
        assert.equal(by['Reviewer (P1 / P2 / P3)']!.value, '0 / 1 / 1');
        assert.equal(by['Reviewer (P1 / P2 / P3)']!.cls, 'ok');
        assert.equal(by['Files touched']!.value, '2 of 1 allowed files, 1 outside the card');
        assert.equal(by['Files touched']!.cls, 'bad');
        assert.equal(by['Started']!.value, '2026-03-04 05:06 UTC');
        assert.equal(by['Finished']!.value, '2026-03-04 07:08 UTC');
        assert.equal(by['AI work (estimate)']!.value, '$1.50');
        assert.equal(by['Proof beyond tests']!.cls, 'na');
        assert.equal(await txt(p, 'receipt-title'), 'Job card name'); // the job record's card name wins over the approvals record
        assert.equal(await count(p, 'receipt-title-note'), 0); // the note is only for a title from the approvals record
      });
      put(w, 'critic.md', 'a.ts:1 | P1 | x\n');
      put(w, 'job.json', {});
      await run(w, async (p) => {
        await wait(p, 'receipt');
        const by = Object.fromEntries((await rows(p)).map((x) => [lab(x.label!), x]));
        assert.equal(by['Written before the code']!.value, 'not recorded');
        assert.equal(by['Written before the code']!.cls, 'na');
        assert.equal(by['Reviewer (P1 / P2 / P3)']!.cls, 'bad');
        assert.equal(by['Started']!.cls, 'na');
        assert.equal(by['Started']!.value, 'not recorded');
        assert.equal(await txt(p, 'receipt-title'), 'Approved other name');
        assert.match(await txt(p, 'receipt-title-note'), /may not be the card the last check ran under/);
      });
    });

    it('receipt labels: notes in the reviewer and builder labels; Written before the code shows the fixed words; hostile builder text stays text', {timeout: 60000}, async () => {
      const put = (w: World, f: string, v: object) => writeFileSync(join(w.repos[0]!, '.claude', f), JSON.stringify(v));
      const evil = '<img src=x onerror="window.__pwned=1"><b>BOLD</b>‮RTL\u0007END';
      const w = world({repos: ['done']});
      put(w, 'job.json', {tests_first: false, checked_by: 'script', tests_first_reason: evil, starts: 2});
      put(w, 'builder-says.json', {summary: evil, checked_by_hand: 'I clicked every button', tests_first: true, ship_waiting: true, card: 'Lie', head: 'x'});
      await run(w, async (p) => {
        await wait(p, 'receipt');
        const rows = await p.getByTestId('receipt-row').evaluateAll((els) => els.map((e) => ({label: e.children[0]!.textContent ?? '', value: e.children[1]!.textContent ?? '', cls: e.children[1]!.className})));
        const by = Object.fromEntries(rows.map((x) => [lab(x.label), x]));
        assert.match(by['Reviewer (P1 / P2 / P3)']!.label, /from the reviewers' file; the builder writes it/);
        for (const k of ['Builder says', 'Builder says it checked by hand']) assert.match(by[k]!.label, /the builder's own words, not checked/, k);
        for (const k of ['Checks', 'Written before the code', 'Files touched']) assert.ok(!by[k]!.label.includes("the builder's own words"), k);
        const wb = by['Written before the code']!;
        assert.ok(wb.value.startsWith('no (script check): <img src=x onerror="window.__pwned=1"><b>BOLD</b>'), wb.value);
        assert.ok(wb.value.endsWith(', started again'), wb.value);
        assert.ok(!wb.value.includes('‮') && !wb.value.includes('\u0007'));
        assert.notEqual(wb.cls, 'ok');
        assert.ok(by['Builder says']!.value.startsWith('<img src=x onerror="window.__pwned=1"><b>BOLD</b>'));
        assert.equal(by['Builder says it checked by hand']!.value, 'I clicked every button');
        for (const k of ['Builder says', 'Builder says it checked by hand']) assert.ok(!/\b(ok|bad)\b/.test(by[k]!.cls), `${k}: ${by[k]!.cls}`);
        assert.equal(await p.getByTestId('receipt').locator('img, script, b').count(), 0);
        assert.equal(await p.evaluate(() => (window as any).__pwned), undefined);
        assert.equal(await txt(p, 'receipt-title'), basename(w.repos[0]!)); // builder-says never sets the title
      });
    });

    it('the Ship card and next list ignore builder-says: no ship appears from builder-says.json alone', {timeout: 60000}, async () => {
      const w = world({repos: ['done']});
      writeFileSync(join(w.repos[0]!, '.claude', 'builder-says.json'), JSON.stringify({summary: 's', checked_by_hand: 'c', ship_waiting: true, card: 'Lie'}));
      await run(w, async (p) => {
        await wait(p, 'receipt');
        assert.equal(await count(p, 'decision'), 0);
        assert.equal(await count(p, 'next-item'), 0);
      });
    });

    it('axe: no serious or critical problem with the Older list open at 1280 and 390 px', {timeout: 120000}, async () => {
      for (const width of [1280, 390]) {
        await run(oldWorld(), async (p) => {
          await wait(p, 'older');
          await p.locator('details[data-testid=older] summary').click();
          await p.getByTestId('older-item').first().waitFor();
          await p.addScriptTag({path: AXE});
          const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
          assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `older open at ${width}`);
        }, {viewport: {width, height: width === 390 ? 800 : 900}});
      }
    });
  });

  describe('the Map view', () => {
    const mp = (pieces: object[], part: object = {}) => JSON.stringify({project: 'proj', repo: '/x/none', parts: [{id: 'p1', name: 'Part one', plain: 'About part one', pieces, ...part}, {id: 'p2', name: 'Part two', plain: 'About part two', pieces: []}]});
    const pc = (id: string, o: object = {}) => ({id, name: `Piece ${id}`, plain: `plain ${id}`, status: 'idea', needs: [], model: 'claude', ...o});
    const mapWorld = (text: string | null): World => {
      const w = world({cards: []});
      mkdirSync(join(w.vault, 'maps'));
      if (text !== null) writeFileSync(join(w.vault, 'maps', 'proj.json'), text);
      return w;
    };
    const POPMAP = () => mapWorld(mp([pc('a', {status: 'queued', model: 'codex'}), pc('b', {needs: ['a', 'ghost'], card: 'nothing-here', model: 'either'}), pc('c', {status: 'planned', needs: ['b']})]));
    const openMap = async (p: Page) => {
      await wait(p, 'empty', 3000).catch(() => undefined);
      await p.getByRole('tab', {name: /^Map$/}).or(p.getByRole('button', {name: /^Map$/})).first().click({timeout: 3000});
    };

    it('Turn stays the default view; a Map tab or button sits next to it', {timeout: 60000}, async () => {
      await run(POPMAP(), async (p) => {
        await wait(p, 'empty');
        assert.equal(await count(p, 'map-part'), 0);
        assert.equal(await p.getByRole('tab', {name: /^Map$/}).or(p.getByRole('button', {name: /^Map$/})).count(), 1);
      });
    });

    it('one card per part with its pieces; each piece has name, state word, model, from line; plan label only when isPlan', {timeout: 60000}, async () => {
      await run(POPMAP(), async (p) => {
        await openMap(p);
        await wait(p, 'map-part');
        assert.equal(await count(p, 'map-part'), 2);
        assert.equal(await count(p, 'map-piece'), 3);
        const a = p.getByTestId('map-piece').filter({hasText: 'Piece a'});
        assert.equal((await a.getByTestId('piece-state').innerText()).trim().toLowerCase(), 'queued');
        assert.match(await a.innerText(), /codex/i);
        assert.match(await a.innerText(), /the map file \(plan\)/);
        assert.equal(await a.getByTestId('piece-plan').count(), 1);
        assert.match(await a.getByTestId('piece-plan').innerText(), /plan/i);
        assert.match(await p.getByTestId('map-part').first().innerText(), /Part one/);
      });
    });

    it('needs and blocked by: needs text for every piece with needs, blocked by only when blocked; no card gives "no card yet"', {timeout: 60000}, async () => {
      await run(POPMAP(), async (p) => {
        await openMap(p);
        await wait(p, 'map-piece');
        const a = p.getByTestId('map-piece').filter({hasText: 'Piece a'}), b = p.getByTestId('map-piece').filter({hasText: 'Piece b'});
        assert.ok(!/needs:/.test(await a.innerText()));
        assert.ok(!/blocked by/.test(await a.innerText()));
        const bt = await b.innerText();
        assert.match(bt, /needs: a, ghost/);
        assert.match(bt, /blocked by: a, ghost/);
        assert.match(bt, /no card yet/); // its card matches nothing
        assert.match(await a.innerText(), /no card yet/); // no card at all
      });
    });

    it('a piece with a real, computed state is not a plan and says where it came from', {timeout: 60000}, async () => {
      const w = world({cards: [['c1', '/x/none', 'scope']]});
      mkdirSync(join(w.vault, 'maps'));
      writeFileSync(join(w.vault, 'maps', 'proj.json'), mp([pc('a', {card: 'c1'})]));
      await run(w, async (p) => {
        await openMap(p);
        await wait(p, 'map-piece');
        const a = p.getByTestId('map-piece').first();
        assert.match(await a.getByTestId('piece-state').innerText(), /Waiting for your approval/);
        assert.equal(await a.getByTestId('piece-plan').count(), 0);
        assert.match(await a.innerText(), /the cards folder/);
        assert.ok(!/no card yet/.test(await a.innerText()));
      });
    });

    it('an empty map shows a plain empty state', {timeout: 60000}, async () => {
      await run(mapWorld(null), async (p) => {
        await openMap(p);
        await wait(p, 'map-empty');
        assert.equal(await count(p, 'map-part'), 0);
        assert.equal(await count(p, 'not-live'), 0);
      });
    });

    it('an unreadable map says "Not live: the map file cannot be read" and shows no parts', {timeout: 60000}, async () => {
      await run(mapWorld('{not json'), async (p) => {
        await openMap(p);
        await p.getByText('Not live: the map file cannot be read', {exact: false}).first().waitFor({timeout: 10000});
        assert.equal(await count(p, 'map-part'), 0);
        assert.equal(await count(p, 'map-empty'), 0);
      });
    });

    it('hostile text from the file is plain text: no element, no script, bidi controls gone', {timeout: 60000}, async () => {
      const evil = '<img src=x id=pwn onerror="window.__pwn=1"><b id=bold>x</b>';
      await run(mapWorld(mp([pc('a', {name: evil + '‮RTL⁦', plain: '<script>window.__pwn=2</script>'})])), async (p) => {
        await openMap(p);
        await wait(p, 'map-piece');
        assert.equal(await p.locator('#pwn, #bold, [data-testid=map-piece] img, [data-testid=map-piece] script').count(), 0);
        assert.equal(await p.evaluate(() => (globalThis as any).__pwn), undefined);
        const t = await id(p, 'map-piece').innerText();
        assert.ok(t.includes('<img src=x'));
        assert.ok(!/[‪-‮⁦-⁩]/.test(t));
      });
    });

    it('the Map view has no form, input, or button that changes anything, and sends only GETs', {timeout: 60000}, async () => {
      await run(POPMAP(), async (p, {reqs}) => {
        await openMap(p);
        await wait(p, 'map-piece');
        assert.equal(await p.locator('form, input, textarea, select').count(), 0);
        assert.equal(await p.locator('[data-testid=map-part] button, [data-testid=map-part] a[href]').count(), 0);
        assert.ok(reqs.every((q) => q.startsWith('GET ')), reqs.join('\n'));
      });
    });

    it('axe: no serious or critical problem with a populated map at 1280 and 390 px; no horizontal scroll at 390', {timeout: 180000}, async () => {
      assert.ok(existsSync(AXE), 'axe-core missing');
      for (const width of [1280, 390]) {
        await run(POPMAP(), async (p) => {
          await openMap(p);
          await wait(p, 'map-piece');
          await p.addScriptTag({path: AXE});
          const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
          assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `map at ${width}`);
          if (width === 390) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390);
        }, {viewport: {width, height: width === 390 ? 800 : 900}});
      }
    });

    // A project picker: one small tab per map file (data-testid=map-picker holds role=tab buttons), only when there are two or more maps.
    const second = JSON.stringify({project: 'second', repo: '/x/none', parts: [{id: 's1', name: 'Second only part', plain: 'About second', pieces: [pc('z')]}]});
    const TWOMAPS = (): World => { const w = POPMAP(); writeFileSync(join(w.vault, 'maps', 'zeta.json'), second); return w; }; // maps sort: proj, zeta
    const picker = (p: Page) => id(p, 'map-picker').getByRole('tab');

    it('two maps: one tab per map, the first open; clicking the other shows that map; no inputs, only GETs', {timeout: 60000}, async () => {
      await run(TWOMAPS(), async (p, {reqs}) => {
        await openMap(p);
        await wait(p, 'map-piece');
        assert.deepEqual(await picker(p).allInnerTexts(), ['proj', 'zeta']);
        assert.equal(await picker(p).first().getAttribute('aria-selected'), 'true');
        assert.equal(await picker(p).last().getAttribute('aria-selected'), 'false');
        assert.equal(await p.getByTestId('map-part').filter({hasText: 'Part one'}).count(), 1);
        await picker(p).last().click();
        await p.getByTestId('map-part').filter({hasText: 'Second only part'}).waitFor({timeout: 10000});
        assert.equal(await p.getByTestId('map-part').filter({hasText: 'Part one'}).count(), 0);
        assert.equal(await picker(p).last().getAttribute('aria-selected'), 'true');
        assert.equal(await p.locator('form, input, textarea, select').count(), 0);
        assert.equal(await p.locator('[data-testid=map-part] button, [data-testid=map-part] a[href]').count(), 0);
        assert.ok(reqs.every((q) => q.startsWith('GET ')), reqs.join('\n'));
        assert.ok(reqs.some((q) => q.includes('/api/map?project=zeta')), reqs.join('\n'));
      });
    });

    it('a single map draws no picker', {timeout: 60000}, async () => {
      await run(POPMAP(), async (p) => {
        await openMap(p);
        await wait(p, 'map-piece');
        assert.equal(await count(p, 'map-picker'), 0);
      });
    });

    it('the picker is keyboard operable (focus a tab, press Enter) and axe-clean at 1280 and 390 px', {timeout: 180000}, async () => {
      assert.ok(existsSync(AXE), 'axe-core missing');
      for (const width of [1280, 390]) {
        await run(TWOMAPS(), async (p) => {
          await openMap(p);
          await wait(p, 'map-piece');
          await picker(p).last().focus();
          await p.keyboard.press('Enter');
          await p.getByTestId('map-part').filter({hasText: 'Second only part'}).waitFor({timeout: 10000});
          await p.addScriptTag({path: AXE});
          const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
          assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `picker at ${width}`);
          if (width === 390) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390);
        }, {viewport: {width, height: width === 390 ? 800 : 900}});
      }
    });

    it('no maps: the empty state names the command', {timeout: 60000}, async () => {
      await run(mapWorld(null), async (p) => {
        await openMap(p);
        await wait(p, 'map-empty');
        assert.match(await txt(p, 'map-empty'), /scripts\/map-add <name> <repo-folder>/);
      });
    });
  });

  it('source checks: the new web file Map.tsx exists and is covered by the banned-call scan', () => {
    const f = join(ROOT, 'apps/turn/web/Map.tsx');
    assert.ok(existsSync(f), 'apps/turn/web/Map.tsx is missing');
    const s = readFileSync(f, 'utf8');
    for (const b of ['child_process', 'dangerouslySetInnerHTML', 'innerHTML', "method: 'POST'", 'method: "POST"', 'XMLHttpRequest', 'eval(', 'new Function', '<form', '<input']) assert.ok(!s.includes(b), `Map.tsx contains ${b}`);
    assert.ok(!/(?<![.\w])exec\(/.test(s));
    assert.ok(!/method:\s*['"](POST|PUT|DELETE|PATCH)/i.test(s));
  });

  it('source checks: the page has source files and none uses a banned call', () => {
    const web = readdirSync(join(ROOT, 'apps/turn/web'), {recursive: true}).map((f) => join(ROOT, 'apps/turn/web', String(f))).filter((f) => statSync(f).isFile());
    assert.ok(web.length > 0, 'no page source in apps/turn/web');
    const own = readdirSync(join(ROOT, 'apps/turn')).filter((f) => f.endsWith('.ts')).map((f) => join(ROOT, 'apps/turn', f));
    const banned = ['child_process', 'dangerouslySetInnerHTML', 'innerHTML', "method: 'POST'", 'method: "POST"', 'XMLHttpRequest', 'eval(', 'new Function'];
    for (const f of [...own, ...web]) {
      const s = readFileSync(f, 'utf8');
      for (const b of banned) assert.ok(!s.includes(b), `${f} contains ${b}`);
      assert.ok(!/(?<![.\w])exec\(/.test(s), `${f} calls exec(`);
    }
  });
});

describe('where a receipt came from, and the receipt column layout', () => {
  before(() => { execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/turn/vite.config.ts'], {cwd: ROOT, stdio: 'pipe'}); }); // own build: this block also runs alone
  const put = (dir: string, f: string, v: object) => writeFileSync(join(dir, f), JSON.stringify(v));
  const PASS = {verdict: 'PASS', card_sha256: SHA};
  // A receipt from the main folder, a live worktree or an archived folder. For live/archived the main folder has no check record, so that place wins.
  function placed(kind: 'main' | 'live' | 'archived', o: {ship?: boolean} = {}): {w: World; name: string} {
    const w = world({repos: [kind === 'main' ? 'done' : 'bare']});
    const repo = w.repos[0]!, name = basename(repo);
    if (kind === 'live') {
      const wt = join(dirname(repo), `${name}-wt`, 'w1'), g = join(repo, '.git', 'worktrees', 'w1');
      mkdirSync(join(wt, '.claude'), {recursive: true}); mkdirSync(g, {recursive: true});
      writeFileSync(join(g, 'gitdir'), `${wt}/.git\n`);
      put(join(wt, '.claude'), VERIFY, PASS);
      put(join(wt, '.claude'), 'job.json', o.ship ? {ship_waiting: true} : {card: 'live-card'});
    }
    if (kind === 'archived') {
      const d = join(w.vault, '90-archive', 'worktrees', `2026-11-13-${name}-w9`);
      mkdirSync(d, {recursive: true});
      put(d, VERIFY, PASS); put(d, 'job.json', {card: 'arch-card'});
    }
    return {w, name};
  }
  // Rewrites the /api/turn answer, then reloads so the page's first render uses it.
  const edit = async (p: Page, f: (j: any) => void) => {
    await p.route('**/api/turn', async (route) => { const res = await route.fetch(); const j = await res.json(); f(j); await route.fulfill({response: res, json: j}); });
    await p.reload();
  };

  for (const [kind, phrase] of [['main', 'the main folder'], ['live', 'a build in progress'], ['archived', 'an archived build (2026-11-13)']] as const) {
    it(`the receipt project line shows "<project> · ${phrase}"`, {timeout: 60000}, async () => {
      const {w, name} = placed(kind);
      await run(w, async (p) => {
        await wait(p, 'receipt');
        assert.equal(await txt(p, 'receipt-project'), `${name} · ${phrase}`);
      });
    });
  }

  it('no `where` in the answer: the receipt project line is just the project name', {timeout: 60000}, async () => {
    const {w, name} = placed('main');
    await run(w, async (p) => {
      await edit(p, (j) => { for (const r of j.receipts) delete r.where; for (const s of j.ships) delete s.where; });
      await wait(p, 'receipt');
      assert.equal(await txt(p, 'receipt-project'), name);
    });
  });

  it('the Ship card project tag shows "<project> · <where>" (main folder, and a live build)', {timeout: 60000}, async () => {
    await run(world({repos: ['ship']}), async (p) => {
      await wait(p, 'decision');
      assert.equal(await txt(p, 'kind'), 'SHIP');
      assert.equal(await txt(p, 'project'), 'repo0 · the main folder');
    });
    const {w, name} = placed('live', {ship: true});
    await run(w, async (p) => {
      await wait(p, 'decision');
      assert.equal(await txt(p, 'kind'), 'SHIP');
      assert.equal(await txt(p, 'project'), `${name} · a build in progress`);
    });
  });

  it('a hostile `where` is plain text: no element, no script, page does not blank', {timeout: 60000}, async () => {
    const evil = '<img src=x id=pwn onerror="window.__pwn=1">‮RTL⁦' + 'x'.repeat(500);
    await run(world({repos: ['ship', 'done']}), async (p) => {
      await edit(p, (j) => { for (const r of j.receipts) r.where = evil; for (const s of j.ships) s.where = evil; });
      await wait(p, 'receipt');
      await p.waitForTimeout(500);
      assert.equal(await p.locator('#pwn, [data-testid=receipt] img, [data-testid=decision] img').count(), 0);
      assert.equal(await p.evaluate(() => (globalThis as any).__pwn), undefined);
      assert.ok(await p.locator('h1').first().isVisible(), 'heading missing');
      assert.ok(await count(p, 'receipt-title') > 0 && await count(p, 'project') > 0);
      // it must also be shown (as text), not dropped: a page that ignores `where` would pass the checks above
      assert.ok((await txt(p, 'receipt-project')).includes('<img src=x'), 'where is not shown as text');
      assert.ok(!/[‪-‮⁦-⁩]/.test((await txt(p, 'receipt-project')) + (await txt(p, 'project'))), 'bidi controls rendered');
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 1280);
    });
  });

  // The R1c-style receipt: job record fields, builder-says text, and a long "no (script check)" reason.
  function longReceipt(): World {
    const w = world({repos: ['done']}), d = join(w.repos[0]!, '.claude'), long = 'a very long reason without any break opportunity ' + 'LongWordWithoutSpaces'.repeat(6) + ' 2/9/7 1234567890123456789';
    put(d, 'job.json', {card: 'long-card-name-for-layout', tests_first: false, checked_by: 'script', tests_first_reason: long, starts: 2, started_at: '2026-03-04T05:06:07Z', finished_at: '2026-03-04T07:08:09Z', cost_usd: 1.5, tried: long});
    put(d, 'builder-says.json', {summary: long + long, checked_by_hand: long});
    put(d, 'critic.md', 'a.ts:1 | P2 | x\nb.ts:2 | P3 | y\n');
    put(d, VERIFY, {verdict: 'PASS', card_sha256: SHA, changed_files: ['a.ts', 'b.ts', 'c.ts']});
    return w;
  }
  const rowChecks = (p: Page) => p.getByTestId('receipt-row').evaluateAll((els) => els.map((e) => {
    const [l, v] = [e.children[0] as HTMLElement, e.children[1] as HTMLElement];
    return {label: (l.textContent ?? '').slice(0, 30), lw: l.getBoundingClientRect().width, vOver: v.scrollWidth > v.clientWidth};
  }));

  for (const [width, minLabel] of [[1280, 128], [390, 120]] as const) {
    it(`layout at ${width} px: label column >= ${minLabel} px, no value overflows, no horizontal scroll`, {timeout: 60000}, async () => {
      await run(longReceipt(), async (p) => {
        await wait(p, 'receipt');
        const rows = await rowChecks(p);
        assert.equal(rows.length, 11);
        for (const r of rows) assert.ok(r.lw >= minLabel, `label "${r.label}" is ${r.lw.toFixed(1)} px wide, need >= ${minLabel}`);
        for (const r of rows) assert.ok(!r.vOver, `value of "${r.label}" overflows its span`);
        assert.ok(await p.getByTestId('receipt').evaluate((e) => e.scrollWidth <= e.clientWidth), 'receipt panel scrolls sideways');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= width, 'page scrolls sideways');
      }, {viewport: {width, height: width === 390 ? 800 : 900}});
    });
  }

  it('axe: no serious or critical problem with the long receipt (with its where line) at 1280 and 390 px', {timeout: 120000}, async () => {
    for (const width of [1280, 390]) {
      await run(longReceipt(), async (p) => {
        await wait(p, 'receipt');
        assert.match(await txt(p, 'receipt-project'), / · the main folder$/);
        await p.addScriptTag({path: AXE});
        const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
        assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `long receipt at ${width}`);
      }, {viewport: {width, height: width === 390 ? 800 : 900}});
    }
  });
});

describe('one status source for the header and the banners', () => {
  before(() => { execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/turn/vite.config.ts'], {cwd: ROOT, stdio: 'pipe'}); }); // own build: this block also runs alone
  const header = (p: Page) => p.locator('header.top p.live').first(); // class "live" (Live) or "live off" (Not live)
  const banners = (p: Page) => p.locator('p.notlive[role=status]'); // every "Not live: ..." banner, in either view
  const OLDER = /older than the page.*type turn again/is;
  const mapsWorld = (n: 1 | 2): World => {
    const w = world({cards: []});
    mkdirSync(join(w.vault, 'maps'));
    const m = (name: string) => JSON.stringify({project: name, repo: '/x/none', parts: [{id: 'p1', name: `Part of ${name}`, plain: 'About it', pieces: [{id: 'a', name: 'Piece a', plain: 'plain a', status: 'idea', needs: [], model: 'claude'}]}]});
    writeFileSync(join(w.vault, 'maps', 'proj.json'), m('proj'));
    if (n === 2) writeFileSync(join(w.vault, 'maps', 'zeta.json'), m('zeta'));
    return w;
  };
  const openMap = async (p: Page) => { await p.getByRole('tab', {name: /^Map$/}).or(p.getByRole('button', {name: /^Map$/})).first().click({timeout: 5000}); };
  // Sets the route, then reloads so the page's first asks go through it.
  const routed = async (p: Page, pat: string, how: 'notfound' | 'abort') => {
    await p.route(pat, (route) => (how === 'abort' ? route.abort('connectionrefused') : route.fulfill({status: 404, contentType: 'text/plain', body: 'not found'})));
    await p.reload();
  };

  it('Map open, /api/maps answers 404: header says "Not live" (never "Live"), banner says the server is older and to type turn again; they agree', {timeout: 60000}, async () => {
    await run(mapsWorld(1), async (p) => {
      await routed(p, '**/api/maps', 'notfound');
      await openMap(p);
      await banners(p).filter({hasText: OLDER}).first().waitFor({timeout: 15000});
      assert.equal((await header(p).innerText()).trim(), 'Not live');
      assert.match((await header(p).getAttribute('class')) ?? '', /\boff\b/);
      assert.ok(!/Live/.test(await header(p).innerText()), 'header says Live');
      assert.equal(await banners(p).count(), 1, 'exactly one banner');
      assert.match(await banners(p).first().innerText(), /^Not live: /);
      assert.doesNotMatch(await banners(p).first().innerText(), /can't reach/i);
      assert.equal(await count(p, 'map-part'), 0);
    });
  });

  it('Map open, /api/maps aborted (network failure): header says "Not live", banner says it cannot reach the server', {timeout: 60000}, async () => {
    await run(mapsWorld(1), async (p) => {
      await routed(p, '**/api/maps', 'abort');
      await openMap(p);
      await banners(p).filter({hasText: /can't reach this page's server/}).first().waitFor({timeout: 15000});
      assert.equal((await header(p).innerText()).trim(), 'Not live');
      assert.match((await header(p).getAttribute('class')) ?? '', /\boff\b/);
      assert.equal(await banners(p).count(), 1, 'exactly one banner');
      assert.doesNotMatch(await banners(p).first().innerText(), /older than the page/i);
    });
  });

  for (const [label, w] of [['Turn view', () => mapsWorld(1)], ['Map view, one map', () => mapsWorld(1)], ['Map view, two maps', () => mapsWorld(2)]] as const) {
    it(`everything working (${label}): header says "Live · checked HH:MM", no not-live banner`, {timeout: 60000}, async () => {
      await run(w(), async (p) => {
        await wait(p, 'empty');
        if (label !== 'Turn view') { await openMap(p); await wait(p, 'map-part'); }
        await p.waitForTimeout(1500); // a late failure would show by now
        assert.match((await header(p).innerText()).trim(), /^Live · checked \d{1,2}:\d{2}/);
        assert.doesNotMatch((await header(p).getAttribute('class')) ?? '', /\boff\b/);
        assert.equal(await banners(p).count(), 0);
        assert.equal(await count(p, 'not-live'), 0);
      });
    });
  }

  it('Turn view, unreadable rail (no cards folder): same header + banner pair as before', {timeout: 60000}, async () => {
    await run(world({cards: null}), async (p) => {
      await wait(p, 'not-live');
      assert.equal((await header(p).innerText()).trim(), 'Not live');
      assert.equal(await txt(p, 'not-live'), "Not live: can't read the cards folder. What you see may be old.");
      assert.equal(await banners(p).count(), 1);
    });
  });

  it('Turn view, /api/turn aborted: header "Not live" and the "can\'t reach" banner (unchanged)', {timeout: 60000}, async () => {
    await run(mapsWorld(1), async (p) => {
      await routed(p, '**/api/turn', 'abort');
      await p.getByTestId('not-live').filter({hasText: /^Not live: can't reach this page's server, trying again \(\d+\)\.$/}).first().waitFor({timeout: 15000});
      assert.equal((await header(p).innerText()).trim(), 'Not live');
    });
  });

  // Guard: the Ship heading already uses the job record's card title (may pass before the change).
  const shipWorld = (card: string | undefined): World => {
    const w = world({repos: ['ship']});
    writeFileSync(join(w.repos[0]!, '.claude', 'job.json'), JSON.stringify({ship_waiting: true, ...(card !== undefined ? {card} : {})}));
    return w;
  };
  it('Ship card heading uses the card title from the job record, not the repo folder name', {timeout: 60000}, async () => {
    await run(shipWorld('my-card-title'), async (p) => {
      await wait(p, 'decision');
      assert.equal(await txt(p, 'kind'), 'SHIP');
      assert.equal((await p.locator('[data-testid=decision] h1').innerText()).trim(), 'My card title passed its last check');
      assert.ok(!(await p.locator('[data-testid=decision] h1').innerText()).includes('repo0'));
    });
  });
  it('Ship card heading falls back to the repo folder name only when the job record has no card name', {timeout: 60000}, async () => {
    await run(shipWorld(undefined), async (p) => {
      await wait(p, 'decision');
      assert.equal((await p.locator('[data-testid=decision] h1').innerText()).trim(), 'repo0 passed its last check');
    });
  });
});

describe('rail strip and this week', () => {
  before(() => { execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/turn/vite.config.ts'], {cwd: ROOT, stdio: 'pipe'}); }); // own build: this block also runs alone
  const header = (p: Page) => p.locator('header.top p.live').first();
  const WEEK_LABELS = ['Pieces shipped with proof', 'Problems found after shipping', 'Times you had to step in', 'Typical start-to-checked time', 'AI work (estimate)'];
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const openMap = async (p: Page) => { await p.getByRole('tab', {name: /^Map$/}).or(p.getByRole('button', {name: /^Map$/})).first().click({timeout: 5000}); };
  // A repo whose records give a real ship, a 10 minute start-to-check time and a recorded cost; one card waits, so "1 need you". One map with two pieces.
  const recorded = (): World => {
    const w = world({cards: [['alpha-card', '/x/proj', 'Build the thing']], repos: ['bare']});
    const put = (f: string, v: object) => writeFileSync(join(w.repos[0]!, '.claude', f), JSON.stringify(v));
    put(VERIFY, {verdict: 'PASS', head: 'abc123', timestamp: hoursAgo(0.5)});
    put('job.json', {card: 'c1', started_at: hoursAgo(0.5 + 10 / 60), finished_at: hoursAgo(0.5), cost_usd: 1.25, head: 'abc123'});
    put('last-ship.json', {verdict: 'PASS', head: 'abc123', timestamp: hoursAgo(0.25)});
    mkdirSync(join(w.vault, 'maps'));
    const pc = (id: string) => ({id, name: `Piece ${id}`, plain: 'p', status: 'idea', needs: [], model: 'claude'});
    writeFileSync(join(w.vault, 'maps', 'proj.json'), JSON.stringify({project: 'proj', repo: w.repos[0], parts: [{id: 'p1', name: 'Part one', plain: 'About', pieces: [pc('a'), pc('b')]}]}));
    return w;
  };
  // Records that exist today: a check PASS and nothing else (no ship, no cost, no map).
  const norecord = (): World => world({cards: [], repos: ['done']});
  const rowOf = (p: Page, label: string) => p.getByTestId('week-row').filter({hasText: label}).first();

  it('the strip line sits under the header in the Turn view and the Map view, in plain words, from the same answer', {timeout: 60000}, async () => {
    await run(recorded(), async (p) => {
      await wait(p, 'rail-strip');
      const line = (await txt(p, 'rail-strip')).replace(/\s+/g, ' ').trim();
      assert.match(line, /^\d+ building · \d+ need you/);
      assert.match(line, /^0 building · 1 need you · /);
      assert.match(line, /\d+ of 2 pieces shipped with proof/);
      assert.match(line, /AI work today: \$1\.25$/);
      assert.ok(await p.evaluate(() => { const h = document.querySelector('header.top'); const s = document.querySelector('[data-testid=rail-strip]'); return !!h && !!s && !!(h.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'the strip comes after the header');
      await openMap(p);
      await wait(p, 'map-part');
      assert.equal(await count(p, 'rail-strip'), 1);
      assert.equal((await txt(p, 'rail-strip')).replace(/\s+/g, ' ').trim(), line);
    });
  });

  it('with no map pieces and no cost source the strip leaves out "X of Y" and says "AI work today: not recorded"', {timeout: 60000}, async () => {
    await run(norecord(), async (p) => {
      await wait(p, 'rail-strip');
      const line = (await txt(p, 'rail-strip')).replace(/\s+/g, ' ').trim();
      assert.match(line, /^0 building · 0 need you/);
      assert.doesNotMatch(line, /pieces shipped with proof/);
      assert.match(line, /AI work today: not recorded$/);
      assert.ok(!line.includes('$'));
    });
  });

  it('"This week" panel: only on the Turn view, five rows in order, a number beside each "last week: ...", and the honesty line', {timeout: 60000}, async () => {
    await run(recorded(), async (p) => {
      await wait(p, 'week-panel');
      assert.match(await txt(p, 'week-panel'), /This week/);
      assert.equal(await count(p, 'week-row'), 5);
      const rows = p.getByTestId('week-row');
      for (let i = 0; i < 5; i++) assert.ok((await rows.nth(i).innerText()).includes(WEEK_LABELS[i]!), `row ${i + 1} is ${WEEK_LABELS[i]}`);
      for (const l of WEEK_LABELS) assert.match(await rowOf(p, l).getByTestId('week-before').innerText(), /^last week: (\d[\d.,:a-z ]*|not recorded)$/i);
      assert.match(await rowOf(p, 'Pieces shipped').getByTestId('week-now').innerText(), /^1\b/);
      assert.match(await rowOf(p, 'Typical start').getByTestId('week-now').innerText(), /10/); // ten minutes
      assert.match(await rowOf(p, 'AI work').getByTestId('week-now').innerText(), /\$1\.25/);
      assert.match(await txt(p, 'week-note'), /every number comes from the rail's records only/i);
      assert.match(await txt(p, 'week-note'), /not recorded.*nothing writes it yet/i);
      await openMap(p);
      await wait(p, 'map-part');
      assert.equal(await count(p, 'week-panel'), 0);
      assert.equal(await count(p, 'week-row'), 0);
    });
  });

  it('figures nobody writes read "not recorded", never 0 and never a guess; the mockup numbers never appear', {timeout: 60000}, async () => {
    await run(norecord(), async (p) => {
      await wait(p, 'week-panel');
      for (const l of ['Problems found after shipping', 'Times you had to step in', 'Typical start-to-checked time', 'AI work (estimate)']) {
        assert.equal((await rowOf(p, l).getByTestId('week-now').innerText()).trim(), 'not recorded', l);
        assert.equal((await rowOf(p, l).getByTestId('week-before').innerText()).trim(), 'last week: not recorded', l);
      }
      assert.match(await rowOf(p, 'Pieces shipped').getByTestId('week-now').innerText(), /^(0|not recorded)\b/);
      const body = await p.locator('body').innerText();
      for (const made of ['$31', '7 shipped', 'was 4', '$0', '$ 0']) assert.ok(!body.includes(made), `made-up number on the page: ${made}`);
      assert.ok(!body.includes('$'));
      await openMap(p);
      assert.ok(!(await p.locator('body').innerText()).includes('$31'));
    });
  });

  it('when /api/turn is down on load: header "Not live", the one banner, and no strip or panel drawn from nothing', {timeout: 60000}, async () => {
    await run(recorded(), async (p) => {
      await p.route('**/api/turn', (route) => route.abort('connectionrefused'));
      await p.reload();
      await p.getByTestId('not-live').filter({hasText: /^Not live: can't reach this page's server, trying again \(\d+\)\.$/}).first().waitFor({timeout: 15000});
      assert.equal((await header(p).innerText()).trim(), 'Not live');
      assert.equal(await count(p, 'rail-strip'), 0);
      assert.equal(await count(p, 'week-panel'), 0);
    });
  });

  it('when /api/turn goes down after a good load: the strip and panel never show without the Not live banner', {timeout: 60000}, async () => {
    await run(recorded(), async (p) => {
      await wait(p, 'week-panel');
      await wait(p, 'rail-strip');
      await p.route('**/api/turn', (route) => route.abort('connectionrefused'));
      await p.getByTestId('not-live').filter({hasText: /^Not live: can't reach this page's server, trying again \(\d+\)\.$/}).first().waitFor({timeout: 30000});
      assert.equal((await header(p).innerText()).trim(), 'Not live');
      assert.equal(await p.locator('p.notlive[role=status]').count(), 1); // still ONE status
      assert.equal(await count(p, 'rail-strip') + await count(p, 'week-panel') === 0 || await count(p, 'not-live') > 0, true);
    });
  });

  it('when the link turns old (401) after a good load: "This link is old" shows and no strip or panel is drawn above it', {timeout: 60000}, async () => {
    await run(recorded(), async (p) => {
      await wait(p, 'rail-strip');
      await p.route('**/api/turn', (route) => route.fulfill({status: 401, body: 'Needs the launch token.'}));
      await p.getByTestId('old-link').waitFor({timeout: 30000});
      assert.equal(await count(p, 'rail-strip'), 0);
      assert.equal(await count(p, 'week-panel'), 0);
    });
  });

  it('axe: no serious or critical problem with the strip and the panel, in both views, at 1280 and 390 px; no horizontal scroll at 390', {timeout: 240000}, async () => {
    assert.ok(existsSync(AXE), 'axe-core missing');
    for (const width of [1280, 390]) for (const view of ['turn', 'map'] as const) {
      await run(recorded(), async (p) => {
        await wait(p, 'week-panel');
        if (view === 'map') { await openMap(p); await wait(p, 'map-part'); }
        await wait(p, 'rail-strip');
        await p.addScriptTag({path: AXE});
        const res = await p.evaluate(() => (globalThis as any).axe.run()) as {violations: {id: string; impact: string; nodes: unknown[]}[]};
        assert.deepEqual(res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} x${v.nodes.length}`), [], `${view} at ${width}`);
        if (width === 390) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, `${view} scrolls sideways`);
      }, {viewport: {width, height: width === 390 ? 800 : 900}});
    }
  });
});
