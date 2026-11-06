// The pixel office's scene, built from the SAME board model as the simple view, so the two views can never disagree.
// Placement is by STATUS only (the reducer does not carry a helper's last tool). Pure code.
import {boardOf, type Card} from './office-board.ts';
import type {OfficeState} from './office-reducer.ts';

export type Spot = 'desk' | 'checker' | 'lounge';
export type Word = 'needs you' | 'working' | 'checking' | 'done' | "didn't pass";
export type Figure = {key: string; label: string; project: string; word: Word; spot: Spot; slot: number; tone: Card['tone']; caption: string; loud: boolean};
export type Scene = {figures: Figure[]; guard: {count: number} | null; quiet: number};

const WORD: Record<Card['tone'], Word> = {amber: 'needs you', red: "didn't pass", blue: 'working', purple: 'checking', green: 'done', grey: 'working'};

export function sceneOf(state: OfficeState & {away?: {blocked: number}}): Scene {
  const b = boardOf(state), figures: Figure[] = [], used: Record<Spot, number> = {desk: 0, checker: 0, lounge: 0};
  const put = (c: Card, spot: Spot, word: Word): void => { figures.push({key: c.key, label: c.label, project: c.project, word, spot, slot: used[spot]++, tone: c.tone, caption: c.verb, loud: word === 'needs you'}); };
  for (const c of b.needs) put(c, 'desk', c.tone === 'red' ? "didn't pass" : 'needs you');
  for (const c of b.working) put(c, 'desk', 'working');
  for (const c of b.checking) put(c, 'checker', 'checking');
  for (const c of b.done) put(c, c.tone === 'red' ? 'checker' : 'lounge', c.tone === 'red' ? "didn't pass" : 'done');
  return {figures, guard: state.away && state.away.blocked > 0 ? {count: state.away.blocked} : null, quiet: b.quiet};
}
export const wordOfTone = (t: Card['tone']): Word => WORD[t];
