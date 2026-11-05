// Office page reader: READ-ONLY. Reads four files under the vault, returns one small whitelisted snapshot.
// It never writes, never opens the Unfoolable database or its Keep and checker code.
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {deriveSessions, parseLine, type LogLine} from './annex-events.ts';
import {buildFloor, type Floor} from './office-floor.ts';

export type Light = 'green' | 'amber' | 'red' | 'grey';
export type Item = {text: string; at?: string};
export type Snapshot = {
  generatedAt: string;
  light: Light;
  sentence: string;
  needsYou: Item[];
  lastNight: Item[];
  results: Item[];
  today: {helpers: number; steps: number; guardNo: number; spent: string; list: Item[]};
  floor: Floor;
  details: string[];
};

const MAX_BYTES = 4_000_000;
// shortcut: reads whole file each poll, capped at 4 MB; upgrade to tail-reading if the log grows past that.
const read = (p: string): string => { try { const t = readFileSync(p, 'utf8'); return t.length > MAX_BYTES ? t.slice(-MAX_BYTES) : t; } catch { return ''; } };

// Anything that looks like a key or a long random string is hidden before it can reach the screen.
export const redact = (s: string): string =>
  s.replace(/\b(?:sk|pk|ghp|gho|xox[a-z]|AKIA|AIza)[-_A-Za-z0-9]{8,}/g, '[hidden]').replace(/[A-Za-z0-9+/_=-]{32,}/g, '[hidden]');
