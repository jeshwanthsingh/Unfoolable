// Claude Code annex: the event line and the session state derived from lines. Pure code, no I/O. Reads only; never a verdict kind.
export const KINDS = ['session_start', 'session_end', 'tool', 'tool_fail', 'permission_request', 'notification', 'subagent_start', 'subagent_stop', 'stop', 'stop_failure', 'slash', 'tool_warn', 'hook_block', 'hook_warn'] as const;
export type Kind = (typeof KINDS)[number];
export type LogLine = {ts: string; kind: Kind; name: string; session: string; project: string; needsYou: boolean; args?: string; ok?: boolean};
// args = short salted hash of a tool's input (equal inputs in one session look equal); ok = the step worked. Both optional: old lines have neither.
const TS = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/;
const SESSION = /^[0-9a-f]{12}$/;
// Names and projects are labels, not content: keep printable ASCII without markup characters, cap the length.
const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/[^\x20-\x7e]|[<>&"'`\\]/g, '').slice(0, 60) : '');
export function parseLine(raw: string): LogLine | null {
  let o: unknown;
  try { o = JSON.parse(raw); } catch { return null; }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return null;
  const r = o as Record<string, unknown>;
  const kind = (KINDS as readonly string[]).includes(String(r.kind)) ? (r.kind as Kind) : null;
  if (!kind || typeof r.ts !== 'string' || !TS.test(r.ts) || typeof r.session !== 'string' || !SESSION.test(r.session)) return null;
  const args = typeof r.args === 'string' && /^[0-9a-f]{1,16}$/.test(r.args) ? {args: r.args} : {};
  const ok = typeof r.ok === 'boolean' ? {ok: r.ok} : {};
  return {ts: r.ts, kind, name: clean(r.name), session: r.session, project: clean(r.project) || '?', needsYou: r.needs_you === true, ...args, ...ok};
}
export type SessionView = {
  session: string; project: string; startedAt: string | null; endedAt: string | null; lastAt: string; toolCalls: number;
  needsYou: null | {since: string; what: 'permission' | 'question' | 'error'};
  // The plain-words line shown on screen. Only recorded facts: a session is never called idle or working.
  status: string;
};
const hhmm = (ts: string): string => ts.slice(11, 16);
const whatOf = (e: LogLine): 'permission' | 'question' | 'error' => (e.kind === 'stop_failure' ? 'error' : e.kind === 'permission_request' || e.name === 'permission_prompt' ? 'permission' : 'question');
export function deriveSessions(events: readonly LogLine[]): SessionView[] {
  const by = new Map<string, LogLine[]>();
  for (const e of events) (by.get(e.session) ?? by.set(e.session, []).get(e.session)!).push(e);
  const out: SessionView[] = [];
  for (const [session, list] of by) {
    const first = list[0]!, last = list[list.length - 1]!;
    const start = list.find((e) => e.kind === 'session_start'), end = [...list].reverse().find((e) => e.kind === 'session_end');
    // needs-you stays open only while it is the latest recorded event: any later activity means it was answered
    let open: LogLine | null = null;
    for (const e of list) {
      if (e.needsYou) open = open ?? e;
      else if (e.kind !== 'notification' && e.kind !== 'tool_warn' && e.kind !== 'hook_block' && e.kind !== 'hook_warn') open = null;
    }
    const needsYou = !end && open ? {since: open.ts, what: whatOf(open)} : null;
    const status = end ? `Finished ${hhmm(end.ts)}` : needsYou ? `Needs you (${needsYou.what}) since ${hhmm(needsYou.since)}` : `No news since ${hhmm(last.ts)}`;
    out.push({session, project: first.project, startedAt: start ? start.ts : null, endedAt: end ? end.ts : null, lastAt: last.ts, toolCalls: list.filter((e) => e.kind === 'tool').length, needsYou, status});
  }
  return out.sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
}
