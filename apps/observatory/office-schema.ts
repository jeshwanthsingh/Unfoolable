// Office event schema v1: CODES only, never free text. Pure code, no I/O.
// {"v":1,"seq":N,"ts":"YYYY-MM-DDTHH:MM:SS","sid":"h:<hash>","project":"<short name>","kind":"...","tool":"Edit","ok":true,"code":null,"gate":null}
import {friendly, hiddenProject} from './office-data.ts';
import {parseLine} from './annex-events.ts';

export const V1_KINDS = ['session_start', 'prompt', 'tool_start', 'tool_end', 'tool_blocked', 'needs_you', 'turn_end', 'subagent_start', 'subagent_end', 'gate_result', 'mail', 'session_end'] as const;
export type V1Kind = (typeof V1_KINDS)[number];
export const CODES = ['permission', 'idle', 'question', 'to_builder', 'to_planner'] as const;
export type Code = (typeof CODES)[number];
export type Gate = {task: string; verdict: 'PASS' | 'FAIL' | 'PARTIAL'; passed: number; total: number};
export type OfficeEvent = {v: 1; seq: number; ts: string; sid: string; project: string; kind: V1Kind; tool: string | null; ok: boolean | null; code: Code | null; gate: Gate | null};

const TS = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/;
const word = (v: unknown, max: number): string | null => (typeof v === 'string' && /^[\w .:-]{1,60}$/.test(v) ? v.slice(0, max) : null);

// Accepts one parsed JSON value; returns a clean event or null. Every string is whitelisted, so free text cannot get through.
export function validate(raw: unknown): OfficeEvent | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || !Number.isInteger(r.seq) || (r.seq as number) < 0 || typeof r.ts !== 'string' || !TS.test(r.ts)) return null;
  if (!(V1_KINDS as readonly string[]).includes(String(r.kind)) || typeof r.sid !== 'string' || !/^h:[0-9a-f]{6,32}$/.test(r.sid)) return null;
  const project = word(r.project, 30);
  if (!project) return null;
  const code = r.code === null || r.code === undefined ? null : (CODES as readonly string[]).includes(String(r.code)) ? (r.code as Code) : undefined;
  if (code === undefined) return null;
  let gate: Gate | null = null;
  if (r.gate !== null && r.gate !== undefined) {
    const g = r.gate as Record<string, unknown>;
    const task = word(g?.task, 30);
    if (!task || !['PASS', 'FAIL', 'PARTIAL'].includes(String(g.verdict)) || !Number.isInteger(g.passed) || !Number.isInteger(g.total) || (g.passed as number) < 0 || (g.passed as number) > (g.total as number)) return null;
    gate = {task, verdict: g.verdict as Gate['verdict'], passed: g.passed as number, total: g.total as number};
  }
  if (r.kind === 'gate_result' && !gate) return null;
  return {v: 1, seq: r.seq as number, ts: r.ts, sid: r.sid, project, kind: r.kind as V1Kind, tool: r.tool == null ? null : word(r.tool, 30), ok: typeof r.ok === 'boolean' ? r.ok : null, code, gate};
}
export const parseV1 = (line: string): OfficeEvent | null => { try { return validate(JSON.parse(line)); } catch { return null; } };

// Today's usage.jsonl lines (legacy shape) -> v1 events. Lines with no v1 meaning (warnings, slash commands) are dropped.
// Legacy lines carry no gate result, so none is invented. Scratch and tiny folders are dropped. seq is the line order of what is kept.
export function fromLegacy(lines: readonly string[]): OfficeEvent[] {
  const out: OfficeEvent[] = [];
  for (const l of lines) {
    const e = parseLine(l);
    if (!e || hiddenProject(e.project)) continue;
    const base = {v: 1 as const, seq: out.length + 1, ts: e.ts, sid: `h:${e.session}`, project: friendly(e.project), tool: null, ok: null, code: null, gate: null};
    const add = (kind: V1Kind, extra: Partial<OfficeEvent> = {}): void => { out.push({...base, kind, ...extra}); };
    switch (e.kind) {
      case 'session_start': add('session_start'); break;
      case 'session_end': add('session_end'); break;
      case 'tool': add('tool_end', {tool: e.name || null, ok: e.ok ?? true}); break;
      case 'tool_fail': add('tool_end', {tool: e.name || null, ok: false}); break;
      case 'hook_block': add('tool_blocked'); break;
      case 'permission_request': add('needs_you', {code: 'permission'}); break;
      case 'notification': if (e.needsYou) add('needs_you', {code: e.name === 'permission_prompt' ? 'permission' : e.name === 'idle_prompt' ? 'idle' : 'question'}); break;
      case 'stop': add('turn_end', {ok: true}); break;
      case 'stop_failure': add('turn_end', {ok: false}); break;
      case 'subagent_start': add('subagent_start'); break;
      case 'subagent_stop': add('subagent_end'); break;
      default: break;
    }
  }
  return out;
}
