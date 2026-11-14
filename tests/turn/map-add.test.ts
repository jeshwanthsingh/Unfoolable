// scripts/map-add <name> <repo-folder>: adds a project to the Your Turn map. Run as a child process against a fake vault and projects folder.
// The implementation must honour TURN_VAULT (the vault) and TURN_PROJECTS_ROOT (the folder a repo must be under; default $HOME/Projects).
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync, symlinkSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SCRIPT = join(ROOT, 'scripts/map-add');

type W = {home: string; vault: string; projects: string; maps: string; repo: string; outside: string};
function world(): W {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'mapadd-')));
  const vault = join(home, 'vault'), projects = join(home, 'Projects'), outside = join(home, 'elsewhere');
  const repo = join(projects, 'alpha');
  for (const d of [vault, projects, repo, outside]) mkdirSync(d, {recursive: true});
  mkdirSync(join(vault, 'maps'));
  return {home, vault, projects, maps: join(vault, 'maps'), repo, outside};
}
function run(w: W, ...args: string[]) {
  assert.ok(existsSync(SCRIPT), 'scripts/map-add is missing'); // else every refusal test would pass for the wrong reason
  const r = spawnSync('bash', [SCRIPT, ...args], {encoding: 'utf8', timeout: 30000, env: {PATH: process.env.PATH ?? '', HOME: w.home, TURN_VAULT: w.vault, TURN_PROJECTS_ROOT: w.projects}});
  return {code: r.status, out: `${r.stdout}${r.stderr}`};
}
const files = (w: W): string[] => readdirSync(w.maps).sort();
const lines = (w: W): string[] => (existsSync(join(w.maps, 'repos.txt')) ? readFileSync(join(w.maps, 'repos.txt'), 'utf8').split('\n').filter(Boolean) : []);

test('a good name and repo create the skeleton map (mode 644) and list the repo', () => {
  const w = world();
  const r = run(w, 'alpha', w.repo);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(readFileSync(join(w.maps, 'alpha.json'), 'utf8')), {project: 'alpha', repo: w.repo, parts: []});
  assert.equal(statSync(join(w.maps, 'alpha.json')).mode & 0o777, 0o644);
  assert.deepEqual(lines(w), [w.repo]);
});

test('the output says what it did and what to do next', () => {
  const w = world();
  const r = run(w, 'alpha', w.repo);
  assert.equal(r.code, 0, r.out);
  assert.ok(r.out.includes('alpha.json'), r.out);
  assert.match(r.out, /parts/i);
  assert.match(r.out, /\/plan/);
  assert.match(r.out, /by hand|edit/i);
});

test('a second project appends to repos.txt; the same repo is never listed twice', () => {
  const w = world();
  const beta = join(w.projects, 'beta');
  mkdirSync(beta);
  assert.equal(run(w, 'alpha', w.repo).code, 0);
  assert.equal(run(w, 'beta', beta).code, 0);
  assert.deepEqual(lines(w), [w.repo, beta]);
  assert.equal(run(w, 'alpha-two', w.repo).code, 0); // another map for an already listed repo
  assert.deepEqual(lines(w), [w.repo, beta]);
  assert.deepEqual(files(w), ['alpha-two.json', 'alpha.json', 'beta.json', 'repos.txt']);
});

test('works when maps/ does not exist yet', () => {
  const w = world();
  rmSync(w.maps, {recursive: true});
  const r = run(w, 'alpha', w.repo);
  assert.equal(r.code, 0, r.out);
  assert.ok(existsSync(join(w.maps, 'alpha.json')));
});

for (const [label, name] of [['a path separator', 'a/b'], ['a parent path', '../x'], ['a dot', 'a.b'], ['a .json suffix', 'alpha.json'], ['uppercase', 'Alpha'], ['a space', 'my proj'], ['empty', ''], ['too long', 'x'.repeat(41)], ['a leading dash', '-x'], ['an underscore', 'a_b']] as const) {
  test(`refuses a bad name (${label}) and writes nothing`, () => {
    const w = world();
    const r = run(w, name, w.repo);
    assert.notEqual(r.code, 0, r.out);
    assert.ok(r.out.trim().length > 0 && !/at .*\.ts:\d+|node:internal/.test(r.out), r.out); // a plain message, no stack trace
    assert.deepEqual(files(w), []);
    assert.deepEqual(readdirSync(w.vault), ['maps']);
  });
}

test('refuses a missing argument', () => {
  const w = world();
  assert.notEqual(run(w, 'alpha').code, 0);
  assert.notEqual(run(w).code, 0);
  assert.deepEqual(files(w), []);
});

test('refuses a repo that is missing, a file, a symlink, or outside the projects folder; writes nothing', () => {
  const w = world();
  const file = join(w.projects, 'afile'), link = join(w.projects, 'alink'), notHere = join(w.projects, 'nope');
  writeFileSync(file, 'x');
  symlinkSync(w.repo, link);
  const via = join(w.projects, 'viadir'); // a folder reached through a symlinked parent
  symlinkSync(w.outside, via);
  mkdirSync(join(w.outside, 'inner'));
  const cases = [notHere, file, link, w.outside, w.projects, join(via, 'inner'), 'alpha', `${w.repo}/../../elsewhere`];
  for (const c of cases) {
    const r = run(w, 'good-name', c);
    assert.notEqual(r.code, 0, `${c}: ${r.out}`);
    assert.ok(r.out.trim().length > 0 && !/node:internal/.test(r.out), r.out);
    assert.deepEqual(files(w), [], c);
  }
});

test('an existing map name is refused and the file is never overwritten', () => {
  const w = world();
  const mine = '{"project":"alpha","repo":"/keep/me","parts":[{"id":"p1"}]}\n';
  writeFileSync(join(w.maps, 'alpha.json'), mine, {mode: 0o600});
  const r = run(w, 'alpha', w.repo);
  assert.notEqual(r.code, 0, r.out);
  assert.equal(readFileSync(join(w.maps, 'alpha.json'), 'utf8'), mine);
  assert.equal(statSync(join(w.maps, 'alpha.json')).mode & 0o777, 0o600);
  assert.deepEqual(lines(w), []); // and the repo is not listed by a refused run
});

test('a name that exists as a dangling symlink is refused and the target is not created', () => {
  const w = world();
  const target = join(w.outside, 'planted.json');
  symlinkSync(target, join(w.maps, 'alpha.json'));
  const r = run(w, 'alpha', w.repo);
  assert.notEqual(r.code, 0, r.out);
  assert.equal(existsSync(target), false);
});
