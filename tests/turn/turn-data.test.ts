import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {pendingCards, olderCards, cardLists, approvedTitle, shipsWaiting, receipt} from '../../apps/turn/turn-data.ts';

type Fs = {
  read(path: string): string | null;
  list(path: string): string[] | null;
  mtime?(path: string): number | null;
  readTail?(path: string, maxChars: number): string | null;
};

// In-memory fake: only read/list/mtime exist, so the code under test cannot write.
// mtime is "fresh" by default so the older tests keep their meaning; tests that care pass `now` and ages.
function fakeFs(files: Record<string, string>, dirs: string[] = []): Fs {
  const m = new Map(Object.entries(files));
  return {
    read: (p) => (m.has(p) ? m.get(p)! : null),
    list: (p) => {
      const names = [...m.keys()]
        .filter((k) => k.slice(0, k.lastIndexOf('/')) === p)
        .map((k) => k.slice(k.lastIndexOf('/') + 1));
      return names.length || dirs.includes(p) ? names : null;
    },
    mtime: () => NOW,
  };
}

const NOW = Date.now(); // fixed at load: fresh against both the explicit `now` and the real clock
const DAY = 86_400_000;
const HIST = '/vault/logs/approvals-history.jsonl';
// A fake whose card files have the given age in ms before NOW (cards not listed are fresh).
function agedFs(files: Record<string, string>, ages: Record<string, number>): Fs {
  return {...fakeFs(files), mtime: (p) => NOW - (ages[p.slice(p.lastIndexOf('/') + 1)] ?? 0)};
}
const hl = (card: string) => JSON.stringify({card});

const V = '/vault';
const A = '/approvals';
const approveLine = (n: string) => `~/Projects/proof-lab/scripts/approve-card ${n}`;
const VERIFY = (r: string) => `${r}/.claude/last-verify.json`;
const SHIP = (r: string) => `${r}/.claude/last-ship.json`;

test('pendingCards: reads repo/scope, name without .md, exact approveLine', () => {
  const fs = fakeFs({
    [`${V}/cards/my-card.md`]: 'title\nrepo: /r/one\nscope: do things\nrepo: /ignored\nscope: ignored\n',
  });
  assert.deepEqual(pendingCards(fs, V, A), [
    {name: 'my-card', repo: '/r/one', scope: 'do things', approveLine: approveLine('my-card')},
  ]);
});

test('pendingCards: missing repo/scope become empty strings', () => {
  const fs = fakeFs({[`${V}/cards/x.md`]: 'nothing here\n'});
  const [p] = pendingCards(fs, V, A);
  assert.equal(p!.repo, '');
  assert.equal(p!.scope, '');
});

test('pendingCards: missing cards dir returns []', () => {
  assert.deepEqual(pendingCards(fakeFs({}), V, A), []);
});

test('pendingCards: non-.md files ignored, result sorted by name', () => {
  const fs = fakeFs({
    [`${V}/cards/b.md`]: 'repo: r\n',
    [`${V}/cards/a.md`]: 'repo: r\n',
    [`${V}/cards/notes.txt`]: 'repo: r\n',
    [`${V}/cards/c.json`]: '{}',
  });
  assert.deepEqual(pendingCards(fs, V, A).map((p) => p.name), ['a', 'b']);
});

test('pendingCards: approved card (json source == file name) is not pending', () => {
  const fs = fakeFs({
    [`${V}/cards/done.md`]: 'repo: r\n',
    [`${V}/cards/todo.md`]: 'repo: r\n',
    [`${A}/1.json`]: JSON.stringify({source: 'done.md'}),
  });
  assert.deepEqual(pendingCards(fs, V, A).map((p) => p.name), ['todo']);
});

test('pendingCards: unparseable approval json never hides a card', () => {
  const fs = fakeFs({
    [`${V}/cards/c.md`]: 'repo: r\n',
    [`${A}/bad.json`]: '{not json "source": "c.md"',
    [`${A}/readme.txt`]: '{"source":"c.md"}',
  });
  assert.deepEqual(pendingCards(fs, V, A).map((p) => p.name), ['c']);
});

test('pendingCards: an approval whose source differs only in case still settles the card (the safe side: macOS files ignore case)', () => {
  const fs = fakeFs({
    [`${V}/cards/my-card.md`]: 'repo: r\n',
    [`${A}/1.json`]: JSON.stringify({source: 'My-Card.md'}),
  });
  assert.deepEqual(pendingCards(fs, V, A).map((p) => p.name), []);
});

const verify = (verdict: string, extra: object = {}) => JSON.stringify({verdict, ...extra});
const JOB = (r: string) => `${r}/.claude/job.json`;
const CARDMD = (r: string) => `${r}/.claude/card.md`;
const job = (o: object = {}) => JSON.stringify(o);
const WAIT = job({ship_waiting: true});
const fmt = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const ship = (verdict: string, head: string) => JSON.stringify({verdict, head});

test('shipsWaiting: waiting when verify PASS, head known, no matching PASS ship; input order kept', () => {
  const fs = fakeFs({
    [VERIFY('/a')]: verify('PASS'), [JOB('/a')]: WAIT,
    [VERIFY('/b')]: verify('PASS'), [JOB('/b')]: WAIT,
    [SHIP('/b')]: ship('PASS', 'old'),
    [VERIFY('/c')]: verify('PASS'), [JOB('/c')]: WAIT,
    [SHIP('/c')]: ship('PASS', 'h3'),
    [VERIFY('/d')]: verify('FAIL'), [JOB('/d')]: WAIT,
    [VERIFY('/e')]: '{broken', [JOB('/e')]: WAIT,
    [VERIFY('/f')]: verify('PASS'), [JOB('/f')]: WAIT,
    [VERIFY('/g')]: verify('PASS'), [JOB('/g')]: WAIT,
    [SHIP('/g')]: ship('FAIL', 'h7'),
    [VERIFY('/h')]: verify('PASS'), [JOB('/h')]: WAIT,
    [SHIP('/h')]: 'garbage',
  });
  const heads: Record<string, string | null> = {
    '/a': 'h1', '/b': 'h2', '/c': 'h3', '/d': 'h4', '/e': 'h5', '/f': null, '/g': 'h7', '/h': 'h8',
  };
  const out = shipsWaiting(fs, ['/h', '/g', '/f', '/e', '/d', '/c', '/b', '/a', '/missing'], (r) => heads[r] ?? null);
  assert.deepEqual(out, [
    {repo: '/h', head: 'h8'},
    {repo: '/g', head: 'h7'},
    {repo: '/b', head: 'h2'},
    {repo: '/a', head: 'h1'},
  ]);
});

const KEYS = ['checks', 'tests written first', 'reviewer', 'files touched', 'started', 'finished', 'tried by you', 'proof', 'cost', 'builder says', 'builder checked by hand', 'seal'];
const NR = 'not recorded';
const YES = 'yes (script check, can be fooled)';

