import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {pendingCards, shipsWaiting, receipt} from '../../apps/turn/turn-data.ts';

type Fs = { read(path: string): string | null; list(path: string): string[] | null };

// In-memory fake: only read/list exist, so the code under test cannot write.
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
  };
}

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

test('pendingCards: approval whose source differs only in case does not hide the card', () => {
  const fs = fakeFs({
    [`${V}/cards/my-card.md`]: 'repo: r\n',
    [`${A}/1.json`]: JSON.stringify({source: 'My-Card.md'}),
  });
  assert.deepEqual(pendingCards(fs, V, A).map((p) => p.name), ['my-card']);
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
  assert.deepEqual(Object.keys(got).sort(), [...names].sort());
  for (const n of names.slice(0, -1)) assert.equal(got[n], null, n);
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
