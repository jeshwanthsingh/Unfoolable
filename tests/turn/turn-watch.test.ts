// watchedRepos(vault, configured, projectsRoot): the repos the server was started with PLUS the valid lines of <vault>/maps/repos.txt, read on every call.
// A valid line: absolute path, an existing real folder (not a symlink, not reached through one), under projectsRoot. At most 50 lines are read.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, symlinkSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {watchedRepos} from '../../apps/turn/turn-watch.ts';

function world() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'watch-')));
  const vault = join(root, 'vault'), projects = join(root, 'Projects'), outside = join(root, 'out');
  for (const d of [join(vault, 'maps'), projects, outside]) mkdirSync(d, {recursive: true});
  const repo = (n: string) => { const p = join(projects, n); mkdirSync(p, {recursive: true}); return p; };
  const list = (...l: string[]) => writeFileSync(join(vault, 'maps', 'repos.txt'), l.join('\n') + '\n');
  return {root, vault, projects, outside, repo, list};
}

test('a missing repos.txt gives the configured list alone', () => {
  const w = world();
  assert.deepEqual(watchedRepos(w.vault, ['/c/one', '/c/two'], w.projects), ['/c/one', '/c/two']);
});

test('valid lines are added after the configured repos', () => {
  const w = world();
  const a = w.repo('a'), b = w.repo('b');
  w.list(a, b);
  assert.deepEqual(watchedRepos(w.vault, ['/c/one'], w.projects), ['/c/one', a, b]);
});

test('read on every call: a line added later shows at once', () => {
  const w = world();
  const a = w.repo('a');
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), []);
  w.list(a);
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), [a]);
  const b = w.repo('b');
  w.list(a, b);
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), [a, b]);
});

test('ignored: blank, relative, missing, file, symlink, outside the projects folder, through a symlinked parent', () => {
  const w = world();
  const ok = w.repo('ok');
  const file = join(w.projects, 'afile'); writeFileSync(file, 'x');
  const link = join(w.projects, 'alink'); symlinkSync(ok, link);
  const viaDir = join(w.projects, 'via'); symlinkSync(w.outside, viaDir); mkdirSync(join(w.outside, 'inner'));
  const sibling = w.projects + '-evil'; mkdirSync(sibling); // shares the prefix of the projects folder
  w.list('', '   ', 'relative/path', 'ok', join(w.projects, 'missing'), file, link, w.outside, join(viaDir, 'inner'), sibling, w.projects, `${ok}/../../out`, `${ok}\0`, ok);
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), [ok]);
});

test('a repeated line, or one already configured, is listed once', () => {
  const w = world();
  const a = w.repo('a'), b = w.repo('b');
  w.list(a, a, b, b);
  assert.deepEqual(watchedRepos(w.vault, [a], w.projects), [a, b]);
});

test('at most 50 lines are read: the 51st and later are ignored, even if valid', () => {
  const w = world();
  const good = Array.from({length: 51}, (_, i) => w.repo(`r${String(i).padStart(2, '0')}`));
  w.list(...good);
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), good.slice(0, 50));
  w.list(...Array.from({length: 50}, () => ''), good[0]!); // blank lines count as lines
  assert.deepEqual(watchedRepos(w.vault, [], w.projects), []);
});

test('a huge file, a binary file, a symlinked repos.txt, or a folder named repos.txt adds nothing and does not throw', () => {
  const w = world();
  const a = w.repo('a');
  const f = join(w.vault, 'maps', 'repos.txt');
  writeFileSync(f, a + '\n' + 'x'.repeat(5_000_000)); // far past any sane size for 50 paths
  assert.deepEqual(watchedRepos(w.vault, ['/c'], w.projects), ['/c']);
  writeFileSync(f, Buffer.concat([Buffer.from([0, 255, 254, 0, 1, 2]), Buffer.from('\n' + a + '\n')]));
  assert.ok(!watchedRepos(w.vault, [], w.projects).some((p) => p.includes('\0')));
  writeFileSync(join(w.outside, 'real.txt'), a + '\n');
  const w2 = world();
  symlinkSync(join(w.outside, 'real.txt'), join(w2.vault, 'maps', 'repos.txt'));
  assert.deepEqual(watchedRepos(w2.vault, [], w.projects), []);
  const w3 = world();
  mkdirSync(join(w3.vault, 'maps', 'repos.txt'));
  assert.deepEqual(watchedRepos(w3.vault, ['/c'], w3.projects), ['/c']);
});