test('shipsWaiting: a bare check PASS is not listed; needs job.json ship_waiting === true', () => {
  const fs = fakeFs({
    [VERIFY('/a')]: verify('PASS'),
    [VERIFY('/b')]: verify('PASS'), [JOB('/b')]: job({ship_waiting: false}),
    [VERIFY('/c')]: verify('PASS'), [JOB('/c')]: job({ship_waiting: 'true'}),
    [VERIFY('/d')]: verify('PASS'), [JOB('/d')]: '[true]',
    [VERIFY('/e')]: verify('PASS'), [JOB('/e')]: WAIT,
  });
  assert.deepEqual(shipsWaiting(fs, ['/a', '/b', '/c', '/d', '/e'], () => 'h'), [{repo: '/e', head: 'h'}]);
});

test('shipsWaiting: job.head must equal the check record head (not the git HEAD); no job.head is listed', () => {
  const fs = fakeFs({
    [VERIFY('/a')]: verify('PASS', {head: 'rec'}), [JOB('/a')]: job({ship_waiting: true, head: 'old'}), // differs from the record: stale
    [VERIFY('/b')]: verify('PASS', {head: 'rec'}), [JOB('/b')]: job({ship_waiting: true, head: 'rec'}), // equals the record, not the git HEAD: listed
    [VERIFY('/c')]: verify('PASS'), [JOB('/c')]: job({ship_waiting: true, head: 'rec'}), // record has no head: not listed
    [VERIFY('/d')]: verify('PASS', {head: 'rec'}), [JOB('/d')]: WAIT, // no job.head: listed
    [VERIFY('/e')]: verify('PASS', {head: 5}), [JOB('/e')]: job({ship_waiting: true, head: 5}), // record head not a string: not listed
    [VERIFY('/f')]: verify('PASS', {head: 'rec'}), [JOB('/f')]: job({ship_waiting: true, head: 5}), // job.head not a string: not listed
    [VERIFY('/g')]: verify('PASS', {head: 'rec'}), [JOB('/g')]: job({ship_waiting: true, head: 'rec'}), [SHIP('/g')]: ship('PASS', 'h'), // shipped at the current head
  });
  assert.deepEqual(shipsWaiting(fs, ['/a', '/b', '/c', '/d', '/e', '/f', '/g'], () => 'h'), [{repo: '/b', head: 'h'}, {repo: '/d', head: 'h'}]);
  assert.deepEqual(shipsWaiting(fs, ['/b'], () => null), []); // unknown head: not listed
});

test('receipt: null when verify file missing, unparseable, or not PASS', () => {
  assert.equal(receipt(fakeFs({}), '/r', () => 'h'), null);
  assert.equal(receipt(fakeFs({[VERIFY('/r')]: '{nope'}), '/r', () => 'h'), null);
  assert.equal(receipt(fakeFs({[VERIFY('/r')]: verify('FAIL')}), '/r', () => 'h'), null);
});

test('receipt: PASS gives exact keys in order, unknowns are "not recorded"', () => {
  const r = receipt(fakeFs({[VERIFY('/r')]: verify('PASS')}), '/r', () => 'h')!;
  assert.equal(r.repo, '/r');
  assert.deepEqual(Object.keys(r.fields), KEYS);
  assert.deepEqual(r.fields, {
    'checks': 'passed', 'tests written first': NR, 'reviewer': NR, 'files touched': NR, 'started': NR,
    'finished': fmt(NOW), 'tried by you': NR, 'proof': NR, 'cost': NR, 'builder says': NR, 'builder checked by hand': NR, 'seal': NR,
  });
  assert.equal(r.title, undefined);
  const bare = receipt({...fakeFs({[VERIFY('/r')]: verify('PASS')}), mtime: () => null}, '/r', () => 'h')!; // no mtime: finished unknown too
  assert.equal(bare.fields['finished'], NR);
});

test('receipt: shipped only when a ship PASS matches the current head', () => {
  const base = {[VERIFY('/r')]: verify('PASS')};
  assert.equal(receipt(fakeFs(base), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'h')}), '/r', () => 'h')!.shipped, true);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'old')}), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('FAIL', 'h')}), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'h')}), '/r', () => null)!.shipped, false);
});

test('receipt: seal is first 12 chars of card_sha256; reviewer counts P1 / P2 / P3', () => {
  const fs = fakeFs({
    [VERIFY('/r')]: verify('PASS', {card_sha256: 'abcdef0123456789'.repeat(4)}),
    '/r/.claude/critic.md': '## spec\na.ts:1 | P1 | wrong\nb.ts:2 | P2 | meh\n\n## security\nc.ts:3 |P1| bad\n',
  });
  const r = receipt(fs, '/r', () => 'h')!;
  assert.equal(r.fields['seal'], 'abcdef012345');
  assert.equal(r.fields['reviewer'], '2 / 1 / 0');
});

test('receipt: reviewer is counts only when findings are parseable or a lens said "none"; else not recorded', () => {
  const crit = (text: string) => receipt(fakeFs({[VERIFY('/r')]: verify('PASS'), '/r/.claude/critic.md': text}), '/r', () => 'h')!.fields['reviewer'];
  assert.equal(crit('## spec\nnone\n## security\nnone\n'), '0 / 0 / 0');
  assert.equal(crit('a.ts:1 | P2 | only minor\n'), '0 / 1 / 0');
  assert.equal(crit('a.ts:1 | P2 | x\nb.ts:2 | P2 | y\nc.ts:3 | P3 | z\n'), '0 / 2 / 1');
  assert.equal(crit(''), NR);
  assert.equal(crit('looks fine to me\n'), NR);
  assert.equal(crit('P1 start of line only\n'), NR);
  // One lens saying "none" must never hide another lens's malformed line.
  for (const bad of ['p1 | x', 'P1: lowercase colon', 'P1/P2 | x', 'a.ts:1 | P10 | x', '| P1 | leading pipe', 'x | P0 | y']) {
    assert.equal(crit(`## a\nnone\n## b\n${bad}\n`), NR, bad);
  }
  assert.equal(crit('## a\nnone\n## b\nf.ts:1 | P1 | real\n'), '1 / 0 / 0');
});

test('receipt: seal shows only a real 64-hex hash', () => {
  const seal = (s: string) => receipt(fakeFs({[VERIFY('/r')]: verify('PASS', {card_sha256: s})}), '/r', () => 'h')!.fields['seal'];
  assert.equal(seal('0123456789abcdef'.repeat(4)), '0123456789ab');
  for (const s of ['short', 'g'.repeat(64), 'A'.repeat(64), '<b>x</b>']) assert.equal(seal(s), NR, s);
});

