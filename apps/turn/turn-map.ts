// "Your Turn" Map: one project drawn as parts and pieces from a hand-written vault file (maps/<project>.json).
// Read only: it never writes and never runs a program. A piece's STATE is never taken from that file: it is computed from the rail's own
// records (job, check, ship, archive, approvals, cards folder). Only plans (idea, queued, planned) come from the file, labelled as plans.
// Every file it reads can be written by an agent: all text is data, cleaned and capped.
import {resolve} from 'node:path';
import type {Fs} from './turn-data.ts';
import {findPlaces, newestBy, placeFile, type Place} from './turn-roots.ts';

// repos: the projects the server watches. When given, a map's `repo` (written in an agent-writable file) must be one of them,
// or its records are not read at all: otherwise a map could point at a planted folder and forge "Built" or "Shipped".
export type MapOpts = {vault: string; approvalsDir: string; project: string; headOf: (repo: string) => string | null; historyPath?: string; now?: number; repos?: string[]};
export type PieceView = {id: string; name: string; plain: string; model: string; plan: string; state: string; from: string; isPlan: boolean; card?: string; needs: string[]; blockedBy: string[]};
export type PartView = {id: string; name: string; plain: string; pieces: PieceView[]};
export type MapResult = {ok: true; project: string; repo: string; parts: PartView[]} | {ok: false; why: 'missing' | 'unreadable'};

const NOT_RECORDED = 'not recorded';
const MAX_CHARS = 200_000; // a file bigger than this is unreadable
const NAME = /^[a-z0-9-]{1,40}$/;
const CARD = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const MAX_PARTS = 12, MAX_PIECES = 40, MAX_NEEDS = 20, MAX_MAPS = 50, HISTORY_LINES = 5000, HISTORY_CHARS = 2_000_000, MAX_FILES = 500;
const PLANS = ['idea', 'queued', 'planned'];
const MODELS = ['claude', 'codex', 'either'];
const DONE = ['Built', 'Shipped', 'Finished (card archived)'];

const clean = (s: string): string => s.replace(/[\p{C}‪-‮⁦-⁩]/gu, '');
const text = (v: unknown, max: number): string => (typeof v === 'string' && clean(v).trim() !== '' ? clean(v).trim().slice(0, max) : NOT_RECORDED);
const norm = (n: string): string => n.replace(/\.md$/i, '').toLowerCase();
const obj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function readJson(fs: Fs, path: string): Record<string, unknown> | null {
  const t = fs.read(path);
  if (t === null || t.length > MAX_CHARS) return null;
  try {
    const v: unknown = JSON.parse(t);
    return obj(v) ? v : null;
  } catch {
    return null;
  }
}

// Card names that were ever approved: the live records and the history (same sources as the Turn page; a card may already have left cards/).
function approved(fs: Fs, o: MapOpts): Set<string> {
  const names = new Set<string>();
  for (const f of (fs.list(o.approvalsDir) ?? []).slice(0, MAX_FILES)) {
    if (!f.endsWith('.json')) continue;
    const src = readJson(fs, `${o.approvalsDir}/${f}`)?.source;
    if (typeof src === 'string') names.add(norm(src));
  }
  const path = o.historyPath ?? `${o.vault}/logs/approvals-history.jsonl`;
  const raw = typeof fs.readTail === 'function' ? fs.readTail(path, HISTORY_CHARS) : fs.read(path);
  for (const line of (raw ?? '').slice(-HISTORY_CHARS).split(/\r?\n/).filter((l) => l.trim() !== '').slice(-HISTORY_LINES)) {
    try {
      const v: unknown = JSON.parse(line);
      if (obj(v) && typeof v.card === 'string') names.add(norm(v.card));
    } catch { /* a partial or bad line is skipped */ }
  }
  return names;
}

const validIso = (v: unknown): boolean => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));

export function listMaps(fs: Fs, vault: string): string[] {
  return (fs.list(`${vault}/maps`) ?? []).filter((n) => n.endsWith('.json') && NAME.test(n.slice(0, -5))).map((n) => n.slice(0, -5)).sort().slice(0, MAX_MAPS);
}

