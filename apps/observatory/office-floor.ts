// The pixel floor's facts. One desk per project, built only from recorded log lines. Nothing here is a guess
// except "maybe", which is drawn faded. Pure code: no I/O.
import type {LogLine} from './annex-events.ts';

export type Station = 'bookshelf' | 'workbench' | 'terminal' | 'globe' | 'checker' | 'desk';
export type Desk = {
  project: string; station: Station;
  state: 'working' | 'maybe' | 'needs' | 'home' | 'quiet';
  at: string; // HH:MM of the latest recorded line
  word: string; // plain words shown under the desk
  loop: boolean; // a guess: the last 3 steps were the same step. Drawn faded; never changes `state`.
};
// checker: a save check was recorded today (solid if within 15 minutes, else faded). staff: one visitor per report file.
export type Floor = {desks: Desk[]; guard: {count: number; last: string | null}; checker: {at: string; fresh: boolean} | null; staff: string[]};

// The tool name decides the place. Unknown names stay at the plain desk.
export function stationOf(e: Pick<LogLine, 'kind' | 'name'>): Station {
  if (e.kind === 'slash' && /verify|ship/i.test(e.name)) return 'checker';
  if (/^(Read|Grep|Glob|LS)$/.test(e.name)) return 'bookshelf';
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(e.name)) return 'workbench';
  if (/^(Bash|BashOutput)$/.test(e.name)) return 'terminal';
  if (/^(WebFetch|WebSearch)$|browser|fetch|search/i.test(e.name)) return 'globe';
  return 'desk';
}
const WHERE: Record<Station, string> = {bookshelf: 'reading', workbench: 'editing', terminal: 'running a command', globe: 'on the web', checker: 'at the checker', desk: 'at the desk'};
// The last 3 recorded steps (worked or failed) are the same tool with the same args hash. Needs the args field; without it, never true.
const circling = (list: readonly LogLine[]): boolean => {
  const last = list.filter((e) => e.kind === 'tool' || e.kind === 'tool_fail').slice(-3);
  return last.length === 3 && last[0]!.args !== undefined && last.every((e) => e.name === last[0]!.name && e.args === last[0]!.args);
};
const mins = (a: string, b: string): number => (Date.parse(b) - Date.parse(a)) / 60000;

// `now` is a local ISO string like the log's own. Recent = a recorded tool line within 2 minutes (solid);
// 2 to 15 minutes = faded "maybe"; older = "no news since". A finished helper keeps its desk ("gone home").
export function buildFloor(events: readonly LogLine[], now: string, extra: {checkAt?: string | undefined; staff?: string[]} = {}): Floor {
  const by = new Map<string, LogLine[]>();
  for (const e of events) (by.get(e.project) ?? by.set(e.project, []).get(e.project)!).push(e);
  const desks: Desk[] = [];
  for (const [project, list] of by) {
    const last = list[list.length - 1]!, tool = [...list].reverse().find((e) => e.kind === 'tool' || e.kind === 'slash');
    const at = last.ts.slice(11, 16), station = tool ? stationOf(tool) : 'desk';
    const open = list.filter((e) => e.needsYou).pop(), answered = open && list.some((e) => e.ts > open.ts && !e.needsYou && e.kind !== 'notification');
    let state: Desk['state'] = 'quiet', word = `No news since ${at}`;
    if (open && !answered && last.kind !== 'session_end') { state = 'needs'; word = `Waiting for you since ${open.ts.slice(11, 16)}`; }
    else if (last.kind === 'session_end') { state = 'home'; word = `Finished at ${at}`; }
    else if (tool && mins(tool.ts, now) <= 2) { state = 'working'; word = `${WHERE[station]} at ${tool.ts.slice(11, 16)}`; }
    else if (tool && mins(tool.ts, now) <= 15) { state = 'maybe'; word = `Maybe ${WHERE[station]} (last news ${at})`; }
    const loop = circling(list) && state !== 'needs' && state !== 'home';
    if (loop) word = 'Maybe going in circles (same step 3 times)';
    desks.push({project: project.slice(0, 30), station, state, at, word, loop});
  }
  desks.sort((a, b) => (a.at < b.at ? 1 : -1));
  const blocks = events.filter((e) => e.kind === 'hook_block' && e.ts.slice(0, 10) === now.slice(0, 10));
  const checker = extra.checkAt && extra.checkAt.slice(0, 10) === now.slice(0, 10) ? {at: extra.checkAt.slice(11, 16), fresh: mins(extra.checkAt, now) <= 15} : null;
  return {desks: desks.slice(0, 6), guard: {count: blocks.length, last: blocks.length ? blocks[blocks.length - 1]!.ts.slice(11, 16) : null}, checker, staff: (extra.staff ?? []).slice(0, 2)};
}