test('pendingCards: a file name unsafe to paste in a shell gets approveLine null, and is still listed', () => {
  const names = ['x; rm -rf ~', 'a b', '$(id)', '`id`', 'a\nb', '-flag', '.hidden', 'a'.repeat(101), 'ok-name_1.v2'];
  const fs = fakeFs(Object.fromEntries(names.map((n) => [`${V}/cards/${n}.md`, 'repo: r\n'])));
  const got = Object.fromEntries(pendingCards(fs, V, A).map((p) => [p.name, p.approveLine]));
  const shown = names.map((n) => n.replace(/[\n]/g, '')); // control characters are stripped from a name for display; the approve line is still decided on the real file name
  assert.deepEqual(Object.keys(got).sort(), [...shown].sort());
  for (const n of shown.slice(0, -1)) assert.equal(got[n], null, n);
  assert.equal(got['ok-name_1.v2'], approveLine('ok-name_1.v2'));
});

test('pendingCards: repo and scope show at most 400 characters', () => {
  const fs = fakeFs({[`${V}/cards/c.md`]: `repo: ${'r'.repeat(5000)}\nscope: ${'s'.repeat(5000)}\n`});
  const [p] = pendingCards(fs, V, A);
  assert.equal(p!.repo.length, 400);
  assert.equal(p!.scope.length, 400);
});

test('files bigger than 200000 chars read as missing (no stall on a huge agent-written file)', () => {
  const huge = 'x'.repeat(200_001);
  const fs = fakeFs({[VERIFY('/r')]: verify('PASS'), '/r/.claude/critic.md': huge, [`${V}/cards/big.md`]: `repo: ${huge}\n`});
  assert.equal(receipt(fs, '/r', () => 'h')!.fields['reviewer'], NR);
  assert.equal(pendingCards(fs, V, A)[0]!.repo, '');
  assert.equal(receipt(fakeFs({[VERIFY('/r')]: huge}), '/r', () => 'h'), null);
});

// ---------- settled, waiting and older cards ----------

const names = (xs: {name: string}[]) => xs.map((x) => x.name);
const card = (r = 'r') => `repo: ${r}\n`;

test('a card named in the history file is in neither list', () => {
  const fs = fakeFs({
    [`${V}/cards/done.md`]: card(), [`${V}/cards/todo.md`]: card(),
    [HIST]: `${hl('done.md')}\n${hl('other.md')}\n`,
  });
  assert.deepEqual(names(pendingCards(fs, V, A, {now: NOW})), ['todo']);
  assert.deepEqual(names(olderCards(fs, V, A, {now: NOW})), []);
  const old = {...fs, mtime: () => NOW - 10 * DAY};
  assert.deepEqual(names(olderCards(old, V, A, {now: NOW})), ['todo']);
});

test('a card named by an approval record is in neither list, however old', () => {
  const fs = agedFs({[`${V}/cards/done.md`]: card(), [`${A}/1.json`]: JSON.stringify({source: 'done.md'})}, {'done.md': 30 * DAY});
  assert.deepEqual(pendingCards(fs, V, A, {now: NOW}), []);
  assert.deepEqual(olderCards(fs, V, A, {now: NOW}), []);
});

test('age rule: 2 days waits, exactly 3 days waits, 4 days is older', () => {
  const fs = agedFs(
    {[`${V}/cards/a2.md`]: card(), [`${V}/cards/a3.md`]: card('/r3'), [`${V}/cards/a4.md`]: card('/r4')},
    {'a2.md': 2 * DAY, 'a3.md': 3 * DAY, 'a4.md': 4 * DAY},
  );
  assert.deepEqual(names(pendingCards(fs, V, A, {now: NOW})), ['a2', 'a3']);
  assert.deepEqual(olderCards(fs, V, A, {now: NOW}), [{name: 'a4', repo: '/r4'}]);
  const justOver = agedFs({[`${V}/cards/a3.md`]: card()}, {'a3.md': 3 * DAY + 1});
  assert.deepEqual(pendingCards(justOver, V, A, {now: NOW}), []);
  assert.deepEqual(names(olderCards(justOver, V, A, {now: NOW})), ['a3']);
});

test('age rule: opts.now defaults to the real clock', () => {
  const fs = {...fakeFs({[`${V}/cards/a.md`]: card(), [`${V}/cards/b.md`]: card()}), mtime: (p: string) => Date.now() - (p.endsWith('b.md') ? 4 * DAY : 1000)};
  assert.deepEqual(names(pendingCards(fs, V, A)), ['a']);
  assert.deepEqual(names(olderCards(fs, V, A)), ['b']);
});

test('unknown mtime (no method, null, not a function) makes a card older, never waiting', () => {
  const base = fakeFs({[`${V}/cards/u.md`]: card('/ru')});
  const {mtime: _drop, ...noMethod} = base;
  for (const fs of [noMethod as Fs, {...base, mtime: () => null}, {...base, mtime: 'soon'} as unknown as Fs]) {
    assert.deepEqual(pendingCards(fs, V, A, {now: NOW}), []);
    assert.deepEqual(olderCards(fs, V, A, {now: NOW}), [{name: 'u', repo: '/ru'}]);
  }
});

test('history: a bad line is skipped and a good one still works', () => {
  const fs = fakeFs({
    [`${V}/cards/good.md`]: card(), [`${V}/cards/left.md`]: card(),
    [HIST]: ['{not json', '42', '"card"', '{"card": 7}', '{}', hl('good.md'), '{"card":"half.md'].join('\n'),
  });
  assert.deepEqual(names(pendingCards(fs, V, A, {now: NOW})), ['left']);
});

test('history: only the last 5000 lines count', () => {
  const lines = [hl('first.md')];
  for (let i = 1; i < 5999; i++) lines.push(hl(`f${i}.md`));
  lines.push(hl('last.md'));
  assert.equal(lines.length, 6000);
  const fs = fakeFs({[`${V}/cards/first.md`]: card(), [`${V}/cards/last.md`]: card(), [HIST]: lines.join('\n')});
  assert.deepEqual(names(pendingCards(fs, V, A, {now: NOW})), ['first']);
  // line 1001 (the 5000th from the end) counts, line 1000 does not
  const edge = fakeFs({[`${V}/cards/f1000.md`]: card(), [`${V}/cards/f999.md`]: card(), [HIST]: lines.join('\n')});
  assert.deepEqual(names(pendingCards(edge, V, A, {now: NOW})), ['f999']);
});

test('history: read through readTail(path, 2000000) when the fs has it, else through read', () => {
  const calls: [string, number][] = [];
  const files = {[`${V}/cards/t.md`]: card(), [`${V}/cards/u.md`]: card()};
  const withTail: Fs = {...fakeFs(files), readTail: (p, n) => { calls.push([p, n]); return hl('t.md'); }};
  assert.deepEqual(names(pendingCards(withTail, V, A, {now: NOW})), ['u']);
  assert.deepEqual(calls, [[HIST, 2_000_000]]);
  const custom = '/elsewhere/h.jsonl';
  calls.length = 0;
  assert.deepEqual(names(pendingCards(withTail, V, A, {now: NOW, historyPath: custom})), ['u']);
  assert.deepEqual(calls, [[custom, 2_000_000]]);
  // a null tail means no history
  assert.deepEqual(names(pendingCards({...withTail, readTail: () => null}, V, A, {now: NOW})), ['t', 'u']);
  // without readTail: plain read of the history path
  const plain = fakeFs({...files, [custom]: hl('u.md')});
  assert.deepEqual(names(pendingCards(plain, V, A, {now: NOW, historyPath: custom})), ['t']);
  assert.deepEqual(names(pendingCards(plain, V, A, {now: NOW})), ['t', 'u']);
});

