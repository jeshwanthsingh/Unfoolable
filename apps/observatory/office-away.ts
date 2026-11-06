// "While you were away": one pure function from the events (and the scoreboard rows) to numbers and plain sentences. No clock, no I/O.
// The numbers come from the same reducer the board uses, so the strip can never disagree with it. Results come ONLY from gate_result events.
import type {OfficeEvent} from './office-schema.ts';
import {reduce} from './office-reducer.ts';
import {hiddenProject} from './office-data.ts';

export type Away = {from: string; to: string; helpers: number; steps: number; blocked: number; results: {project: string; text: string; passed: boolean; at: string}[]; gaps: string[]; sentence: string};
export type Practice = {passed: number; total: number; at: string}; // at = local ISO time of the newest scoreboard change

const pad = (n: number): string => String(n).padStart(2, '0');
const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const hhmm = (ts: string): string => ts.slice(11, 16);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

// Window: yesterday 20:00 until today 08:00 (or until now, before 08:00). `now` is a local ISO string.
export function awayWindow(now: string): {from: string; to: string} {
  const d = new Date(now), y = new Date(d); y.setDate(y.getDate() - 1);
  const from = `${iso(y).slice(0, 10)}T20:00:00`, eight = `${iso(d).slice(0, 10)}T08:00:00`;
  return {from, to: now < eight ? now : eight};
}

export function away(events: readonly OfficeEvent[], now: string): Away {
  const {from, to} = awayWindow(now);
  const inWin = events.filter((e) => e.ts >= from && e.ts < to);
  const r = reduce(inWin, to);
  const results = r.passed.filter((g) => !hiddenProject(g.project)).map((g) => ({project: g.project, text: g.text, passed: g.verdict === 'PASS', at: g.at})).reverse();
  const gaps = r.gaps.map((g) => `I missed some news between ${hhmm(g.from)} and ${hhmm(g.to)}.`);
  const blocked = inWin.filter((e) => e.kind === 'tool_blocked').length;
  const steps = r.helpers.filter((h) => !hiddenProject(h.project)).reduce((a, h) => a + h.steps, 0), helpers = new Set(inWin.filter((e) => e.kind !== 'gate_result' && !hiddenProject(e.project)).map((e) => e.sid)).size; // scratch folders (r1, tmp ...) are not shown
  const sentence = inWin.length === 0 ? 'No news from last night.' : `${plural(helpers, 'helper', 'helpers')} worked. ${plural(steps, 'step', 'steps')} done.`;
  return {from, to, helpers, steps, blocked, results, gaps, sentence};
}

export const practiceLine = (p: Practice): string => `Practice tests: ${p.passed} of ${p.total} passed, ${hhmm(p.at)}`;
