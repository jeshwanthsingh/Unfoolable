// "Your Turn": where a project's build records live. A build runs in a dispatch worktree, so the records are not only in the main
// checkout: they are in live worktrees (found by reading git's own worktree list files, never by running git) and, after
// `dispatch --clean`, in flat archive folders in the vault. Read only. Every name and path here is agent-written data: cleaned and capped.
import {basename, dirname, resolve} from 'node:path';
import type {Fs} from './turn-data.ts';

export type Place = {kind: 'main' | 'live' | 'archived'; root: string; name: string; label: string};

const MAX_CHARS = 200_000;
const MAX_LIVE = 100, MAX_ENTRIES = 400, MAX_ARCHIVED = 200, SKEW_MS = 60_000;
const clean = (s: string): string => s.replace(/[\p{C}‪-‮⁦-⁩]/gu, '');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// main and live keep records in <root>/.claude/; an archived folder holds them flat.
export const placeFile = (p: Place, name: string): string => (p.kind === 'archived' ? `${p.root}/${name}` : `${p.root}/.claude/${name}`);

export function readObject(fs: Fs, path: string): Record<string, unknown> | null {
  const t = fs.read(path);
  if (t === null || t.length > MAX_CHARS) return null;
  try {
    const v: unknown = JSON.parse(t);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function findPlaces(fs: Fs, repo: string, vault: string): {places: Place[]; unreadable: string[]} {
  const places: Place[] = [{kind: 'main', root: repo, name: '', label: 'the main folder'}];
  const unreadable: string[] = [];
  const wtDir = resolve(`${dirname(repo)}/${basename(repo)}-wt`);
  const seen = new Set<string>();
  let live = 0;
  // Junk entries must not hide real worktrees: up to MAX_ENTRIES are looked at, and the cap counts only real places.
  for (const e of (fs.list(`${repo}/.git/worktrees`) ?? []).slice(0, MAX_ENTRIES)) {
    if (live >= MAX_LIVE) break;
    const raw = fs.read(`${repo}/.git/worktrees/${e}/gitdir`);
    if (raw === null) { unreadable.push(`a build folder of ${clean(basename(repo))}`); continue; }
    const line = (raw.split(/\r?\n/)[0] ?? '').trim(); // git writes the plain path of the worktree's .git file
    if (!line.startsWith('/') || !line.endsWith('/.git') || line.includes('\0')) continue;
    const wt = resolve(line.slice(0, -5));
    // only a folder directly inside <repo>-wt/ that exists, listed once; fs.list refuses a symlink, for the folder and for its .claude
    if (dirname(wt) !== wtDir || seen.has(wt) || fs.list(wt) === null || fs.list(`${wt}/.claude`) === null) continue;
    seen.add(wt);
    live++;
    places.push({kind: 'live', root: wt, name: clean(basename(wt)), label: 'a build in progress'});
  }
  const re = new RegExp(`^(\\d{4}-\\d\\d-\\d\\d)-${escapeRe(basename(repo))}-[\\s\\S]+$`);
  const dated = (fs.list(`${vault}/90-archive/worktrees`) ?? []).flatMap((n) => { const m = re.exec(n); return m ? [[n, m[1]!] as const] : []; });
  let archived = 0;
  for (const [n, date] of dated.sort().reverse()) { // newest names first
    if (archived >= MAX_ARCHIVED) break;
    const root = `${vault}/90-archive/worktrees/${n}`;
    if (fs.list(root) === null) continue; // a symlink or a file is not an archived build (fs.list refuses a symlink)
    archived++;
    places.push({kind: 'archived', root, name: clean(n), label: `an archived build (${date})`});
  }
  return {places, unreadable};
}

const RANK = {live: 2, main: 1, archived: 0};

// Among the places that pass `ok`, the one whose `file` was written last. A time that is unknown, zero, negative or more than a minute
// in the future counts as the oldest. Ties: live, then main, then archived, then list order.
export function newestBy(fs: Fs, places: Place[], file: string, ok: (p: Place) => boolean): Place | null {
  let best: {p: Place; t: number} | null = null;
  for (const p of places) {
    if (!ok(p)) continue;
    const m = typeof fs.mtime === 'function' ? fs.mtime(placeFile(p, file)) : null;
    const t = typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= Date.now() + SKEW_MS ? m : -Infinity;
    if (best === null || t > best.t || (t === best.t && RANK[p.kind] > RANK[best.p.kind])) best = {p, t};
  }
  return best?.p ?? null;
}

// The one place a receipt comes from: the newest check record that is a PASS.
export const winner = (fs: Fs, places: Place[]): Place | null => newestBy(fs, places, 'last-verify.json', (p) => readObject(fs, placeFile(p, 'last-verify.json'))?.verdict === 'PASS');