test('olderCards: sorted by name, repo from the repo: line, capped at 200', () => {
  const fs = agedFs({
    [`${V}/cards/b.md`]: 'repo: /rb\n', [`${V}/cards/a.md`]: 'no repo line\n', [`${V}/cards/c.md`]: 'repo: /rc\n',
    [`${V}/cards/fresh.md`]: card(), [`${V}/cards/n.txt`]: card(),
  }, {'a.md': 9 * DAY, 'b.md': 4 * DAY, 'c.md': 5 * DAY});
  assert.deepEqual(olderCards(fs, V, A, {now: NOW}), [{name: 'a', repo: ''}, {name: 'b', repo: '/rb'}, {name: 'c', repo: '/rc'}]);
  const many = Object.fromEntries(Array.from({length: 250}, (_, i) => [`${V}/cards/c${String(i).padStart(3, '0')}.md`, card()]));
  const got = olderCards({...fakeFs(many), mtime: () => NOW - 9 * DAY}, V, A, {now: NOW});
  assert.equal(got.length, 200);
  assert.deepEqual(got.map((o) => o.name), Array.from({length: 200}, (_, i) => `c${String(i).padStart(3, '0')}`));
  assert.deepEqual(Object.keys(got[0]!).sort(), ['name', 'repo']);
});

test('olderCards: missing cards dir returns []', () => {
  assert.deepEqual(olderCards(fakeFs({}), V, A, {now: NOW}), []);
});

test('age rule: a future time, time 0, NaN or Infinity is never fresh; a small clock skew still is', () => {
  for (const bad of [NOW + 2 * DAY, NOW + 61_000, 0, -1, NaN, Infinity]) {
    const fs = {...fakeFs({[`${V}/cards/s.md`]: card('/rs')}), mtime: () => bad};
    assert.deepEqual(pendingCards(fs, V, A, {now: NOW}), [], String(bad));
    assert.deepEqual(olderCards(fs, V, A, {now: NOW}), [{name: 's', repo: '/rs'}], String(bad));
  }
  const skew = {...fakeFs({[`${V}/cards/s.md`]: card()}), mtime: () => NOW + 30_000};
  assert.deepEqual(names(pendingCards(skew, V, A, {now: NOW})), ['s']);
});

test('settled names ignore case and the .md suffix, in records and in the history; cardLists names them', () => {
  const files = {
    [`${V}/cards/my-card.md`]: card(), [`${V}/cards/other.md`]: card(), [`${V}/cards/third.md`]: card(), [`${V}/cards/keep.md`]: card(),
    [`${A}/1.json`]: JSON.stringify({source: 'My-Card.md'}),
    [HIST]: [JSON.stringify({card: 'OTHER'}), JSON.stringify({card: 'third.MD'})].join('\n'),
  };
  const lists = cardLists(fakeFs(files), V, A, {now: NOW});
  assert.deepEqual(names(lists.waiting), ['keep']);
  assert.deepEqual(lists.older, []);
  assert.deepEqual(lists.settled, ['my-card', 'other', 'third']);
});

test('history window: a plain-read history over 200000 characters (up to 2 MB) is still read', () => {
  const lines = Array.from({length: 3000}, (_, i) => JSON.stringify({card: i === 0 ? 'target.md' : `p${i}.md`, pad: 'x'.repeat(100)}));
  const text = lines.join('\n');
  assert.ok(text.length > 200_000 && text.length < 2_000_000, String(text.length));
  assert.deepEqual(pendingCards(fakeFs({[`${V}/cards/target.md`]: card(), [HIST]: text}), V, A, {now: NOW}), []);
});

test('a flood of card files is bounded: at most 700 card reads per call', () => {
  const files = Object.fromEntries(Array.from({length: 3000}, (_, i) => [`${V}/cards/f${String(i).padStart(4, '0')}.md`, card()]));
  const base = fakeFs(files);
  let reads = 0;
  const counting: Fs = {...base, read: (p) => { if (p.startsWith(`${V}/cards/`)) reads++; return base.read(p); }, mtime: () => NOW - 9 * DAY};
  assert.equal(cardLists(counting, V, A, {now: NOW}).older.length, 200);
  assert.ok(reads <= 700, String(reads));
});

test('older names and repos have control and bidi characters stripped', () => {
  const fs = agedFs({[`${V}/cards/ev\u202Eil.md`]: 'repo: /x/\u202Ey\n'}, {'ev\u202Eil.md': 9 * DAY});
  assert.deepEqual(olderCards(fs, V, A, {now: NOW}), [{name: 'evil', repo: '/x/y'}]);
});

// ---------- approvedTitle ----------

test('approvedTitle: the source name without .md for the record whose repo matches, else empty', () => {
  const fs = fakeFs({
    [`${A}/1.json`]: JSON.stringify({repo: '/r/a', source: 'alpha-card.md'}),
    [`${A}/2.json`]: JSON.stringify({repo: '/r/b', source: 'beta-card.md'}),
    [`${A}/bad.json`]: '{not json "repo": "/r/c", "source": "c.md"',
    [`${A}/notes.txt`]: JSON.stringify({repo: '/r/d', source: 'd.md'}),
  });
  assert.equal(approvedTitle(fs, A, '/r/a'), 'alpha-card');
  assert.equal(approvedTitle(fs, A, '/r/b'), 'beta-card');
  for (const r of ['/r/c', '/r/d', '/r/none', '/r/A', '']) assert.equal(approvedTitle(fs, A, r), '', r);
  assert.equal(approvedTitle(fakeFs({}), A, '/r/a'), '');
});

test('approvedTitle: the newest record for a repo wins; control and bidi characters are stripped', () => {
  const fs = fakeFs({
    [`${A}/1.json`]: JSON.stringify({repo: '/r/a', source: 'old-card.md', approved_at: '2026-11-01T00:00:00+00:00'}),
    [`${A}/2.json`]: JSON.stringify({repo: '/r/a', source: 'new\u202Ecard\n.md', approved_at: '2026-11-12T00:00:00+00:00'}),
  });
  assert.equal(approvedTitle(fs, A, '/r/a'), 'newcard');
});

test('approvedTitle: a repo path that differs only by a trailing slash does not match', () => {
  const slashed = fakeFs({[`${A}/1.json`]: JSON.stringify({repo: '/r/a/', source: 'x.md'})});
  assert.equal(approvedTitle(slashed, A, '/r/a'), '');
  assert.equal(approvedTitle(slashed, A, '/r/a/'), 'x');
  const plain = fakeFs({[`${A}/1.json`]: JSON.stringify({repo: '/r/a', source: 'x.md'})});
  assert.equal(approvedTitle(plain, A, '/r/a/'), '');
});

