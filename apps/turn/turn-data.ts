// Read-only reader for the page "Your Turn". It only reads the rail's own files through an injected fs;
// it never writes and never runs a program. Anything not found in those files reads "not recorded".
// Every file it reads can be written by an agent: treat all text as untrusted data.
export type Fs = {read(path: string): string | null; list(path: string): string[] | null};
// approveLine is null when the card's file name is not safe to paste into a shell (the page then says so).
export type Pending = {name: string; repo: string; scope: string; approveLine: string | null};
export type Ship = {repo: string; head: string};
export type Receipt = {repo: string; shipped: boolean; fields: Record<string, string>};

const NOT_RECORDED = 'not recorded';
const KEYS = ['checks', 'tests written first', 'serious problems', 'files touched', 'tried by you', 'proof', 'cost', 'time', 'seal'];
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

const field = (text: string, key: 'repo' | 'scope'): string => text.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'))?.[1]?.trim().slice(0, SHOWN) ?? '';

// A draft card is "waiting" until some approval record names its file as the source.
// Reads are not atomic (list, then read): a write in between shows up on the next poll.
export function pendingCards(fs: Fs, vault: string, approvalsDir: string): Pending[] {
  const sources = new Set<string>();
  for (const f of (fs.list(approvalsDir) ?? []).slice(0, MAX_FILES)) {
    if (!f.endsWith('.json')) continue;
    const src = readJson(fs, `${approvalsDir}/${f}`)?.source;
    if (typeof src === 'string') sources.add(src);
  }
  return (fs.list(`${vault}/cards`) ?? [])
    .filter((f) => f.endsWith('.md') && !sources.has(f))
    .sort()
    .slice(0, MAX_FILES)
    .map((f) => {
      const name = f.slice(0, -3);
      const text = read(fs, `${vault}/cards/${f}`) ?? '';
      const approveLine = SAFE_NAME.test(name) ? `~/Projects/proof-lab/scripts/approve-card ${name}` : null;
      return {name, repo: field(text, 'repo'), scope: field(text, 'scope'), approveLine};
    });
}

// Waiting to ship: the verifier said PASS and no ship PASS exists for the current HEAD.
export function shipsWaiting(fs: Fs, repos: string[], headOf: (repo: string) => string | null): Ship[] {
  const out: Ship[] = [];
  for (const repo of repos) {
    const head = headOf(repo);
    if (head === null || readJson(fs, `${repo}/.claude/last-verify.json`)?.verdict !== 'PASS') continue;
    const shipped = readJson(fs, `${repo}/.claude/last-ship.json`);
    if (shipped?.verdict === 'PASS' && shipped.head === head) continue;
    out.push({repo, head});
  }
  return out;
}

// The reviewer's finding format is `file:line | P1|P2|P3 | reason`; a lens with nothing to report writes `none`.
// Count P1 findings from that format only. Anything else (empty file, free text) is "not recorded".
// Strict: blank lines and `#` headings are ignored; any other line that is neither a finding nor `none`
// makes the whole count "not recorded", so one lens's `none` can never hide another lens's malformed P1.
function seriousProblems(critic: string | null): string {
  if (critic === null) return NOT_RECORDED;
  let p1 = 0;
  let seen = 0;
  for (const raw of critic.split(/\r?\n/)) {
    const l = raw.trim();
    if (l === '' || l.startsWith('#')) continue;
    const m = l.match(/^[^|]+\|\s*(P[123])\s*\|/);
    if (m) p1 += m[1] === 'P1' ? 1 : 0;
    else if (l.toLowerCase() !== 'none') return NOT_RECORDED;
    seen++;
  }
  return seen === 0 ? NOT_RECORDED : String(p1);
}

// A receipt exists only for a PASS. `shipped` is true only when a ship PASS matches the current HEAD.
// Fields come from the gate's own files, else "not recorded".
export function receipt(fs: Fs, repo: string, headOf: (repo: string) => string | null): Receipt | null {
  const verify = readJson(fs, `${repo}/.claude/last-verify.json`);
  if (verify?.verdict !== 'PASS') return null;
  const shipRecord = readJson(fs, `${repo}/.claude/last-ship.json`);
  const head = headOf(repo);
  const shipped = head !== null && shipRecord?.verdict === 'PASS' && shipRecord.head === head;
  const sha = verify.card_sha256;
  const fields: Record<string, string> = Object.fromEntries(KEYS.map((k) => [k, NOT_RECORDED]));
  fields['checks'] = 'passed';
  fields['serious problems'] = seriousProblems(read(fs, `${repo}/.claude/critic.md`));
  if (typeof sha === 'string' && /^[0-9a-f]{64}$/.test(sha)) fields['seal'] = sha.slice(0, 12);
  return {repo, shipped, fields};
}
