// "Your Turn": the rail strip and the weekly scoreboard, computed from the rail's OWN records only (gate record, job record, ship record), read
// through the same read-only file-system object as the rest of the page. A figure with no source is null ("not recorded"): never 0, never a guess.
// Every record is agent-written data: wrong types, text where a number goes, huge numbers and future dates count as nothing.
import type {Fs} from './turn-data.ts';
import {findPlaces, placeFile, readObject} from './turn-roots.ts';

const DAY = 86_400_000;
const MAX_COST = 1_000_000; // a single job costing more than this is not a cost, it is a bad record

export type Figure = {now: number | null; before: number | null; source: string};
export type Strip = {building: number | null; needYou: number | null; mapShipped: number | null; mapTotal: number | null; costToday: number | null};
export type Week = {shipped: Figure; problems: Figure; stepIns: Figure; typicalTime: Figure; cost: Figure};
export type RailWeekOpts = {repos: string[]; vault: string; now: number; headOf: (repo: string) => string | null; needYou: number; maps: {shipped: number; total: number}[]};

const num = (v: unknown, max = Number.MAX_SAFE_INTEGER): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
const when = (v: unknown): number | null => { // ISO text only
  if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d\d-\d\dT/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};
const sum = (a: number[]): number | null => { const s = a.reduce((x, y) => x + y, 0); return a.length > 0 && Number.isFinite(s) ? Math.round(s * 100) / 100 : null; };
const median = (a: number[]): number | null => {
  if (a.length === 0) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
};

export function railWeek(fs: Fs, o: RailWeekOpts): {strip: Strip; week: Week} {
  // "now" = (now-7d, now], "before" = (now-14d, now-7d]; a date after now, or at or before now-14d, counts nowhere.
  const side = (t: number | null): 'now' | 'before' | null => (t === null || t > o.now ? null : t > o.now - 7 * DAY ? 'now' : t > o.now - 14 * DAY ? 'before' : null);
  const today = new Date(o.now).toDateString();
  const shipped = {now: 0, before: 0};
  const typical: Record<'now' | 'before', number[]> = {now: [], before: []};
  const costs: Record<'now' | 'before', number[]> = {now: [], before: []};
  const costToday: number[] = [];
  let building = 0;
  const seen = new Set<string>(), shippedHeads = new Set<string>();
  for (const repo of o.repos) {
    for (const p of findPlaces(fs, repo, o.vault).places) {
      if (seen.has(p.root)) continue;
      seen.add(p.root);
      const verify = readObject(fs, placeFile(p, 'last-verify.json')), ship = readObject(fs, placeFile(p, 'last-ship.json')), job = readObject(fs, placeFile(p, 'job.json'));
      const gated = verify?.verdict === 'PASS' && typeof verify.head === 'string';
      const shipSide = side(when(ship?.timestamp));
      if (gated && ship?.verdict === 'PASS' && ship.head === verify!.head && shipSide && !shippedHeads.has(`${repo}:${String(ship.head)}:${String(ship.timestamp)}`)) { shippedHeads.add(`${repo}:${String(ship.head)}:${String(ship.timestamp)}`); shipped[shipSide] += 1; } // one ship per repo, version and time, however many folders hold a copy of the record
      const started = when(job?.started_at), checked = when(verify?.timestamp);
      const typSide = side(checked);
      if (gated && started !== null && checked !== null && checked >= started && typSide) typical[typSide].push((checked - started) / 1000);
      const cost = num(job?.cost_usd, MAX_COST), costSide = side(started);
      if (cost !== null && costSide) costs[costSide].push(cost);
      if (cost !== null && started !== null && started <= o.now && new Date(started).toDateString() === today) costToday.push(cost);
      if (p.kind === 'live' && started !== null && started <= o.now && o.now - started < 3 * DAY && (job?.finished_at === undefined || job.finished_at === null || job.finished_at === '')) building += 1;
    }
  }
  const valid = o.maps.filter((m) => !!m && num(m.total) !== null && m.total > 0 && num(m.shipped) !== null);
  const fig = (now: number | null, before: number | null, source: string): Figure => ({now, before, source});
  return {
    strip: {building, needYou: num(o.needYou), mapShipped: valid.length ? valid.reduce((s, m) => s + m.shipped, 0) : null, mapTotal: valid.length ? valid.reduce((s, m) => s + m.total, 0) : null, costToday: sum(costToday)},
    week: {
      shipped: fig(shipped.now, shipped.before, 'ship records (last-ship.json) at the checked version, dated in the week'),
      problems: fig(null, null, 'nothing writes this yet: no record of problems found after shipping'),
      stepIns: fig(null, null, 'nothing writes this yet: no record of the times you had to step in'),
      typicalTime: fig(median(typical.now), median(typical.before), 'the gate record time minus the job record start, for builds that have both'),
      cost: fig(sum(costs.now), sum(costs.before), 'job records that carry a cost; jobs without one add nothing, so this is a lower bound (nothing writes it yet)'),
    },
  };
}