test('receipt property: arbitrary contents never throw; the P1 count equals the number of well-formed P1 findings', () => {
  // Noise lines never contain "|", so they can never be findings.
  // The only non-finding lines a well-formed critic.md has: blanks, headings and "none".
  const noise = fc.constantFrom('', '# P1 heading', '## spec', 'none');
  const line = fc.oneof(
    noise.map((t) => ({kind: 'noise', text: t})),
    fc.constantFrom('P1', 'P2', 'P3').map((p) => ({kind: p, text: `f.ts:1 | ${p} | reason`})),
  );
  fc.assert(
    fc.property(fc.array(line, {maxLength: 30}), (lines) => {
      const critic = lines.map((l) => l.text).join('\n');
      const r = receipt(fakeFs({[VERIFY('/r')]: verify('PASS'), '/r/.claude/critic.md': critic}), '/r', () => 'h')!;
      assert.deepEqual(Object.keys(r.fields), KEYS);
      const findings = lines.filter((l) => l.kind !== 'noise');
      const said = lines.some((l) => l.text.trim().toLowerCase() === 'none');
      const n = (k: string) => findings.filter((l) => l.kind === k).length;
      const want = findings.length === 0 && !said ? NR : `${n('P1')} / ${n('P2')} / ${n('P3')}`;
      assert.equal(r.fields['reviewer'], want);
      for (const k of ['tests written first', 'files touched', 'started', 'tried by you', 'proof', 'cost']) assert.equal(r.fields[k], NR);
    }),
    {numRuns: 200},
  );
  // Arbitrary text in any of the files must never make receipt throw or invent a value.
  fc.assert(
    fc.property(fc.string(), fc.string(), fc.string(), (v, c, s) => {
      const r = receipt(fakeFs({[VERIFY('/r')]: v, '/r/.claude/critic.md': c, [SHIP('/r')]: s}), '/r', () => 'h');
      if (r !== null) assert.deepEqual(Object.keys(r.fields), KEYS);
    }),
    {numRuns: 200},
  );
});

// ---------- receipt: job record, files touched, times, reviewer ----------

const PASSV = (extra: object = {}) => verify('PASS', extra);
const rcpt = (files: Record<string, string>, mtime?: (p: string) => number | null) => {
  const f = fakeFs({[VERIFY('/r')]: PASSV(), ...files});
  return receipt(mtime ? {...f, mtime} : f, '/r', () => 'h')!;
};
const CARD = (...a: string[]) => `repo: /r\nallowed_files:\n${a.map((x) => `  - ${x}`).join('\n')}\nscope: s\n`;
const changed = (...c: string[]) => JSON.stringify({verdict: 'PASS', changed_files: c});

test('receipt: files touched compares changed_files with the card allowed_files', () => {
  const ft = (card: string, v: string) => rcpt({[VERIFY('/r')]: v, [CARDMD('/r')]: card}).fields['files touched'];
  assert.equal(ft(CARD('a.ts', 'src/'), changed('a.ts', 'src/x/y.ts')), '2 of 2 allowed files');
  assert.equal(ft(CARD('a.ts', 'src/'), changed('a.ts', 'b.ts', 'c.ts')), '3 of 2 allowed files, 2 outside the card');
  assert.equal(ft(CARD('a.ts'), changed('a.ts', '.claude/card.md', '.claude/last-verify.json')), '1 of 1 allowed files');
  assert.equal(ft(CARD('a.ts'), changed('.claude/card.md', '.claude/last-verify.json')), '0 of 1 allowed files');
  assert.equal(ft(CARD('a.ts'), changed()), '0 of 1 allowed files');
  assert.equal(ft(CARD('src/'), changed('src')), '1 of 1 allowed files, 1 outside the card'); // a '/' entry matches files under it only
  assert.equal(ft(CARD('a.ts'), changed('a.tsx')), '1 of 1 allowed files, 1 outside the card'); // exact match otherwise
  assert.equal(ft('repo: /r\nallowed_files:\n  - a.ts\n  - b.ts\nscope: s\n  - c.ts\n', changed('a.ts', 'c.ts')), '2 of 2 allowed files, 1 outside the card'); // list ends at the next non-indented key
});

test('receipt: files touched is not recorded when the card or changed_files is missing or wrong', () => {
  const ft = (files: Record<string, string>) => rcpt(files).fields['files touched'];
  assert.equal(ft({[CARDMD('/r')]: CARD('a.ts')}), NR); // no changed_files
  assert.equal(ft({[VERIFY('/r')]: changed('a.ts')}), NR); // no card
  assert.equal(ft({[VERIFY('/r')]: changed('a.ts'), [CARDMD('/r')]: 'repo: /r\nscope: s\n'}), NR); // no allowed_files
  assert.equal(ft({[VERIFY('/r')]: changed('a.ts'), [CARDMD('/r')]: 'allowed_files:\nscope: s\n'}), NR); // empty list
  assert.equal(ft({[VERIFY('/r')]: JSON.stringify({verdict: 'PASS', changed_files: 'a.ts'}), [CARDMD('/r')]: CARD('a.ts')}), NR);
  assert.equal(ft({[VERIFY('/r')]: JSON.stringify({verdict: 'PASS', changed_files: ['a.ts', 5]}), [CARDMD('/r')]: CARD('a.ts')}), NR);
  assert.equal(ft({[VERIFY('/r')]: changed('a.ts'), [CARDMD('/r')]: 'x'.repeat(200_001)}), NR);
});

test('receipt: started and finished are "YYYY-MM-DD HH:MM UTC"; finished falls back to the verify file mtime', () => {
  const j = job({started_at: '2026-03-04T05:06:07Z', finished_at: '2026-03-04T07:08:09.123Z'});
  const r = rcpt({[JOB('/r')]: j}, () => 1_000_000_000_000);
  assert.equal(r.fields['started'], '2026-03-04 05:06 UTC');
  assert.equal(r.fields['finished'], '2026-03-04 07:08 UTC');
  const fb = rcpt({[JOB('/r')]: job({started_at: '2026-03-04T05:06:07Z'})}, () => 1_000_000_000_000);
  assert.equal(fb.fields['finished'], '2001-09-09 01:46 UTC');
  const bad = rcpt({[JOB('/r')]: job({started_at: 'yesterday', finished_at: 'nope'})}, () => 0); // bad dates; mtime 0 does not count
  assert.equal(bad.fields['started'], NR);
  assert.equal(bad.fields['finished'], NR);
  assert.equal(rcpt({[JOB('/r')]: job({started_at: 5, finished_at: {}})}, () => null).fields['finished'], NR);
  assert.equal(rcpt({}, () => -5).fields['finished'], NR);
});

