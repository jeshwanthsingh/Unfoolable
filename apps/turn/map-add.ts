// scripts/map-add <name> <repo-folder>: the one command that adds a project to the Your Turn Map. You run it in your own terminal.
// It creates <vault>/maps/<name>.json as an empty map and lists the repo in <vault>/maps/repos.txt. It never overwrites a map.
import {closeSync, constants, fchmodSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, unlinkSync, writeSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validRepo} from './turn-watch.ts';

const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
class Refusal extends Error {}

export function addMap(vault: string, projectsRoot: string, name: string, repo: string): string {
  if (!NAME.test(name)) throw new Refusal(`"${name}" is not a usable name: use 1 to 40 lowercase letters, digits or dashes, starting with a letter or digit.`);
  let root: string;
  try { root = realpathSync(projectsRoot); } catch { throw new Refusal(`the projects folder ${projectsRoot} does not exist.`); }
  if (!validRepo(repo, root)) throw new Refusal(`${repo} is not a usable repo folder: it must be the full path of a real folder (not a link) inside ${root}.`);
  const maps = join(vault, 'maps');
  try {
    if (lstatSync(maps).isSymbolicLink()) throw new Refusal(`${maps} is a link; look at it first.`);
  } catch (e) {
    if (e instanceof Refusal) throw e;
  }
  const list = join(maps, 'repos.txt');
  let known = '';
  try { known = readFileSync(list, 'utf8'); } catch { /* a missing list is made below */ }
  const knownLines = known.split('\n');
  if (!knownLines.includes(repo) && (knownLines.filter(Boolean).length >= 49 || known.length > 90_000)) throw new Refusal(`${list} is full: the page reads at most 50 lines. Nothing was changed.`);
  mkdirSync(maps, {recursive: true});
  const file = join(maps, `${name}.json`);
  let fd: number;
  try {
    fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o644); // exclusive: never overwrites, never follows a planted link
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Refusal(`${file} already exists; nothing was changed.`);
    throw e;
  }
  try {
    fchmodSync(fd, 0o644);
    writeSync(fd, JSON.stringify({project: name, repo, parts: []}, null, 2) + '\n');
  } catch (e) {
    try { unlinkSync(file); } catch { /* the empty file would block a rerun, so it is removed; if that fails too, remove it by hand */ }
    throw e;
  } finally {
    closeSync(fd);
  }
  let listed = `${repo} is already listed in ${list}.`;
  if (!knownLines.includes(repo)) {
    try {
      const lfd = openSync(list, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o644);
      try { writeSync(lfd, `${known === '' || known.endsWith('\n') ? '' : '\n'}${repo}\n`); } finally { closeSync(lfd); }
      listed = `listed ${repo} in ${list}, so the Your Turn page watches it (no restart needed).`;
    } catch (e) {
      throw new Refusal(`${file} was created, but ${repo} could not be listed (${(e as Error).message}). Add this line to ${list} by hand: ${repo}`);
    }
  }
  return `created ${file}: an empty map (parts is []).\n${listed}\nNext: edit the parts in that file by hand, or have /plan fill them. The Map tab draws it once it has parts.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const home = process.env.HOME ?? '';
  const [name, repo, ...extra] = process.argv.slice(2);
  try {
    if (name === undefined || repo === undefined || extra.length > 0) throw new Refusal('usage: map-add <name> <repo-folder>   (the full path of the project folder, inside your Projects folder)');
    if (!home && !process.env.TURN_VAULT) throw new Refusal('HOME is not set.');
    console.log(addMap(process.env.TURN_VAULT || join(home, 'Projects/proof-lab'), process.env.TURN_PROJECTS_ROOT || join(home, 'Projects'), name, repo));
  } catch (e) {
    console.error(`map-add: ${e instanceof Refusal ? e.message : `could not finish (${(e as Error).message})`}`);
    process.exit(1);
  }
}
