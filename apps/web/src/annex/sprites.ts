// Our own 16 x 32 pixel characters, drawn as text grids (no picture files, nothing licensed). Drawn inside the room canvas at 2x, like the floor.
// Letters: c = the helper's colour, d = a darker edge of it, s = face, p = cheek, o = ink, y/Y = hard-hat yellow, v = cap blue, r = tongue,
// l = glass, k = clipboard board, w = paper, z = soft shadow, . = clear.
export const MOODS = ['focus', 'read', 'happy', 'wave', 'dizzy'] as const;
export type SpriteMood = (typeof MOODS)[number];
export const FRAMES = 2; // 0 = eyes open, 1 = a blink (it blinks when news arrives, never on a timer)
export const HAT_COUNT = 5; // 0 hard hat, 1 magnifier (checker), 2 cap (guard), 3 glasses (researcher), 4 clipboard (critic)
export const PALETTE_KEYS = '.cdspoyYvrlkwz';
const W = 16, H = 32;

const r = (l: number, body: string): string => '.'.repeat(l) + body + '.'.repeat(W - l - body.length);
const BODY: string[] = (() => {
  const rows: string[] = Array.from({length: H}, () => '.'.repeat(W));
  const set = (y: number, s: string): void => { rows[y] = s; };
  set(4, r(4, 'dccccccd')); set(5, r(3, 'd' + 'c'.repeat(8) + 'd')); set(6, r(2, 'd' + 'c'.repeat(10) + 'd'));
  set(7, r(2, 'dcc' + 's'.repeat(6) + 'ccd'));
  for (let y = 8; y <= 13; y++) set(y, r(2, 'dc' + 's'.repeat(8) + 'cd'));
  set(14, r(2, 'dcc' + 's'.repeat(6) + 'ccd'));
  for (let y = 15; y <= 25; y++) set(y, r(2, 'd' + 'c'.repeat(10) + 'd'));
  set(26, r(3, 'd' + 'c'.repeat(8) + 'd')); set(27, r(3, 'd' + 'c'.repeat(8) + 'd'));
  set(28, r(3, 'dd' + '.'.repeat(6) + 'dd')); set(29, r(3, 'dd' + '.'.repeat(6) + 'dd'));
  set(31, r(3, 'z'.repeat(10)));
  return rows;
})();

// The face window: 8 columns (x 4..11) by 6 rows (y 9..14). '.' keeps the face colour.
const FACE: Record<SpriteMood, string[]> = {
  focus: ['........', '.oo..oo.', '........', '.p....p.', '...oo...', '........'],
  read: ['........', '........', '.oo..oo.', '.p....p.', '..oooo..', '........'],
  happy: ['.oo..oo.', 'o..oo..o', '.p....p.', '.o....o.', '..oooo..', '........'],
  wave: ['........', '.oo..oo.', '.oo..oo.', '...oo...', '...rr...', '........'],
  dizzy: ['o.o..o.o', '.o....o.', 'o.o..o.o', '........', '.o.oo.o.', '........']
};
const BLINK = ['........', '........', '.oo..oo.'];

// Hats and tools: [y, x, letters] pieces drawn over the body.
const HATS: [number, number, string][][] = [
  [[2, 4, 'yyyyyyyy'], [3, 3, 'yyyyyyyyyy'], [4, 2, 'YYYYYYYYYYYY']],
  [[20, 12, 'ooo'], [21, 11, 'olllo'], [22, 11, 'olllo'], [23, 12, 'ooo'], [24, 14, 'o'], [25, 15, 'o']],
  [[3, 4, 'vvvvvvvv'], [4, 2, 'vvvvvvvvvvvv'], [3, 7, 'yy']],
  [[9, 4, 'oooooooo'], [12, 4, 'oooooooo']],
  [[19, 11, 'oooo'], [20, 11, 'kwwk'], [21, 11, 'kwwk'], [22, 11, 'kwwk'], [23, 11, 'kkkk']]
];

export function spriteRows(mood: SpriteMood, hat: number, frame: number): string[] {
  const rows = BODY.map((s) => s.split(''));
  const face = [...FACE[mood]];
  if (frame === 1 && mood !== 'dizzy') for (let i = 0; i < BLINK.length; i++) face[i] = BLINK[i]!;
  face.forEach((line, i) => { for (let x = 0; x < 8; x++) if (line[x] !== '.') rows[9 + i]![4 + x] = line[x]!; });
  if (mood === 'wave') for (let y = 6; y <= 12; y++) { rows[y]![14] = y === 6 ? 'c' : 'd'; rows[y]![15] = y <= 7 ? 'c' : '.'; } // the raised arm
  for (const [y, x, s] of HATS[hat] ?? []) for (let i = 0; i < s.length; i++) rows[y]![x + i] = s[i]!;
  return rows.map((a) => a.join(''));
}

const INK = [0x1f, 0x2a, 0x44];
const hex = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number): number[] => a.map((v, i) => Math.round(v + (b[i]! - v) * t));
// One small canvas per (colour, mood, hat, frame); the room draws it at 2x with nearest-neighbour scaling, so each sprite pixel is a 2 x 2 block.
export function spriteCanvas(tint: string, mood: SpriteMood, hat: number, frame: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!, base = hex(/^#[0-9a-fA-F]{6}$/.test(tint) ? tint : '#9AA8C0');
  const col: Record<string, string> = {
    c: `rgb(${base})`, d: `rgb(${mix(base, INK, 0.3)})`, s: '#F7F3EE', p: '#F5A3A3', o: '#1F2A44', y: '#FFC93C', Y: '#E2A800', v: '#3B2D7A', r: '#F27C6B', l: '#BFE3F4', k: '#B98A55', w: '#FFFFFF', z: 'rgba(31,42,68,0.18)'
  };
  spriteRows(mood, hat, frame).forEach((line, y) => { for (let x = 0; x < W; x++) { const k = col[line[x]!]; if (k) { g.fillStyle = k; g.fillRect(x, y, 1, 1); } } });
  return c;
}