test('receipt: job.json fields map to rows; a wrong type makes only that field not recorded', () => {
  const r = rcpt({[JOB('/r')]: job({card: 'my card', tests_first: true, checked_by: 'script', cost_usd: 1.234, tried: 'clicked it'})});
  assert.equal(r.fields['tests written first'], YES);
  assert.equal(r.fields['cost'], '$1.23');
  assert.equal(r.fields['tried by you'], 'clicked it');
  assert.equal(r.title, 'my card');
  assert.equal(rcpt({[JOB('/r')]: job({tests_first: false, checked_by: 'script'})}).fields['tests written first'], 'no (script check)');
  assert.equal(rcpt({[JOB('/r')]: job({cost_usd: 0})}).fields['cost'], '$0.00');
  assert.equal(rcpt({[JOB('/r')]: job({cost_usd: 12})}).fields['cost'], '$12.00');
  for (const c of [-1, 'abc', '1.5', null, true]) assert.equal(rcpt({[JOB('/r')]: job({cost_usd: c})}).fields['cost'], NR, String(c));
  assert.equal(rcpt({[JOB('/r')]: '{"cost_usd": 1e999}'}).fields['cost'], NR); // too big to be finite
  const mixed = rcpt({[JOB('/r')]: job({card: 7, tests_first: 'yes', tried: 9, cost_usd: 2, started_at: 'x'})});
  assert.equal(mixed.fields['tests written first'], NR);
  assert.equal(mixed.fields['tried by you'], NR);
  assert.equal(mixed.fields['cost'], '$2.00'); // the right field survives its neighbours' wrong types
  assert.equal(mixed.title, undefined);
});

test('receipt: job.json tried and card are cleaned and cut to 120 chars; hostile text stays text', () => {
  const evil = `<img src=x onerror=alert(1)>‮abc\u0007\n${'z'.repeat(300)}`;
  const r = rcpt({[JOB('/r')]: job({tried: evil, card: evil})});
  for (const v of [r.fields['tried by you'], r.title!]) {
    assert.ok(v.length <= 120);
    assert.ok(v.startsWith('<img src=x onerror=alert(1)>abc'), v);
    assert.ok(!/[\u0000-\u001f‪-‮⁦-⁩]/.test(v));
  }
  assert.equal(rcpt({[JOB('/r')]: job({tried: 'q'.repeat(500)})}).fields['tried by you'].length, 120);
  assert.equal(rcpt({[JOB('/r')]: job({card: 'q'.repeat(500)})}).title!.length, 120);
});

test('receipt: job.json bigger than 200000 chars or a JSON array reads as missing', () => {
  const huge = JSON.stringify({card: 'c', tests_first: true, tried: 'x'.repeat(200_001)});
  const a = rcpt({[JOB('/r')]: huge});
  assert.equal(a.fields['tests written first'], NR);
  assert.equal(a.title, undefined);
  const b = rcpt({[JOB('/r')]: '[{"card":"c","tests_first":true}]'});
  assert.equal(b.fields['tests written first'], NR);
  assert.equal(b.title, undefined);
  assert.equal(rcpt({[JOB('/r')]: '{nope'}).fields['cost'], NR);
  assert.equal(shipsWaiting(fakeFs({[VERIFY('/r')]: PASSV(), [JOB('/r')]: '[{"ship_waiting":true}]'}), ['/r'], () => 'h').length, 0);
});

test('receipt: ship_waiting in job.json never changes the receipt fields', () => {
  assert.deepEqual(rcpt({[JOB('/r')]: job({ship_waiting: true})}).fields, rcpt({}).fields);
});

// ---------- R1c: honest labels ----------

const TW = 'tests written first';
const tw = (j: object) => rcpt({[JOB('/r')]: job(j)}).fields[TW];
const BS = (r = '/r') => `${r}/.claude/builder-says.json`;
const says = (files: Record<string, string>) => rcpt(files).fields;

test('receipt: tests written first is only ever a script-check label', () => {
  assert.equal(tw({tests_first: true, checked_by: 'script'}), YES);
  assert.equal(tw({tests_first: false, checked_by: 'script'}), 'no (script check)');
  assert.equal(tw({tests_first: false, checked_by: 'script', tests_first_reason: '  no tests existed  '}), 'no (script check): no tests existed');
  assert.equal(tw({tests_first: false, checked_by: 'script', tests_first_reason: ''}), 'no (script check)');
  assert.equal(tw({tests_first: false, checked_by: 'script', tests_first_reason: '   '}), 'no (script check)');
  assert.equal(tw({tests_first: false, checked_by: 'script', tests_first_reason: 7}), 'no (script check)');
  assert.equal(tw({tests_first: true, checked_by: 'script', tests_first_reason: 'ignored for yes'}), YES);
  assert.equal(tw({tests_first: true, checked_by: 'script', starts: 2}), `${YES}, started again`);
  assert.equal(tw({tests_first: false, checked_by: 'script', starts: 3, tests_first_reason: 'r'}), 'no (script check): r, started again');
  for (const s of [1, 0, '2', null, true]) assert.equal(tw({tests_first: true, checked_by: 'script', starts: s}), YES, String(s));
  // not recorded: missing or wrong checked_by, or tests_first not a boolean
  for (const c of [undefined, 'Script', 'script ', 'human', 'builder', '', 1, null, true, ['script']]) assert.equal(tw({tests_first: true, checked_by: c}), NR, String(c));
  for (const t of [undefined, 'yes', 'true', 1, 0, null, 'false']) assert.equal(tw({tests_first: t, checked_by: 'script'}), NR, String(t));
  assert.equal(tw({checked_by: 'script', starts: 2}), NR);
});

test('receipt: tests_first_reason is cleaned, trimmed and cut to 120; it cannot change the fixed words', () => {
  const evil = `<img src=x onerror=alert(1)>‮abc\u0007\n${'z'.repeat(300)}`;
  const v = tw({tests_first: false, checked_by: 'script', tests_first_reason: evil});
  const prefix = 'no (script check): ';
  assert.ok(v.startsWith(`${prefix}<img src=x onerror=alert(1)>abc`), v);
  assert.ok(v.length <= prefix.length + 120, String(v.length));
  assert.ok(!/[\u0000-\u001f‪-‮⁦-⁩]/.test(v));
  assert.equal(tw({tests_first: false, checked_by: 'script', tests_first_reason: 'q'.repeat(500)}).length, prefix.length + 120);
  // a reason that tries to pose as a plain yes or to drop the label still sits after the fixed label
  for (const reason of ['yes', 'yes (verified by a human)', 'script check removed']) {
    const w = tw({tests_first: false, checked_by: 'script', tests_first_reason: reason});
    assert.ok(w.startsWith('no (script check)'), w);
  }
});

test('receipt: a plain yes never occurs for tests written first (property)', () => {
  const any = fc.oneof(fc.boolean(), fc.string(), fc.integer(), fc.constant(null), fc.constantFrom('script', 'yes', 'Script'));
  fc.assert(
    fc.property(any, any, any, any, (t, c, r, n) => {
      const v = tw({tests_first: t, checked_by: c, tests_first_reason: r, starts: n});
      assert.ok(v === NR || v === YES || v.startsWith('no (script check)') || v === `${YES}, started again`, v);
      assert.ok(!/^yes(?! \(script check, can be fooled\))/.test(v), v);
      if (v.startsWith('yes')) assert.ok(v.startsWith(YES), v);
    }),
    {numRuns: 300},
  );
});

