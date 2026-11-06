// Office reducer: events in, one state out. Pure (no clock, no I/O); `now` is a local ISO string passed in.
// Rules: "done" ONLY from a gate_result PASS. A missing seq number is a reported gap, never guessed. Quiet means "no news", not "idle".
import type {OfficeEvent} from './office-schema.ts';

export type Status = 'needs_you' | 'working' | 'checking' | 'done' | 'stuck' | 'unknown';
export const WORKING_SECONDS = 60;
export type Helper = {sid: string; project: string; status: Status; note: string; lastAt: string; steps: number; gate: {task: string; passed: number; total: number; text: string; command: string | null; firstFailed: string | null} | null;
  tool: {name: string; at: string} | null; // the last tool a step used (a name, never its input); the room uses it only while it is fresh
  slash: 'research' | 'critic' | null;
  idle: string | null; // time of a finished turn when that is the helper's latest event: it is waiting for its human
  ended: boolean}; // its session has ended (session_end is the latest event): it gives up its seat // a /research or /critic run that has not finished (command NAME only, from the emitter)
export type Gap = {from: string; to: string; missed: number};
export type OfficeState = {
  now: string;
  freshness: {lastEventAt: string | null; ageSeconds: number | null};
  summary: {needs_you: number; working: number; checking: number; done: number; stuck: number; unknown: number};
  helpers: Helper[]; // needs you first, then newest news first
  gaps: Gap[];
  passed: {task: string; project: string; verdict: string; text: string; at: string}[]; // every gate_result, newest first
  events: number;
  activity: {research: boolean; critic: boolean}; // true only while some helper's /research or /critic run is live
};

// "No tests ran" (0 of 0) is a setup problem, not a pass or a fail.
export const gateText = (g: {passed: number; total: number}): string => (g.total === 0 ? 'No tests ran' : `${g.passed} of ${g.total} passed`);
const secs = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 1000);
const minsWord = (s: number): string => (s < 3600 ? `${Math.max(1, Math.floor(s / 60))} min` : `${Math.floor(s / 3600)} h`);
const ORDER: Status[] = ['needs_you', 'stuck', 'checking', 'working', 'unknown', 'done'];

// The verdict script has no session id, so its gate_result arrives under an id of its own. Hand each one to the helper of the same
// project, but only when that project has exactly ONE helper in the stream (never a guess between several); otherwise it keeps its own id.
export function attachGates(events: readonly OfficeEvent[]): OfficeEvent[] {
  const gateOnly = new Set<string>(), other = new Set<string>();
  for (const e of events) (e.kind === 'gate_result' ? gateOnly : other).add(e.sid);
  for (const s of other) gateOnly.delete(s);
  const sids = new Map<string, Set<string>>();
  for (const e of events) if (e.kind !== 'gate_result') (sids.get(e.project) ?? sids.set(e.project, new Set()).get(e.project)!).add(e.sid);
  return events.map((e) => {
    const only = e.kind === 'gate_result' && gateOnly.has(e.sid) ? sids.get(e.project) : undefined;
    return only && only.size === 1 ? {...e, sid: [...only][0]!} : e;
  });
}

export function reduce(events: readonly OfficeEvent[], now: string): OfficeState {
  const gaps: Gap[] = [];
  const by = new Map<string, OfficeEvent[]>();
  let prev: OfficeEvent | null = null;
  for (const e of attachGates(events)) {
    if (prev && e.seq > prev.seq + 1) gaps.push({from: prev.ts, to: e.ts, missed: e.seq - prev.seq - 1});
    if (!prev || e.seq > prev.seq) prev = e; // a repeated or older seq (replay after reconnect) changes nothing
    else continue;
    (by.get(e.sid) ?? by.set(e.sid, []).get(e.sid)!).push(e);
  }
  const helpers: Helper[] = [];
  const passed: OfficeState['passed'] = [];
  for (const [sid, list] of by) {
    const last = list[list.length - 1]!;
    let open: OfficeEvent | null = null, subagents = 0, gate: OfficeEvent | null = null, gateStale = false, tool: Helper['tool'] = null, slash: Helper['slash'] = null;
    for (const e of list) {
      if (e.kind === 'tool_end' && e.tool) tool = {name: e.tool, at: e.ts};
      if (e.kind === 'prompt') slash = e.tool === 'research' || e.tool === 'critic' ? e.tool : null; // a new prompt replaces the old run
      if (e.kind === 'turn_end' || e.kind === 'session_end') slash = null;
      if (e.kind === 'needs_you') open = open ?? e;
      else if (e.kind !== 'tool_blocked') open = null;
      if (e.kind === 'subagent_start') subagents++;
      if (e.kind === 'subagent_end') subagents = Math.max(0, subagents - 1);
      if (e.kind === 'gate_result') { gate = e; gateStale = false; passed.push({task: e.gate!.task, project: e.project, verdict: e.gate!.verdict, text: gateText(e.gate!), at: e.ts}); }
      else if (gate && e.kind !== 'session_end' && e.kind !== 'turn_end') gateStale = true; // new work after the gate: its result no longer covers it
    }
    const age = secs(last.ts, now);
    const tail = list.filter((e) => e.kind === 'tool_end').slice(-3);
    let status: Status, note: string;
    if (last.kind === 'session_end') { status = gate && !gateStale && gate.gate!.verdict === 'PASS' ? 'done' : 'unknown'; note = status === 'done' ? 'finished, check passed' : 'finished, no check recorded'; }
    else if (open) { status = 'needs_you'; note = `waiting since ${open.ts.slice(11, 16)}`; }
    else if (gate && !gateStale && gate.gate!.verdict === 'PASS') { status = 'done'; note = 'check passed'; }
    else if (gate && !gateStale && gate.gate!.verdict === 'FAIL') { status = 'stuck'; note = "check didn't pass"; }
    else if (tail.length === 3 && tail.every((e) => e.ok === false)) { status = 'stuck'; note = 'last 3 steps failed'; }
    else if (subagents > 0) { status = 'checking'; note = 'a checker is running'; }
    else if (age <= WORKING_SECONDS) { status = 'working'; note = 'working'; }
    else { status = 'unknown'; note = `no news for ${minsWord(age)}`; }
    helpers.push({sid, project: last.project, status, note, lastAt: last.ts, steps: list.filter((e) => e.kind === 'tool_end').length, gate: gate ? {task: gate.gate!.task, passed: gate.gate!.passed, total: gate.gate!.total, text: gateText(gate.gate!), command: gate.gate!.command ?? null, firstFailed: gate.gate!.firstFailed ?? null} : null, tool, slash, idle: last.kind === 'turn_end' && last.ok !== false ? last.ts : null, ended: last.kind === 'session_end'});
  }
  helpers.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : a.sid < b.sid ? -1 : 1));
  const summary = {needs_you: 0, working: 0, checking: 0, done: 0, stuck: 0, unknown: 0};
  for (const h of helpers) summary[h.status]++;
  passed.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const lastEventAt = prev ? prev.ts : null;
  return {now, freshness: {lastEventAt, ageSeconds: lastEventAt ? secs(lastEventAt, now) : null}, summary, helpers, gaps, passed, events: events.length, activity: {research: helpers.some((h) => h.slash === 'research'), critic: helpers.some((h) => h.slash === 'critic')}};
}
