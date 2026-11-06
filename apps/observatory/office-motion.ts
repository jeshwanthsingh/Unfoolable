// Decoration rules for the board, as pure functions. Characters never carry facts; they only repeat what the card already says in words.
import type {Tone} from './office-board.ts';

export type Pose = 'typing' | 'waiting' | 'checking' | 'passed' | 'quiet' | 'stuck';
export const MOTION_WINDOW_SECONDS = 30;

const POSE: Record<Tone, Pose> = {blue: 'typing', amber: 'waiting', purple: 'checking', green: 'passed', red: 'stuck', grey: 'quiet'};
export const poseOf = (tone: Tone): Pose => POSE[tone];

// Nothing moves unless a real event arrived in the last 30 s. `ageSeconds` is the reducer's own freshness (null = no news at all).
export const shouldAnimate = (ageSeconds: number | null, reduceMotion: boolean): boolean => !reduceMotion && ageSeconds !== null && ageSeconds <= MOTION_WINDOW_SECONDS;

// Same project, same look, every time: a hue, one of 4 bodies and one of 4 hats from a small hash of the name.
export function look(project: string): {hue: number; body: number; hat: number} {
  let h = 2166136261;
  for (const c of project) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return {hue: h % 360, body: (h >>> 9) % 4, hat: (h >>> 17) % 4};
}

// One soft chime when a card ENTERS "Needs you" (not for cards that were already there, and not on the first load).
export const chimeDue = (before: ReadonlySet<string> | null, now: readonly string[]): boolean => before !== null && now.some((k) => !before.has(k));
