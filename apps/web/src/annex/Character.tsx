import {look, type Pose} from '../../../observatory/office-motion.ts';

// Original characters after the design mockup: a rounded body, a face, and one tool that says the job.
// Builders wear a hard hat; the checker has a magnifier. Decoration only (aria-hidden): the card's words carry every fact.
// The markup is built here from fixed pieces and numbers only (never from log text), so it is safe to set as inner HTML.
type Mood = 'focus' | 'read' | 'happy' | 'wave' | 'dizzy';
const INK = '#1F2A44';
const stroke = (d: string, w = 3.4): string => `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const EYES: Record<Mood, string> = {
  focus: `<circle cx="40" cy="44" r="4.2" fill="${INK}"/><circle cx="60" cy="44" r="4.2" fill="${INK}"/>`,
  read: stroke('M35 45 q5 -4 10 0') + stroke('M55 45 q5 -4 10 0'),
  happy: stroke('M35 46 q5 -6 10 0') + stroke('M55 46 q5 -6 10 0'),
  wave: `<circle cx="40" cy="43" r="5" fill="${INK}"/><circle cx="60" cy="43" r="5" fill="${INK}"/><circle cx="41.5" cy="41.5" r="1.6" fill="#fff"/><circle cx="61.5" cy="41.5" r="1.6" fill="#fff"/>`,
  dizzy: `<path d="M36 44 a4 4 0 1 1 4 4 a2.5 2.5 0 1 1 -2 -2.5" stroke="${INK}" stroke-width="2.6" fill="none"/><path d="M56 44 a4 4 0 1 1 4 4 a2.5 2.5 0 1 1 -2 -2.5" stroke="${INK}" stroke-width="2.6" fill="none"/>`
};
const MOUTH: Record<Mood, string> = {
  focus: stroke('M44 57 q6 4 12 0', 3), read: stroke('M46 58 h8', 3),
  happy: `<path d="M41 55 q9 10 18 0" stroke="${INK}" stroke-width="3" fill="#fff" stroke-linecap="round"/>`,
  wave: `<ellipse cx="50" cy="59" rx="6" ry="7" fill="${INK}"/><ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#F27C6B"/>`,
  dizzy: stroke('M42 59 q4 -3 8 0 q4 3 8 0', 3)
};
const HAT = '<path d="M24 24 q26 -22 52 0 v6 h-52z" fill="#FFC93C" stroke="#E2A800" stroke-width="2"/><rect x="20" y="28" width="60" height="6" rx="3" fill="#E2A800"/>';
const LENS = `<circle cx="84" cy="78" r="11" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M92 86 l8 8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M79 78 l4 4 l7 -8" stroke="#2FA36B" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const MOOD: Record<Pose, Mood> = {typing: 'focus', waiting: 'wave', checking: 'focus', passed: 'happy', stuck: 'dizzy', quiet: 'read'};

export function figure(color: string, mood: Mood, checker: boolean): string {
  const arm = mood === 'wave' ? `<path d="M80 60 q14 -10 12 -30" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="92" cy="27" r="7" fill="${color}"/>` : `<path d="M80 66 q8 6 6 14" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  return `<ellipse cx="50" cy="96" rx="30" ry="5" fill="${INK}" opacity=".12"/><path d="M18 60 q0 -42 32 -42 q32 0 32 42 v20 q0 14 -14 14 h-36 q-14 0 -14 -14z" fill="${color}"/>` +
    `<path d="M20 72 q-8 6 -6 14" stroke="${color}" stroke-width="10" fill="none" stroke-linecap="round"/>${arm}<ellipse cx="50" cy="50" rx="24" ry="20" fill="#fff" opacity=".92"/>` +
    `<circle cx="33" cy="56" r="4" fill="#F5A3A3" opacity=".7"/><circle cx="67" cy="56" r="4" fill="#F5A3A3" opacity=".7"/>${EYES[mood]}${MOUTH[mood]}${checker ? LENS : HAT}`;
}

export function Character({project, pose, animate, big = false, checker = false}: {project: string; pose: Pose; animate: boolean; big?: boolean; checker?: boolean}) {
  const lightness = [52, 58, 64][look(project).hue % 3]!, color = checker ? '#2FA36B' : `hsl(222 78% ${lightness}%)`, size = big ? 104 : 62;
  return (
    <svg className={`ob-char${animate && pose !== 'quiet' ? ' ob-bob' : ''}`} viewBox="0 0 104 104" width={size} height={size} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html: figure(color, MOOD[pose], checker)}} />
  );
}
