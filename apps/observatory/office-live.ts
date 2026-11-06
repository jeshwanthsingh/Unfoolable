// Live hub: tail the log -> v1 events -> pure reducer -> state. Pushes the whole state to subscribers on every poll tick (0.5 s, so changes and
// the heartbeat are the same message); a client that hears nothing for 3 s can say "Not live". The state is a snapshot keyed by helper id, so a replay
// after a reconnect (Last-Event-ID) can never show a card twice.
import {createTail} from './office-tail.ts';
import {fromLegacy, type OfficeEvent} from './office-schema.ts';
import {reduce, type OfficeState} from './office-reducer.ts';

export type LiveState = OfficeState & {live: true; serverTime: string; version: number};
const pad = (n: number): string => String(n).padStart(2, '0');
const local = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const MAX_EVENTS = 20_000;

export function createLive(logPath: string, opts: {pollMs?: number; clock?: () => Date} = {}) {
  const tail = createTail(logPath), clock = opts.clock ?? (() => new Date());
  let events: OfficeEvent[] = [], version = 0;
  const subs = new Set<(s: LiveState) => void>();
  const state = (): LiveState => { const now = clock(); return {...reduce(events, local(now)), live: true, serverTime: local(now), version}; };
  const push = (): void => { const s = state(); for (const f of subs) f(s); };
  const read = (): boolean => {
    const {lines, reset} = tail.poll();
    if (reset) events = [];
    if (!lines.length && !reset) return false;
    const base = events.length ? events[events.length - 1]!.seq : 0;
    events = events.concat(fromLegacy(lines).map((e) => ({...e, seq: e.seq + base}))).slice(-MAX_EVENTS);
    version++;
    return true;
  };
  read();
  const timer = setInterval(() => { read(); push(); }, opts.pollMs ?? 500);
  timer.unref();
  return {state, subscribe(f: (s: LiveState) => void) { subs.add(f); return () => { subs.delete(f); }; }, stop() { clearInterval(timer); subs.clear(); }};
}
export type Live = ReturnType<typeof createLive>;