// Escape every returned string so the page can never run it as markup, even without React.
export const esc = (s: string): string => s.replace(/[&<>"'`]/g, (c) => `&#${c.charCodeAt(0)};`);
const safe = (s: string, max = 140): string => esc(redact(s.replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim())).slice(0, max * 2);
const cut = (s: string, max: number): string => (s.length > max ? s.slice(0, max - 1).trimEnd() + '...' : s);

const hhmm = (ts: string): string => ts.slice(11, 16);
const day = (ts: string): string => ts.slice(0, 10);
const pad = (n: number): string => String(n).padStart(2, '0');
const localIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function parseScoreboard(csv: string): {date: string; batch: string; verdict: string; cost: number}[] {
  const lines = csv.split('\n').filter(Boolean);
  const head = (lines.shift() ?? '').split(',');
  const i = (n: string): number => head.indexOf(n);
  const [d, b, v, c, ok] = [i('date'), i('batch'), i('verdict'), i('cost_usd'), i('valid_run')];
  if (d < 0 || b < 0 || v < 0) return [];
  const out = [];
  for (const l of lines) {
    const f = l.split(',');
    if (ok >= 0 && f[ok] !== 'true') continue;
    out.push({date: (f[d] ?? '').slice(0, 10), batch: (f[b] ?? '').slice(0, 60), verdict: f[v] ?? '', cost: c >= 0 ? Number(f[c]) || 0 : 0});
  }
  return out;
}

// Newest first. Entries start with "- YYYY-MM-DD · who · text" at column 0.
export function parseMailbox(md: string, n: number): Item[] {
  const out: Item[] = [];
  for (const l of md.split('\n')) {
    const m = /^- (\d{4}-\d\d-\d\d) · [^·]+ · (.+)$/.exec(l);
    if (m) out.push({at: m[1]!, text: safe(cut(m[2]!.split(':')[0]!.trim() || m[2]!, 90))});
    if (out.length >= n) break;
  }
  return out;
}
export function buildSnapshot(vault: string, now = new Date()): Snapshot {
  const nowIso = localIso(now), today = day(nowIso);
  const usageRaw = read(join(vault, 'logs/usage.jsonl'));
  const events: LogLine[] = usageRaw.split('\n').map(parseLine).filter((e): e is LogLine => e !== null);
  const sessions = deriveSessions(events);
  const label = (p: string): string => safe(p, 30);
  const needs = sessions.filter((s) => s.needsYou);
  const needsYou: Item[] = needs.map((s) => ({
    text: `A helper on ${label(s.project)} ${s.needsYou!.what === 'permission' ? 'wants your OK' : s.needsYou!.what === 'error' ? 'hit a problem' : 'asked you something'}.`,
    at: hhmm(s.needsYou!.since)
  }));
  const todayEv = events.filter((e) => day(e.ts) === today);
  const todaySessions = sessions.filter((s) => day(s.lastAt) === today);
  const guardNo = todayEv.filter((e) => e.kind === 'hook_block').length;
  const rows = parseScoreboard(read(join(vault, 'evals/scoreboard.csv')));
  const spent = rows.filter((r) => r.date === today).reduce((a, r) => a + r.cost, 0);
  // Last night = yesterday 20:00 until today 08:00 (or now).
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const from = `${day(localIso(y))}T20:00:00`, to = `${today}T08:00:00`;
  const night = events.filter((e) => e.ts >= from && e.ts < to);
  const nightSessions = new Set(night.map((e) => e.session)).size;
  const lastNight: Item[] = night.length
    ? [{text: `${plural(nightSessions, 'helper', 'helpers')} worked. ${plural(night.filter((e) => e.kind === 'tool').length, 'step', 'steps')} done.`}, {text: `The guard said no ${plural(night.filter((e) => e.kind === 'hook_block').length, 'time', 'times')}.`}]
    : [{text: 'No news from last night.'}];
  const results: Item[] = [];
  const batches = new Map<string, {date: string; safe: number; bad: number}>();
  for (const r of rows) {
    const b = batches.get(r.batch) ?? {date: r.date, safe: 0, bad: 0};
    if (r.verdict === 'safe') b.safe++; else b.bad++;
    if (r.date > b.date) b.date = r.date;
    batches.set(r.batch, b);
  }
  [...batches].sort((a, b) => (a[1].date < b[1].date ? 1 : -1)).slice(0, 3).forEach(([name, b]) =>
    results.push({at: b.date, text: `Practice test ${safe(name, 40)}: ${b.safe} worked, ${b.bad} did not.`}));
  let gardens: string[] = [];
  try { gardens = readdirSync(join(vault, 'logs')).filter((f) => /^garden-[\w.-]+\.md$/.test(f)).sort().reverse().slice(0, 2); } catch { /* no reports yet */ }
  for (const g of gardens) {
    const head = read(join(vault, 'logs', g)).split('\n').find((l) => l.trim()) ?? g;
    results.push({text: `Report: ${safe(head.replace(/^#+\s*/, ''), 80)}`});
  }
  for (const m of parseMailbox(read(join(vault, 'mailbox/to-chat.md')), 3)) results.push({at: m.at ?? '', text: `Reply: ${m.text}`});
  const last = events[events.length - 1];
  const light: Light = !last ? 'grey' : needs.some((s) => s.needsYou!.what === 'error') ? 'red' : needs.length ? 'amber' : 'green';
  const sentence = !last ? 'No news yet.' : needs.length ? `${plural(needs.length, 'helper needs', 'helpers need')} you.` : `Nothing needs you. Last news at ${hhmm(last.ts)}.`;
  return {
    generatedAt: nowIso, light, sentence, needsYou, lastNight, results, floor: buildFloor(events, nowIso),
    today: {
      helpers: todaySessions.length, steps: todayEv.filter((e) => e.kind === 'tool').length, guardNo, spent: `$${spent.toFixed(2)}`,
      list: todaySessions.slice(0, 8).map((s) => ({text: `${label(s.project)}: ${s.endedAt ? 'finished' : s.needsYou ? 'needs you' : 'no news since ' + hhmm(s.lastAt)}`}))
    },
    details: [`log lines read: ${events.length}`, `helper ids: ${todaySessions.slice(0, 8).map((s) => s.session).join(' ') || 'none'}`, `scoreboard rows: ${rows.length}`, `report files: ${gardens.length}`]
  };
}
