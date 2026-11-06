// Board view-model: reducer state in, four columns of plain-words cards out. Pure code. No raw text ever reaches a card.
import type {OfficeState, Helper} from './office-reducer.ts';

export type Tone = 'amber' | 'blue' | 'purple' | 'green' | 'red' | 'grey';
export type Card = {key: string; project: string; verb: string; time: string; tone: Tone};
export type Board = {sentence: string; light: 'amber' | 'green' | 'red' | 'grey'; needs: Card[]; working: Card[]; checking: Card[]; done: Card[]; quiet: number};

export const QUIET_AFTER_MIN = 15; // an unknown helper stays visible (grey) this long, then it is only counted
const hhmm = (ts: string): string => ts.slice(11, 16);
const mins = (a: string, b: string): number => (Date.parse(b) - Date.parse(a)) / 60000;
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function freshness(connected: boolean, ageMs: number, lastEventAt: string | null): string {
  if (connected && ageMs <= 3000) return `LIVE, updated ${Math.max(0, Math.round(ageMs / 1000))} s ago`;
  return lastEventAt ? `Not live, last news ${hhmm(lastEventAt)}` : 'Not live, no news yet';
}

export function boardOf(s: OfficeState): Board {
  const b: Board = {sentence: '', light: 'green', needs: [], working: [], checking: [], done: [], quiet: 0};
  const today = s.now.slice(0, 10);
  const card = (h: Helper, verb: string, tone: Tone): Card => ({key: h.sid, project: h.project, verb, time: hhmm(h.lastAt), tone});
  for (const h of s.helpers) {
    if (h.status === 'needs_you') b.needs.push(card(h, `Waiting for you since ${hhmm(h.lastAt)}`, 'amber'));
    else if (h.status === 'stuck') b.needs.push(card(h, h.gate ? `Did not pass: ${h.gate.text}` : 'Last 3 steps did not work', 'red'));
    else if (h.status === 'checking') b.checking.push(card(h, 'Checking its work', 'purple'));
    else if (h.status === 'working') b.working.push(card(h, 'Working now', 'blue'));
    else if (h.status === 'done') { if (h.lastAt.slice(0, 10) === today) b.done.push(card(h, h.gate ? `Passed: ${h.gate.text}` : 'Passed', 'green')); }
    else if (mins(h.lastAt, s.now) <= QUIET_AFTER_MIN) b.working.push(card(h, `No news for ${Math.max(1, Math.floor(mins(h.lastAt, s.now)))} min`, 'grey'));
    else b.quiet++;
  }
  const red = b.needs.some((c) => c.tone === 'red'), n = b.needs.length, w = b.working.filter((c) => c.tone === 'blue').length;
  b.light = !s.freshness.lastEventAt ? 'grey' : red ? 'red' : n ? 'amber' : 'green';
  b.sentence = !s.freshness.lastEventAt ? 'No news yet.' : n ? `${plural(n, 'helper needs', 'helpers need')} you.` : `Nothing needs you. ${plural(w, 'helper is', 'helpers are')} working.`;
  return b;
}
