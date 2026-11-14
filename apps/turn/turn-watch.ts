// Which repos the Your Turn page watches: the ones the server was started with PLUS the valid lines of <vault>/maps/repos.txt,
// read on every call, so a project added with scripts/map-add shows without a restart. Read only: nothing here writes.
import {closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync} from 'node:fs';
import {normalize, sep} from 'node:path';

const MAX_LINES = 50;
const MAX_BYTES = 100_000; // a file bigger than this reads as missing: 50 paths never need it

// A repo folder the page may watch: an absolute, already-normal path to a real folder (not a symlink, not reached through one) strictly under `root`.
export function validRepo(p: string, root: string): boolean {
  if (!p.startsWith('/') || p.length > 1000 || /[\0\r\n]/.test(p) || normalize(p) !== p) return false; // known limit: a folder swapped for a link after this check is still read, read only, inside the user's own Projects folder
  try {
    return lstatSync(p).isDirectory() && realpathSync(p) === p && p.startsWith(root + sep);
  } catch {
    return false;
  }
}

function readList(path: string): string | null { // one bounded read of a regular file, never through a symlink
  let fd = -1;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > MAX_BYTES) return null;
    const buf = Buffer.alloc(st.size);
    return buf.subarray(0, readSync(fd, buf, 0, st.size, 0)).toString('utf8');
  } catch {
    return null;
  } finally {
    if (fd >= 0) closeSync(fd);
  }
}

export function watchedRepos(vault: string, configured: string[], projectsRoot: string): string[] {
  const out = [...new Set(configured)];
  const text = readList(`${vault}/maps/repos.txt`);
  if (text === null) return out;
  let root: string;
  try { root = realpathSync(projectsRoot); } catch { return out; }
  for (const line of text.split('\n').slice(0, MAX_LINES)) {
    const p = line.replace(/\r$/, '');
    if (!out.includes(p) && validRepo(p, root)) out.push(p);
  }
  return out;
}