export function buildMap(fs: Fs, o: MapOpts): MapResult {
  if (!NAME.test(o.project)) return {ok: false, why: 'unreadable'};
  const dir = `${o.vault}/maps`, file = `${o.project}.json`;
  const raw = fs.read(`${dir}/${file}`);
  if (raw === null) return {ok: false, why: (fs.list(dir) ?? []).includes(file) ? 'unreadable' : 'missing'}; // listed but not readable: a symlink, a folder, too big
  let doc: unknown;
  try {
    doc = raw.length > MAX_CHARS ? null : JSON.parse(raw);
  } catch {
    doc = null;
  }
  if (!obj(doc) || !Array.isArray(doc.parts)) return {ok: false, why: 'unreadable'};
  const claimed = typeof doc.repo === 'string' && doc.repo.startsWith('/') && !doc.repo.includes('\0') ? doc.repo : '';
  const repo = claimed !== '' && (o.repos === undefined || o.repos.some((r) => resolve(r) === resolve(claimed))) ? claimed : '';

  // The places of the map's own repo (never another path): the main folder, live worktrees and archived builds. A piece's records come from
  // the NEWEST place whose job record names the piece's card; the check and ship records are then read from that same place.
  const places = repo ? findPlaces(fs, repo, o.vault).places : [];
  const mainShip = repo ? readJson(fs, placeFile(places[0]!, 'last-ship.json')) : null; // the repo's own ship record
  const head = repo ? o.headOf(repo) : null;
  const archive = (fs.list(`${o.vault}/90-archive/cards`) ?? []).slice(0, 5000);
  const cardFiles = new Set((fs.list(`${o.vault}/cards`) ?? []).map((n) => norm(n)));
  const ok = approved(fs, o);
  // Each place's job record is read once per request, however many pieces there are.
  const jobs = new Map<Place, Record<string, unknown> | null>();
  const jobOf = (p: Place): Record<string, unknown> | null => { if (!jobs.has(p)) jobs.set(p, readJson(fs, placeFile(p, 'job.json'))); return jobs.get(p) ?? null; };
  const newest = new Map<string, Place | null>();

  const stateOf =(card: string | undefined, status: unknown): {state: string; from: string; isPlan: boolean} => {
    if (card !== undefined) {
      if (!newest.has(card)) newest.set(card, newestBy(fs, places, 'job.json', (p) => jobOf(p)?.card === card)); // once per card, not once per piece
      const at = newest.get(card) ?? null;
      const job = at ? jobOf(at) : null;
      const verify = at ? readJson(fs, placeFile(at, 'last-verify.json')) : null;
      // "Built" needs the check PASS to be in the SAME place as this job record and for THIS job's card: when both records carry the card's
      // hash they must agree (an old PASS must not make a newly started card look Built).
      const built = at !== null && job !== null && verify?.verdict === 'PASS' && !(typeof job.card_sha256 === 'string' && typeof verify.card_sha256 === 'string' && job.card_sha256 !== verify.card_sha256);
      // Shipped: never without being Built, and a ship PASS at the right head: the place's own record at its own head (not an archived one), or the repo's main record at the repo head.
      const own = built && at.kind !== 'archived' ? readJson(fs, placeFile(at, 'last-ship.json')) : null;
      const ownHead = own?.verdict === 'PASS' ? o.headOf(at!.root) : null; // a head is read only when there is a ship PASS to compare it with
      if (built && ((own?.verdict === 'PASS' && ownHead !== null && own.head === ownHead) || (mainShip?.verdict === 'PASS' && head !== null && mainShip.head === head))) return {state: 'Shipped', from: 'the ship record', isPlan: false};
      if (built) return {state: 'Built', from: 'the check record', isPlan: false};
      if (job !== null && validIso(job.started_at) && (job.finished_at === undefined || job.finished_at === null)) return {state: 'Started, not finished', from: 'the job record', isPlan: false};
      if (archive.some((n) => n.endsWith(`-${card}.md`))) return {state: 'Finished (card archived)', from: 'the archive', isPlan: false};
      if (ok.has(norm(card))) return {state: 'Approved, not started', from: 'the approval records', isPlan: false};
      if (cardFiles.has(norm(card))) return {state: 'Waiting for your approval', from: 'the cards folder', isPlan: false};
    }
    return {state: typeof status === 'string' && PLANS.includes(status) ? status : NOT_RECORDED, from: 'the map file (plan)', isPlan: true};
  };

  const parts: PartView[] = [];
  for (const rawPart of doc.parts.slice(0, MAX_PARTS)) {
    if (!obj(rawPart) || typeof rawPart.id !== 'string' || !NAME.test(rawPart.id)) continue;
    const pieces: PieceView[] = [];
    const seen = new Set<string>(); // a repeated id inside a part is dropped
    for (const p of (Array.isArray(rawPart.pieces) ? rawPart.pieces : []).slice(0, 400)) {
      if (pieces.length >= MAX_PIECES) break;
      if (!obj(p) || typeof p.id !== 'string' || !NAME.test(p.id) || seen.has(p.id)) continue; // a repeated id is dropped: the first one wins
      seen.add(p.id);
      const card = typeof p.card === 'string' && CARD.test(p.card) ? p.card.replace(/\.md$/i, '') : undefined;
      const s = stateOf(card, p.status);
      pieces.push({
        id: p.id, name: text(p.name, 80), plain: text(p.plain, 200), model: typeof p.model === 'string' && MODELS.includes(p.model) ? p.model : NOT_RECORDED,
        plan: typeof p.status === 'string' && PLANS.includes(p.status) ? p.status : NOT_RECORDED, ...s, ...(card !== undefined ? {card} : {}),
        needs: (Array.isArray(p.needs) ? p.needs : []).filter((n): n is string => typeof n === 'string' && NAME.test(n)).slice(0, MAX_NEEDS), blockedBy: [],
      });
    }
    parts.push({id: rawPart.id, name: text(rawPart.name, 80), plain: text(rawPart.plain, 200), pieces});
  }
  // A needed piece blocks until it is Built, Shipped or Finished; a needed id that is not on the map blocks too.
  const states = new Map<string, string>(); // the FIRST piece with an id counts: a later one cannot overwrite its state
  for (const pt of parts) for (const x of pt.pieces) if (!states.has(x.id)) states.set(x.id, x.state);
  for (const pt of parts) for (const x of pt.pieces) x.blockedBy = x.needs.filter((id) => !DONE.includes(states.get(id) ?? ''));
  return {ok: true, project: o.project, repo, parts};
}
