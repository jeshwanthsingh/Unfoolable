// Board view-model: reducer state in, four lanes of plain-words cards out. Pure code. No raw text ever reaches a card.
// Rules: a lane holds only what its word says (Working = news under 60 s; quiet helpers collapse into one line per project);
// a failed check is shown in Done today as "Didn't pass", never in Needs you; each card has ONE time, relative first.
import type {OfficeState, Helper} from './office-reducer.ts';

export type Tone = 'amber' | 'blue' | 'purple' | 'green' | 'red' | 'grey';
export type Card = {key: string; project: string; label: string; verb: string; time: string; at: string; tone: Tone; button: 'open' | 'see' | null};
export type Board = {sentence: string; sub: string; light: 'amber' | 'green' | 'grey' | 'red'; needs: Card[]; working: Card[]; checking: Card[]; done: Card[]; failed: Card[]; quietLines: string[]; quiet: number}; // done = PASS only; a failed check is in failed, never in done

const hhmm = (ts: string): string => ts.slice(11, 16);
const secs = (a: string, b: string): number => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function ago(s: number): string {
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  if (s < 3600) return plural(Math.floor(s / 60), 'minute', 'minutes') + ' ago';
  if (s < 86400) return plural(Math.floor(s / 3600), 'hour', 'hours') + ' ago';
  return plural(Math.floor(s / 86400), 'day', 'days') + ' ago';
}

export function freshness(connected: boolean, ageMs: number, lastEventAt: string | null): string {
  if (connected && ageMs <= 3000) return `LIVE, updated ${Math.max(0, Math.round(ageMs / 1000))} s ago`;
  return lastEventAt ? `Not live, last news ${hhmm(lastEventAt)}` : 'Not live, no news yet';
}

export function boardOf(s: OfficeState): Board {
  const b: Board = {sentence: '', sub: '', light: 'green', needs: [], working: [], checking: [], done: [], failed: [], quietLines: [], quiet: 0};
  const today = s.now.slice(0, 10), byProject = new Map<string, Helper[]>();
  for (const h of s.helpers) if (h.status !== 'unknown') (byProject.get(h.project) ?? byProject.set(h.project, []).get(h.project)!).push(h);
  // Same project, several helpers on the board: "Helper 1 on X" (numbered by id among the visible ones). A lone helper keeps the project name.
  const label = (h: Helper): string => { const all = byProject.get(h.project) ?? [h]; return all.length > 1 ? `Helper ${[...all].sort((x, y) => (x.sid < y.sid ? -1 : 1)).indexOf(h) + 1} on ${h.project}` : h.project; };
  const age = (h: Helper): number => secs(h.lastAt, s.now);
  const card = (h: Helper, verb: string, time: string, tone: Tone, button: Card['button']): Card => ({key: h.sid, project: h.project, label: label(h), verb, time, at: hhmm(h.lastAt), tone, button});
  const quiet = new Map<string, number>();
  for (const h of s.helpers) {
    if (h.status === 'needs_you') b.needs.push(card(h, "I'm waiting for you. Please answer me.", age(h) < 60 ? 'Waiting for less than a minute' : `Waiting for ${plural(Math.floor(age(h) / 60), 'minute', 'minutes')}`, 'amber', 'open'));
    else if (h.status === 'stuck' && !h.gate) b.needs.push(card(h, 'My last 3 steps did not work.', ago(age(h)), 'red', 'open'));
    else if (h.status === 'stuck') { if (h.lastAt.slice(0, 10) === today) b.failed.push(card(h, h.gate!.total === 0 ? 'No tests ran. Check the setup.' : `Didn't pass: ${h.gate!.passed} of ${h.gate!.total} passed`, ago(age(h)), 'red', 'see')); }
    else if (h.status === 'checking') b.checking.push(card(h, "I'm checking the work.", ago(age(h)), 'purple', null));
    else if (h.status === 'working') b.working.push(card(h, "I'm working on it.", ago(age(h)), 'blue', null));
    else if (h.status === 'done') { if (h.lastAt.slice(0, 10) === today) b.done.push(card(h, h.gate && h.gate.total > 0 ? `Saved. ${h.gate.passed} of ${h.gate.total} passed.` : 'Saved. The checker said it works.', ago(age(h)), 'green', null)); }
    else quiet.set(h.project, (quiet.get(h.project) ?? 0) + 1);
  }
  for (const [p, n] of quiet) { b.quiet += n; b.quietLines.push(`${plural(n, 'quiet helper', 'quiet helpers')} on ${p}, no news for a while`); }
  const n = b.needs.length, w = b.working.length;
  const f = b.failed.length;
  b.light = !s.freshness.lastEventAt ? 'grey' : n ? 'amber' : f ? 'red' : 'green';
  b.sentence = !s.freshness.lastEventAt ? 'No news yet.' : n === 1 ? `${b.needs[0]!.label} needs you` : n ? `${n} helpers need you` : f ? `${plural(f, 'thing', 'things')} didn't pass` : w ? `All good. ${plural(w, 'helper', 'helpers')} working.` : 'All good. Nothing is running.';
  b.sub = s.freshness.lastEventAt ? `${n ? (f ? '' : 'Everyone else is fine. ') : ''}${n && f ? `${plural(f, 'thing', 'things')} didn't pass. ` : ''}Last news ${ago(s.freshness.ageSeconds ?? 0)}.` : '';
  return b;
}
