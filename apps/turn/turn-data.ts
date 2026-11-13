// Read-only reader for the page "Your Turn". It only reads the rail's own files through an injected fs;
// it never writes and never runs a program. Anything not found in those files reads "not recorded".
import {findPlaces, placeFile, winner, type Place} from './turn-roots.ts';
// Every file it reads can be written by an agent: treat all text as untrusted data.
// mtime: a file's modification time in ms since epoch (null when unknown). readTail: the last maxChars characters of a file.
export type Fs = {read(path: string): string | null; list(path: string): string[] | null; mtime?(path: string): number | null; readTail?(path: string, maxChars: number): string | null};
export type Older = {name: string; repo: string};
export type CardOpts = {historyPath?: string; now?: number};
// approveLine is null when the card's file name is not safe to paste into a shell (the page then says so).
export type Pending = {name: string; repo: string; scope: string; approveLine: string | null};
// where: the place the record came from, in plain words (only when the vault is given: "a build in progress", "the main folder", "an archived build (date)").
export type Ship = {repo: string; head: string; title?: string; where?: string};
export type Receipt = {repo: string; shipped: boolean; fields: Record<string, string>; title?: string; where?: string};

const NOT_RECORDED = 'not recorded';
const KEYS = ['checks', 'tests written first', 'reviewer', 'files touched', 'started', 'finished', 'tried by you', 'proof', 'cost', 'builder says', 'builder checked by hand', 'seal'];
const MAX_CHARS = 200_000; // a file bigger than this reads as missing
const MAX_FILES = 500;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const SHOWN = 400; // repo and scope come from agent-written text: show a bounded piece only

const read = (fs: Fs, path: string): string | null => {
  const text = fs.read(path);
  return text !== null && text.length <= MAX_CHARS ? text : null;
};