test('receipt: builder-says.json gives the two builder fields, cleaned, trimmed, cut to 160', () => {
  const f = says({[BS()]: JSON.stringify({summary: '  built it  ', checked_by_hand: 'ran the page'})});
  assert.equal(f['builder says'], 'built it');
  assert.equal(f['builder checked by hand'], 'ran the page');
  assert.deepEqual(Object.keys(f), KEYS);
  const evil = `<img src=x onerror=alert(1)>‮abc\u0007\n${'z'.repeat(300)}`;
  const e = says({[BS()]: JSON.stringify({summary: evil, checked_by_hand: evil})});
  for (const v of [e['builder says'], e['builder checked by hand']]) {
    assert.ok(v.length <= 160, String(v.length));
    assert.ok(v.startsWith('<img src=x onerror=alert(1)>abc'), v);
    assert.ok(!/[\u0000-\u001f‪-‮⁦-⁩]/.test(v));
  }
  assert.equal(says({[BS()]: JSON.stringify({summary: 'q'.repeat(500)})})['builder says'].length, 160);
  assert.equal(says({[BS()]: JSON.stringify({summary: 'only one'})})['builder checked by hand'], NR); // each field on its own
});

test('receipt: builder-says.json that is missing, huge, an array, broken, or has wrong types is not recorded', () => {
  const both = (f: Record<string, string>) => { const x = says(f); return [x['builder says'], x['builder checked by hand']]; };
  assert.deepEqual(both({}), [NR, NR]);
  assert.deepEqual(both({[BS()]: JSON.stringify({summary: 'x'.repeat(200_001), checked_by_hand: 'y'})}), [NR, NR]);
  assert.deepEqual(both({[BS()]: '[{"summary":"a","checked_by_hand":"b"}]'}), [NR, NR]);
  assert.deepEqual(both({[BS()]: '{nope'}), [NR, NR]);
  assert.deepEqual(both({[BS()]: JSON.stringify({summary: 5, checked_by_hand: ['x']})}), [NR, NR]);
  assert.deepEqual(both({[BS()]: JSON.stringify({summary: '', checked_by_hand: '  \u0007 '})}), [NR, NR]);
  assert.deepEqual(both({[BS()]: JSON.stringify({summary: null, checked_by_hand: {}})}), [NR, NR]);
});

test('receipt: builder-says.json fields touch nothing else: no title, no ship, no tests_first, no other field', () => {
  const lie = JSON.stringify({summary: 's', checked_by_hand: 'c', tests_first: true, checked_by: 'script', ship_waiting: true, card: 'Lie', head: 'h', cost_usd: 9, tried: 'x', seal: 'y'});
  const without = rcpt({});
  const withIt = rcpt({[BS()]: lie});
  assert.equal(withIt.title, undefined);
  const strip = (f: Record<string, string>) => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith('builder')));
  assert.deepEqual(strip(withIt.fields), strip(without.fields));
  assert.equal(withIt.shipped, without.shipped);
  const fs = fakeFs({[VERIFY('/r')]: PASSV({head: 'h'}), [BS()]: lie});
  assert.deepEqual(shipsWaiting(fs, ['/r'], () => 'h'), []);
});

// ---------- records from worktrees (vault given): main, live and archived places ----------

// Fake with real folders (a folder lists the first path piece of every file under it) and a per-file mtime.
function treeFs(files: Record<string, string>, mt: Record<string, number> = {}): Fs {
  const m = new Map(Object.entries(files));
  return {
    read: (p) => (m.has(p) ? m.get(p)! : null),
    list: (p) => {
      const names = new Set<string>();
      for (const k of m.keys()) if (k.startsWith(p + '/')) names.add(k.slice(p.length + 1).split('/')[0]!);
      return names.size ? [...names] : null;
    },
    mtime: (p) => (p in mt ? mt[p]! : NOW),
  };
}
const RP = '/p/repo', LW = '/p/repo-wt/w1', AR = '/vault/90-archive/worktrees/2026-11-13-repo-a';
const VF = 'last-' + 'verify.json';
const gitList = {[`${RP}/.git/worktrees/w1/gitdir`]: `${LW}/.git\n`};
const cl = (root: string, n: string) => `${root}/.claude/${n}`; // main and live
const heads = (m: Record<string, string>) => (p: string) => m[p] ?? null;

test('receipt with a vault: the live place wins over an OLD main record, every field from the live place', () => {
  const fs = treeFs({
    ...gitList,
    [cl(RP, VF)]: verify('PASS'), [cl(RP, 'job.json')]: job({card: 'main-card', cost_usd: 9}),
    [cl(LW, VF)]: verify('PASS', {card_sha256: 'abcdef0123456789'.repeat(4)}), [cl(LW, 'job.json')]: job({card: 'live-card', cost_usd: 1.5}),
  }, {[cl(RP, VF)]: NOW - 90_000, [cl(LW, VF)]: NOW - 1000});
  const r = receipt(fs, RP, () => 'h', '/vault')!;
  assert.equal(r.where, 'a build in progress');
  assert.equal(r.title, 'live-card');
  assert.equal(r.fields['cost'], '$1.50');
  assert.equal(r.fields['seal'], 'abcdef012345');
  assert.equal(r.repo, RP);
});

test('receipt with a vault: nothing is mixed between places (main data never fills a gap in the winner)', () => {
  const fs = treeFs({
    ...gitList,
    [cl(RP, VF)]: verify('PASS'), [cl(RP, 'job.json')]: job({checked_by: 'script', tests_first: true, card: 'main-card', started_at: '2026-11-13T10:00:00Z', tried: 'main tried'}),
    [cl(RP, 'builder-says.json')]: job({summary: 'main says'}), [cl(RP, 'critic.md')]: 'a.ts:1 | P1 | bad\n',
    [cl(RP, 'card.md')]: 'allowed_files:\n  - a.ts\n', [cl(LW, VF)]: verify('PASS', {changed_files: ['a.ts']}),
    [cl(LW, 'job.json')]: job({}),
  }, {[cl(RP, VF)]: NOW - 90_000, [cl(LW, VF)]: NOW - 1000});
  const r = receipt(fs, RP, () => 'h', '/vault')!;
  assert.equal(r.where, 'a build in progress');
  assert.equal(r.title, undefined);
  for (const k of ['tests written first', 'reviewer', 'files touched', 'started', 'tried by you', 'builder says', 'builder checked by hand']) assert.equal(r.fields[k], NR, k);
  assert.equal(r.fields['checks'], 'passed');
});

test('receipt with a vault: the main place can win, and says so', () => {
  const fs = treeFs({...gitList, [cl(RP, VF)]: verify('PASS'), [cl(LW, VF)]: verify('PASS')}, {[cl(RP, VF)]: NOW - 1000, [cl(LW, VF)]: NOW - 90_000});
  assert.equal(receipt(fs, RP, () => 'h', '/vault')!.where, 'the main folder');
});

