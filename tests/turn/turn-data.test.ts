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
const ship = (verdict: string, head: string) => JSON.stringify({verdict, head});

test('shipsWaiting: waiting when verify PASS, head known, no matching PASS ship; input order kept', () => {
  const fs = fakeFs({
    [VERIFY('/a')]: verify('PASS'),
    [VERIFY('/b')]: verify('PASS'),
    [SHIP('/b')]: ship('PASS', 'old'),
    [VERIFY('/c')]: verify('PASS'),
    [SHIP('/c')]: ship('PASS', 'h3'),
    [VERIFY('/d')]: verify('FAIL'),
    [VERIFY('/e')]: '{broken',
    [VERIFY('/f')]: verify('PASS'),
    [VERIFY('/g')]: verify('PASS'),
    [SHIP('/g')]: ship('FAIL', 'h7'),
    [VERIFY('/h')]: verify('PASS'),
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

const KEYS = ['checks', 'tests written first', 'serious problems', 'files touched', 'tried by you', 'proof', 'cost', 'time', 'seal'];
const NR = 'not recorded';

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
    'checks': 'passed', 'tests written first': NR, 'serious problems': NR, 'files touched': NR,
    'tried by you': NR, 'proof': NR, 'cost': NR, 'time': NR, 'seal': NR,
  });
});

test('receipt: shipped only when a ship PASS matches the current head', () => {
  const base = {[VERIFY('/r')]: verify('PASS')};
  assert.equal(receipt(fakeFs(base), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'h')}), '/r', () => 'h')!.shipped, true);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'old')}), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('FAIL', 'h')}), '/r', () => 'h')!.shipped, false);
  assert.equal(receipt(fakeFs({...base, [SHIP('/r')]: ship('PASS', 'h')}), '/r', () => null)!.shipped, false);
});

test('receipt: seal is first 12 chars of card_sha256; serious problems counts lines starting with P1', () => {
  const fs = fakeFs({
    [VERIFY('/r')]: verify('PASS', {card_sha256: 'abcdef0123456789'.repeat(4)}),
    '/r/.claude/critic.md': '## spec\na.ts:1 | P1 | wrong\nb.ts:2 | P2 | meh\n\n## security\nc.ts:3 |P1| bad\n',
  });
  const r = receipt(fs, '/r', () => 'h')!;
  assert.equal(r.fields['seal'], 'abcdef012345');
  assert.equal(r.fields['serious problems'], '2');
});

test('receipt: serious problems is 0 only when findings are parseable or a lens said "none"; else not recorded', () => {
  const crit = (text: string) => receipt(fakeFs({[VERIFY('/r')]: verify('PASS'), '/r/.claude/critic.md': text}), '/r', () => 'h')!.fields['serious problems'];
  assert.equal(crit('## spec\nnone\n## security\nnone\n'), '0');
  assert.equal(crit('a.ts:1 | P2 | only minor\n'), '0');
  assert.equal(crit(''), NR);
  assert.equal(crit('looks fine to me\n'), NR);
  assert.equal(crit('P1 start of line only\n'), NR);
  // One lens saying "none" must never hide another lens's malformed line.
  for (const bad of ['p1 | x', 'P1: lowercase colon', 'P1/P2 | x', 'a.ts:1 | P10 | x', '| P1 | leading pipe', 'x | P0 | y']) {
    assert.equal(crit(`## a\nnone\n## b\n${bad}\n`), NR, bad);
  }
  assert.equal(crit('## a\nnone\n## b\nf.ts:1 | P1 | real\n'), '1');
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
  assert.equal(receipt(fs, '/r', () => 'h')!.fields['serious problems'], NR);
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
      const want = findings.length === 0 && !said ? NR : String(findings.filter((l) => l.kind === 'P1').length);
      assert.equal(r.fields['serious problems'], want);
      for (const k of ['tests written first', 'files touched', 'tried by you', 'proof', 'cost', 'time']) assert.equal(r.fields[k], NR);
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