function readJson(fs: Fs, path: string): Record<string, unknown> | null {
  const text = read(fs, path);
  if (text === null) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Text from agent-written files is shown without control and bidi-override characters (they could spoof how a name reads).
const clean = (s: string): string => s.replace(/[\p{C}\u202a-\u202e\u2066-\u2069]/gu, '');
const field = (text: string, key: 'repo' | 'scope'): string => clean(text.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'))?.[1]?.trim() ?? '').slice(0, SHOWN);
// Card names are compared without case and without .md: macOS files ignore case, and settling too much is the safe side.
const norm = (n: string): string => n.replace(/\.md$/i, '').toLowerCase();

const DAY = 86_400_000, FRESH_MS = 3 * DAY, SKEW_MS = 60_000, HISTORY_LINES = 5000, HISTORY_CHARS = 2_000_000, OLDER_MAX = 200, SETTLED_MAX = 200, SCAN_MAX = 5000;

// Every card file that was ever approved: the live per-repo records (each newer approval overwrites the older one in
// them) plus the history, which keeps every approval. A card in either is settled: it never waits. Names are normalised (norm).
function approvedNames(fs: Fs, vault: string, approvalsDir: string, opts: CardOpts): Set<string> {
  const names = new Set<string>();
  for (const f of (fs.list(approvalsDir) ?? []).slice(0, MAX_FILES)) {
    if (!f.endsWith('.json')) continue;
    const src = readJson(fs, `${approvalsDir}/${f}`)?.source;
    if (typeof src === 'string') names.add(norm(src));
  }
  const path = opts.historyPath ?? `${vault}/logs/approvals-history.jsonl`;
  const text = typeof fs.readTail === 'function' ? fs.readTail(path, HISTORY_CHARS) : fs.read(path); // no history yet reads as none
  for (const line of (text ?? '').slice(-HISTORY_CHARS).split(/\r?\n/).filter((l) => l.trim() !== '').slice(-HISTORY_LINES)) {
    try {
      const v: unknown = JSON.parse(line); // a partial first line (the tail cut) or a bad line is skipped
      const card = v !== null && typeof v === 'object' ? (v as Record<string, unknown>).card : undefined;
      if (typeof card === 'string') names.add(norm(card));
    } catch { /* skipped */ }
  }
  return names;
}

// A draft card that was never approved is WAITING only when its file is at most 3 days old (a small clock skew is allowed, a future
// or zero time is not); older, or of unknown age, it is OLDER: shown by name only, never with an approve line, because running the
// line of an old finished card would replace the live approval. Settled cards are only named (never silently gone).
// Card text is read only for cards that are kept, so a flood of files costs lstat calls, not reads.
export function cardLists(fs: Fs, vault: string, approvalsDir: string, opts: CardOpts = {}): {waiting: Pending[]; older: Older[]; settled: string[]} {
  const approved = approvedNames(fs, vault, approvalsDir, opts);
  const now = opts.now ?? Date.now();
  const out = {waiting: [] as Pending[], older: [] as Older[], settled: [] as string[]};
  for (const f of (fs.list(`${vault}/cards`) ?? []).filter((n) => n.endsWith('.md')).sort().slice(0, SCAN_MAX)) {
    const name = f.slice(0, -3), shown = clean(name), path = `${vault}/cards/${f}`;
    if (approved.has(norm(f))) { if (out.settled.length < SETTLED_MAX) out.settled.push(shown); continue; }
    const mtime = typeof fs.mtime === 'function' ? fs.mtime(path) : undefined; // anything but a number reads as unknown age
    const age = typeof mtime === 'number' ? now - mtime : NaN;
    if (typeof mtime === 'number' && mtime > 0 && age >= -SKEW_MS && age <= FRESH_MS) { // false for NaN and Infinity too
      if (out.waiting.length < MAX_FILES) {
        const text = read(fs, path) ?? '';
        out.waiting.push({name: shown, repo: field(text, 'repo'), scope: field(text, 'scope'), approveLine: SAFE_NAME.test(name) ? `~/Projects/proof-lab/scripts/approve-card ${name}` : null});
      }
    } else if (out.older.length < OLDER_MAX) out.older.push({name: shown, repo: field(read(fs, path) ?? '', 'repo')});
  }
  return out;
}
export const pendingCards = (fs: Fs, vault: string, approvalsDir: string, opts: CardOpts = {}): Pending[] => cardLists(fs, vault, approvalsDir, opts).waiting;
export const olderCards = (fs: Fs, vault: string, approvalsDir: string, opts: CardOpts = {}): Older[] => cardLists(fs, vault, approvalsDir, opts).older;

// The card now approved for a repo: the source file name (without .md) of the NEWEST live record for that exact repo path, else ''.
export function approvedTitle(fs: Fs, approvalsDir: string, repo: string): string {
  let best: {at: string; source: string} | null = null;
  for (const f of (fs.list(approvalsDir) ?? []).slice(0, MAX_FILES)) {
    if (!f.endsWith('.json')) continue;
    const rec = readJson(fs, `${approvalsDir}/${f}`);
    if (rec?.repo !== repo || typeof rec.source !== 'string') continue;
    const at = typeof rec.approved_at === 'string' ? rec.approved_at : '';
    if (best === null || at > best.at) best = {at, source: rec.source};
  }
  return best === null ? '' : clean(best.source.replace(/\.md$/, '')).slice(0, 120);
}

// Waiting to ship: the verifier said PASS, the job record says a ship step is waiting, and no ship PASS exists for the current HEAD.
// A bare check PASS is not a ship decision.
// With a vault, every place of the repo that can still be shipped from (the main folder and live worktrees, never an archived build) is judged by the same rule.
const mainPlace = (repo: string): Place => ({kind: 'main', root: repo, name: '', label: 'the main folder'});

export function shipsWaiting(fs: Fs, repos: string[], headOf: (repo: string) => string | null, vault?: string): Ship[] {
  const out: Ship[] = [];
  for (const repo of repos) {
    const places = vault === undefined ? [mainPlace(repo)] : findPlaces(fs, repo, vault).places.filter((p) => p.kind !== 'archived');
    for (const place of places) {
      const verify = readJson(fs, placeFile(place, 'last-verify.json'));
      if (verify?.verdict !== 'PASS') continue;
      const job = readJson(fs, placeFile(place, 'job.json'));
      if (job?.ship_waiting !== true) continue;
      const head = headOf(place.root); // only for a place that qualifies: reading a head can be costly
      if (head === null) continue;
      // job.head is the commit the check ran on (the record is written before the commit), so it is compared with the gate's own record, not with git HEAD
      if (job.head !== undefined && !(typeof job.head === 'string' && job.head === verify.head)) continue;
      const shipped = readJson(fs, placeFile(place, 'last-ship.json'));
      if (shipped?.verdict === 'PASS' && shipped.head === head) continue;
      const card = job.card;
      const title = typeof card === 'string' ? clean(card).trim().slice(0, 120) : '';
      out.push({repo, head, ...(title !== '' ? {title} : {}), ...(vault !== undefined ? {where: place.label} : {})});
    }
  }
  return out;
}

// The reviewer's finding format is `file:line | P1|P2|P3 | reason`; a lens with nothing to report writes `none`.
// Count findings from that format only, as "P1 / P2 / P3". Anything else (empty file, free text) is "not recorded".
// Strict: blank lines and `#` headings are ignored; any other line that is neither a finding nor `none`
// makes the whole count "not recorded", so one lens's `none` can never hide another lens's malformed P1.
function reviewerCounts(critic: string | null): string {
  if (critic === null) return NOT_RECORDED;
  const n = {P1: 0, P2: 0, P3: 0};
  let seen = 0;
  for (const raw of critic.split(/\r?\n/)) {
    const l = raw.trim();
    if (l === '' || l.startsWith('#')) continue;
    const m = l.match(/^[^|]+\|\s*(P[123])\s*\|/);
    if (m) n[m[1] as 'P1' | 'P2' | 'P3']++;
    else if (l.toLowerCase() !== 'none') return NOT_RECORDED;
    seen++;
  }
  return seen === 0 ? NOT_RECORDED : `${n.P1} / ${n.P2} / ${n.P3}`;
}

// The card's allowed_files entries (lines `  - path` under `allowed_files:`), or null when there is no usable list.
function allowedFiles(card: string | null): string[] | null {
  if (card === null) return null;
  const out: string[] = [];
  let inList = false;
  for (const line of card.split(/\r?\n/)) {
    if (line.startsWith('allowed_files:')) inList = true;
    else if (inList && /^\s+-\s+\S/.test(line)) out.push(line.replace(/^\s+-\s+/, '').trim());
    else if (inList && line.trim() !== '') inList = false;
  }
  return out.length > 0 ? out : null;
}

// "N of M allowed files" (+ ", K outside the card"): the check's changed files against the card's allowed_files.
function filesTouched(verify: Record<string, unknown>, card: string | null): string {
  const allowed = allowedFiles(card), changed = verify.changed_files;
  if (allowed === null || !Array.isArray(changed) || !changed.every((c) => typeof c === 'string')) return NOT_RECORDED;
  if (changed.length > MAX_FILES || allowed.length > MAX_FILES) return NOT_RECORDED; // a flood is not compared (it would freeze the poll)
  const files = (changed as string[]).filter((c) => c !== '.claude/card.md' && c !== '.claude/last-verify.json');
  const outside = files.filter((f) => !allowed.some((a) => (a.endsWith('/') ? f.startsWith(a) : f === a))).length;
  return `${files.length} of ${allowed.length} allowed files${outside > 0 ? `, ${outside} outside the card` : ''}`;
}

// Only times from 2000 to 2200 are shown; anything else (or a time that would make toISOString throw) is "not recorded".
const stamp = (ms: number): string | null => (Number.isFinite(ms) && ms > 9.46e11 && ms < 7.26e12 ? `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC` : null);
const isoStamp = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? stamp(Date.parse(v)) : null);

// The script's check of "tests first", worded in code: the file can never turn it into a plain "yes".
function testsFirst(job: Record<string, unknown>): string {
  if (job.checked_by !== 'script' || typeof job.tests_first !== 'boolean') return NOT_RECORDED;
  const again = typeof job.starts === 'number' && job.starts > 1 ? ', started again' : '';
  if (job.tests_first) return `yes (script check, can be fooled)${again}`;
  const why = typeof job.tests_first_reason === 'string' ? clean(job.tests_first_reason).trim().slice(0, 120) : '';
  return `no (script check)${why !== '' ? `: ${why}` : ''}${again}`;
}

const ownWords = (v: unknown): string => (typeof v === 'string' && clean(v).trim() !== '' ? clean(v).trim().slice(0, 160) : NOT_RECORDED);

// A receipt exists only for a PASS. `shipped` is true only when a ship PASS matches the current HEAD.
// Fields come from the gate's own files, else "not recorded".
// With a vault, the receipt comes from ONE place (the winner: the newest PASS check record among the main folder, live worktrees and
// archived builds) and every field is read from that same place: nothing is mixed between two places. Without a vault: the main folder only.
export function receipt(fs: Fs, repo: string, headOf: (repo: string) => string | null, vault?: string): Receipt | null {
  const main = mainPlace(repo);
  const place = vault === undefined ? main : winner(fs, findPlaces(fs, repo, vault).places);
  if (place === null) return null;
  const verify = readJson(fs, placeFile(place, 'last-verify.json'));
  if (verify?.verdict !== 'PASS') return null;
  // An archived build has no ship record of its own that counts: the repo's main one decides.
  const shipPlace = place.kind === 'archived' ? main : place;
  const shipRecord = readJson(fs, placeFile(shipPlace, 'last-ship.json'));
  const head = headOf(shipPlace.root);
  const shipped = head !== null && shipRecord?.verdict === 'PASS' && shipRecord.head === head;
  const sha = verify.card_sha256;
  const fields: Record<string, string> = Object.fromEntries(KEYS.map((k) => [k, NOT_RECORDED]));
  fields['checks'] = 'passed';
  fields['reviewer'] = reviewerCounts(read(fs, placeFile(place, 'critic.md')));
  fields['files touched'] = filesTouched(verify, read(fs, placeFile(place, 'card.md')));
  const job = readJson(fs, placeFile(place, 'job.json')) ?? {}; // every field optional; a wrong type only blanks that field
  fields['tests written first'] = testsFirst(job);
  const says = readJson(fs, placeFile(place, 'builder-says.json')) ?? {}; // the builder's own words: shown as such, never used for anything else
  fields['builder says'] = ownWords(says.summary);
  fields['builder checked by hand'] = ownWords(says.checked_by_hand);
  const mtime = typeof fs.mtime === 'function' ? fs.mtime(placeFile(place, 'last-verify.json')) : null;
  const finished = isoStamp(job.finished_at) ?? (typeof mtime === 'number' ? stamp(mtime) : null);
  if (finished !== null) fields['finished'] = finished;
  const started = isoStamp(job.started_at);
  if (started !== null) fields['started'] = started;
  if (typeof job.cost_usd === 'number' && Number.isFinite(job.cost_usd) && job.cost_usd >= 0) fields['cost'] = `$${job.cost_usd.toFixed(2)}`;
  const tried = typeof job.tried === 'string' ? clean(job.tried).trim().slice(0, 120) : '';
  if (tried !== '') fields['tried by you'] = tried;
  if (typeof sha === 'string' && /^[0-9a-f]{64}$/.test(sha)) fields['seal'] = sha.slice(0, 12);
  const title = typeof job.card === 'string' ? clean(job.card).trim().slice(0, 120) : '';
  return {repo, shipped, fields, ...(title !== '' ? {title} : {}), ...(vault !== undefined ? {where: place.label} : {})};
}
