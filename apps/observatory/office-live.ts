// Live hub: tail the log -> v1 events -> pure reducer -> state. Pushes the whole state to subscribers on every poll tick (0.5 s, so changes and
// the heartbeat are the same message); a client that hears nothing for 3 s can say "Not live". The state is a snapshot keyed by helper id, so a replay
// after a reconnect (Last-Event-ID) can never show a card twice.
import {createTail} from './office-tail.ts';
import {fromLegacy, parseV1, type OfficeEvent} from './office-schema.ts';
import {friendly, hiddenProject} from './office-data.ts';
import {reduce, type OfficeState} from './office-reducer.ts';
import {basename} from 'node:path';

export type LiveState = OfficeState & {live: true; serverTime: string; version: number};
const pad = (n: number): string => String(n).padStart(2, '0');
const local = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const MAX_EVENTS = 20_000;

export function createLive(logPath: string, opts: {pollMs?: number; clock?: () => Date} = {}) {
  const tail = createTail(logPath), clock = opts.clock ?? (() => new Date());
  let events: OfficeEvent[] = [], version = 0;
  const subs = new Set<(s: LiveState) => void>();
  const v1 = basename(logPath) === 'office-v1.jsonl'; // the emitter's own file: events already have codes and real seq numbers
  const state = (): LiveState => {
    const now = clock(), r = reduce(events, local(now));
    // v1 keeps every event so seq numbers stay whole (a hidden folder must not look like a gap); hidden helpers are dropped here.
    const helpers = r.helpers.filter((h) => !hiddenProject(h.project)), summary = {needs_you: 0, working: 0, checking: 0, done: 0, stuck: 0, unknown: 0};
    for (const h of helpers) summary[h.status]++;
    return {...r, helpers, summary, live: true, serverTime: local(now), version};
  };
  const push = (): void => { const s = state(); for (const f of subs) f(s); };
  const read = (): boolean => {
    const {lines, reset} = tail.poll();
    if (reset) events = [];
    if (!lines.length && !reset) return false;
    const base = events.length ? events[events.length - 1]!.seq : 0;
    const add = v1 ? lines.map(parseV1).filter((e): e is OfficeEvent => e !== null).map((e) => ({...e, project: friendly(e.project)})) : fromLegacy(lines).map((e) => ({...e, seq: e.seq + base}));
    events = events.concat(add).slice(-MAX_EVENTS);
    version++;
    return true;
  };
  read();
  const timer = setInterval(() => { read(); push(); }, opts.pollMs ?? 500);
  timer.unref();
  return {state, subscribe(f: (s: LiveState) => void) { subs.add(f); return () => { subs.delete(f); }; }, stop() { clearInterval(timer); subs.clear(); }};
}
export type Live = ReturnType<typeof createLive>;