test('receipt with a vault: an archived place gives the receipt, flat files, label with the date', () => {
  const fs = treeFs({
    [`${AR}/${VF}`]: verify('PASS', {changed_files: ['a.ts']}), [`${AR}/job.json`]: job({card: 'arch-card', checked_by: 'script', tests_first: true}),
    [`${AR}/critic.md`]: 'none\n', [`${AR}/card.md`]: 'allowed_files:\n  - a.ts\n', [`${AR}/builder-says.json`]: job({summary: 'archived says'}),
  });
  const r = receipt(fs, RP, () => 'h', '/vault')!;
  assert.equal(r.where, 'an archived build (2026-11-13)');
  assert.equal(r.title, 'arch-card');
  assert.equal(r.fields['reviewer'], '0 / 0 / 0');
  assert.equal(r.fields['files touched'], '1 of 1 allowed files');
  assert.equal(r.fields['builder says'], 'archived says');
  assert.equal(r.fields['finished'], fmt(NOW));
});

test('receipt with a vault: an archived receipt is shipped only by the MAIN ship record at the repo head', () => {
  const base = {[`${AR}/${VF}`]: verify('PASS')};
  assert.equal(receipt(treeFs(base), RP, () => 'h', '/vault')!.shipped, false);
  assert.equal(receipt(treeFs({...base, [cl(RP, 'last-ship.json')]: ship('PASS', 'h')}), RP, () => 'h', '/vault')!.shipped, true);
  assert.equal(receipt(treeFs({...base, [cl(RP, 'last-ship.json')]: ship('PASS', 'old')}), RP, () => 'h', '/vault')!.shipped, false);
  assert.equal(receipt(treeFs({...base, [`${AR}/last-ship.json`]: ship('PASS', 'h')}), RP, () => 'h', '/vault')!.shipped, false); // the archive's own ship file is not the repo's
});

test('receipt with a vault: a live place is shipped by its own ship record at ITS head', () => {
  const fs = treeFs({...gitList, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'last-ship.json')]: ship('PASS', 'hw'), [cl(RP, 'last-ship.json')]: ship('PASS', 'hm')});
  assert.equal(receipt(fs, RP, heads({[RP]: 'hm', [LW]: 'hw'}), '/vault')!.shipped, true);
  assert.equal(receipt(fs, RP, heads({[RP]: 'hm', [LW]: 'other'}), '/vault')!.shipped, false); // main's ship record does not ship the worktree
  assert.equal(receipt(fs, RP, heads({[RP]: 'hm'}), '/vault')!.shipped, false); // unknown head
});

test('receipt with a vault: no PASS in any place is null; without a vault only main counts and there is no where', () => {
  assert.equal(receipt(treeFs({...gitList, [cl(LW, VF)]: verify('FAIL')}), RP, () => 'h', '/vault'), null);
  const fs = treeFs({...gitList, [cl(RP, VF)]: verify('PASS'), [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: job({card: 'live'})}, {[cl(RP, VF)]: NOW - 90_000});
  const r = receipt(fs, RP, () => 'h')!;
  assert.equal(r.where, undefined);
  assert.equal(r.title, undefined);
  assert.equal(receipt(treeFs({...gitList, [cl(LW, VF)]: verify('PASS')}), RP, () => 'h'), null);
});

const WAITJ = job({ship_waiting: true, card: 'the-card'});

test('shipsWaiting with a vault: a live worktree gives a Ship with the repo path, the worktree head and where', () => {
  const fs = treeFs({...gitList, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: WAITJ});
  assert.deepEqual(shipsWaiting(fs, [RP], heads({[RP]: 'hm', [LW]: 'hw'}), '/vault'), [{repo: RP, head: 'hw', title: 'the-card', where: 'a build in progress'}]);
});

test('shipsWaiting with a vault: main and live each give one, main first', () => {
  const fs = treeFs({...gitList, [cl(RP, VF)]: verify('PASS'), [cl(RP, 'job.json')]: WAIT, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: WAITJ});
  assert.deepEqual(shipsWaiting(fs, [RP], heads({[RP]: 'hm', [LW]: 'hw'}), '/vault'), [
    {repo: RP, head: 'hm', where: 'the main folder'},
    {repo: RP, head: 'hw', title: 'the-card', where: 'a build in progress'},
  ]);
});

test('shipsWaiting with a vault: the existing rule is applied per place (shipped head, job.head, FAIL, not waiting)', () => {
  const fs = treeFs({
    ...gitList,
    [cl(RP, VF)]: verify('PASS', {head: 'rec'}), [cl(RP, 'job.json')]: job({ship_waiting: true, head: 'stale'}), // main: stale job.head
    [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: WAIT, [cl(LW, 'last-ship.json')]: ship('PASS', 'hw'), // live: shipped at its own head
  });
  assert.deepEqual(shipsWaiting(fs, [RP], heads({[RP]: 'hm', [LW]: 'hw'}), '/vault'), []);
  const fs2 = treeFs({...gitList, [cl(LW, VF)]: verify('FAIL'), [cl(LW, 'job.json')]: WAIT, [cl(RP, VF)]: verify('PASS'), [cl(RP, 'job.json')]: job({ship_waiting: false})});
  assert.deepEqual(shipsWaiting(fs2, [RP], heads({[RP]: 'hm', [LW]: 'hw'}), '/vault'), []);
  const fs3 = treeFs({...gitList, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: WAIT});
  assert.deepEqual(shipsWaiting(fs3, [RP], heads({[RP]: 'hm'}), '/vault'), []); // the worktree's head is unknown
});

test('shipsWaiting with a vault: an archived place NEVER gives a Ship, even with ship_waiting true', () => {
  const fs = treeFs({[`${AR}/${VF}`]: verify('PASS'), [`${AR}/job.json`]: WAITJ});
  assert.deepEqual(shipsWaiting(fs, [RP], () => 'h', '/vault'), []);
});

test('shipsWaiting without a vault: main only, no where, live worktrees are not looked at', () => {
  const fs = treeFs({...gitList, [cl(RP, VF)]: verify('PASS'), [cl(RP, 'job.json')]: WAIT, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: WAIT});
  assert.deepEqual(shipsWaiting(fs, [RP], () => 'h'), [{repo: RP, head: 'h'}]);
});

test('shipsWaiting with a vault: a head is read only for a place that has a PASS and ship_waiting (reading a head can be costly)', () => {
  const asked: string[] = [];
  const fs = treeFs({...gitList, [cl(RP, VF)]: verify('FAIL'), [cl(RP, 'job.json')]: WAIT, [cl(LW, VF)]: verify('PASS'), [cl(LW, 'job.json')]: job({ship_waiting: false})});
  assert.deepEqual(shipsWaiting(fs, [RP], (p) => { asked.push(p); return 'h'; }, '/vault'), []);
  assert.deepEqual(asked, []);
});
