import {before, describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join} from 'node:path';
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
      assert.equal(await txt(p, 'project'), 'repo0');
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
      assert.equal(await txt(p, 'receipt-project'), basename(w.repos[1]!));
      assert.equal(await txt(p, 'receipt-banner'), 'Really done. Checked, not claimed.');
      assert.ok(await count(p, 'receipt-row') >= 5);
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
        assert.equal(await txt(p, 'receipt-project'), basename(w.repos[0]!));
        assert.match(await txt(p, 'receipt-title-note'), /card now approved/);
        assert.match(await txt(p, 'receipt-title-note'), /may not be the card the last check ran under/, 'the page says this is not proven');
      });
      const w2 = world({repos: ['done']});
      await run(w2, async (p) => {
        await wait(p, 'receipt');
        assert.equal(await txt(p, 'receipt-title'), basename(w2.repos[0]!));
        assert.equal(await txt(p, 'receipt-project'), basename(w2.repos[0]!));
        assert.equal(await count(p, 'receipt-title-note'), 0);
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
