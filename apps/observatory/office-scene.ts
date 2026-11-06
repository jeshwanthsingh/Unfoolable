// The pixel office's scene, built from the SAME board model as the simple view, so the two views can never disagree.
// Placement: status decides the room (desks, checker's office, lounge); a WORKING helper whose last tool is under 30 s old stands at the
// station that tool belongs to (reading: library, commands: terminal, web: window); older news sends it back to its desk. Pure code.
import {boardOf, type Card} from './office-board.ts';
import type {OfficeState} from './office-reducer.ts';

export type Spot = 'desk' | 'checker' | 'lounge' | 'library' | 'terminal' | 'window' | 'meeting';
export type Word = 'needs you' | 'working' | 'checking' | 'done' | "didn't pass";
export type Role = 'builder' | 'checker' | 'researcher' | 'critic' | 'guard';
export type Figure = {key: string; label: string; project: string; word: Word; spot: Spot; slot: number; tone: Card['tone']; caption: string; loud: boolean; role: Role; tint: string; hat: number};
export type Scene = {figures: Figure[]; guard: {count: number} | null; quiet: number};

export const FRESH_TOOL_SECONDS = 30;
export const PALETTE = ['#4C7DF0', '#E8B828', '#E8739B', '#7DBB3D', '#E9704E', '#5CB6E8'] as const; // builders: distinct while there are 6 or fewer
export const ROLE_TINT: Record<Exclude<Role, 'builder'>, string> = {checker: '#2FA36B', guard: '#7A5AE0', researcher: '#25ADAA', critic: '#B34A4A'};
const HAT: Record<Role, number> = {builder: 0, checker: 1, guard: 2, researcher: 3, critic: 4}; // 0 hard hat, 1 magnifier, 2 cap, 3 glasses, 4 clipboard

const WORD: Record<Card['tone'], Word> = {amber: 'needs you', red: "didn't pass", blue: 'working', purple: 'checking', green: 'done', grey: 'working'};
export const spotOfTool = (t: string): Spot => (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(t) ? 'library' : /^(Bash|BashOutput)$/.test(t) ? 'terminal' : /^(WebFetch|WebSearch)$|browser|fetch|search/i.test(t) ? 'window' : 'desk');
const secs = (a: string, b: string): number => (Date.parse(b) - Date.parse(a)) / 1000;

export function sceneOf(state: OfficeState & {away?: {blocked: number}}): Scene {
  const b = boardOf(state), figures: Figure[] = [], used: Record<Spot, number> = {desk: 0, checker: 0, lounge: 0, library: 0, terminal: 0, window: 0, meeting: 0};
  const byKey = new Map(state.helpers.map((h) => [h.sid, h]));
  let builders = 0;
  const put = (c: Card, spot: Spot, word: Word): void => {
    const role: Role = word === 'checking' || spot === 'checker' ? 'checker' : 'builder';
    figures.push({key: c.key, label: c.label, project: c.project, word, spot, slot: used[spot]++, tone: c.tone, caption: c.verb, loud: word === 'needs you', role, tint: role === 'builder' ? PALETTE[builders++ % PALETTE.length]! : ROLE_TINT[role], hat: HAT[role]});
  };
  const station = (c: Card): Spot => { const t = byKey.get(c.key)?.tool; return t && secs(t.at, state.now) <= FRESH_TOOL_SECONDS ? spotOfTool(t.name) : 'desk'; };
  for (const c of b.needs) put(c, 'desk', c.tone === 'red' ? "didn't pass" : 'needs you');
  for (const c of b.working) put(c, station(c), 'working');
  for (const c of b.checking) put(c, 'checker', 'checking');
  for (const c of b.done) put(c, c.tone === 'red' ? 'checker' : 'lounge', c.tone === 'red' ? "didn't pass" : 'done');
  // Staff who exist only while their run is live (the command name comes from the emitter; none arrives until that patch is installed).
  const staff = (key: string, label: string, role: 'researcher' | 'critic', spot: Spot, caption: string): void => {
    figures.push({key, label, project: label, word: 'working', spot, slot: used[spot]++, tone: 'blue', caption, loud: false, role, tint: ROLE_TINT[role], hat: HAT[role]});
  };
  if (state.activity.research) staff('role:researcher', 'Researcher', 'researcher', 'library', 'looking things up');
  if (state.activity.critic) staff('role:critic', 'Critic', 'critic', 'meeting', 'reading the plan');
  return {figures, guard: state.away && state.away.blocked > 0 ? {count: state.away.blocked} : null, quiet: b.quiet};
}
export const wordOfTone = (t: Card['tone']): Word => WORD[t];
