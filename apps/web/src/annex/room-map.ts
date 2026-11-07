// OUR office room: a placement map. Sprite rectangles are cut from two licensed sheets that are read at run time from a local folder
// (never part of this repo). Coordinates: sheet pixels for sprites, room pixels (640 x 704) for places.
export const ROOM = {w: 640, h: 704};
export type Rect = {sheet: 'office'; x: number; y: number; w: number; h: number};
const o = (x: number, y: number, w: number, h: number): Rect => ({sheet: 'office', x, y, w, h});
export const SPRITE = {
  desk: o(192, 18, 96, 104), deskDark: o(32, 16, 96, 104), monitor: o(448, 384, 32, 32), chair: o(0, 270, 32, 50), plant: o(192, 244, 32, 56), board: o(288, 462, 64, 48),
  shelf: o(224, 400, 64, 56), printer: o(256, 706, 32, 38), cooler: o(384, 494, 32, 64), sofa: o(0, 552, 64, 50), vending: o(10, 746, 48, 70), laptop: o(448, 494, 32, 36), tall: o(224, 496, 64, 64), pod: o(96, 494, 32, 36), table: o(32, 16, 96, 104), lamp: o(352, 480, 32, 36), papers: o(32, 456, 32, 32)
} as const;
export type SpriteName = keyof typeof SPRITE;
// [sprite, x, y]: drawn in this order (back to front).
export const PLACE: [SpriteName, number, number][] = [
  ['tall', 60, 18], ['shelf', 160, 20], ['shelf', 228, 20], ['board', 340, 14], ['plant', 24, 30], ['tall', 440, 18], ['printer', 524, 40], ['printer', 560, 40],
  ['desk', 48, 120], ['desk', 208, 120], ['desk', 368, 120], ['monitor', 80, 108], ['monitor', 240, 108], ['monitor', 400, 108], ['monitor', 108, 108], ['monitor', 268, 108], ['monitor', 428, 108],
  ['papers', 52, 136], ['lamp', 124, 128], ['papers', 212, 136], ['lamp', 284, 128], ['papers', 372, 136], ['lamp', 444, 128],
  ['chair', 80, 196], ['chair', 240, 196], ['chair', 400, 196],
  ['desk', 48, 320], ['desk', 208, 320], ['desk', 368, 320], ['monitor', 80, 308], ['monitor', 240, 308], ['monitor', 400, 308], ['monitor', 108, 308], ['monitor', 268, 308], ['monitor', 428, 308],
  ['papers', 52, 336], ['lamp', 124, 328], ['papers', 212, 336], ['lamp', 284, 328], ['papers', 372, 336], ['lamp', 444, 328],
  ['chair', 80, 396], ['chair', 240, 396], ['chair', 400, 396],
  ['table', 528, 150], ['pod', 520, 124], ['pod', 568, 124], ['pod', 520, 246], ['pod', 568, 246], ['papers', 560, 170],
  ['deskDark', 520, 340], ['monitor', 536, 328], ['monitor', 568, 328], ['laptop', 586, 372], ['plant', 20, 340], ['plant', 466, 230], ['plant', 466, 420],
  ['deskDark', 400, 520], ['monitor', 416, 508], ['monitor', 448, 508], ['laptop', 480, 540], ['lamp', 410, 556], ['plant', 590, 520], ['plant', 352, 640],
  ['sofa', 32, 560], ['sofa', 104, 560], ['vending', 250, 520], ['cooler', 290, 540], ['plant', 180, 600], ['plant', 20, 500], ['plant', 300, 650], ['papers', 60, 520]
];
// Where a helper stands, by spot and slot (room pixels, feet position). Extra helpers beyond the slots are listed on the side only.
export const SLOTS = {
  desk: [[96, 208], [256, 208], [416, 208], [96, 416], [256, 416], [416, 416]],
  checker: [[448, 672], [512, 672], [384, 672]],
  lounge: [[64, 656], [144, 656], [224, 672], [288, 672]],
  library: [[144, 112], [112, 112], [192, 112]], terminal: [[560, 448], [592, 448], [528, 448]], window: [[480, 112], [512, 112]], meeting: [[576, 288], [544, 288]]
} as const;
// Walls: [x, y, w, h, fill]. Doorways are gaps. Zone labels: [text, x, y] (room pixels, top-left of the label).
export const WALLS: [number, number, number, number][] = [[0, 0, 640, 8], [0, 696, 640, 8], [0, 0, 8, 704], [632, 0, 8, 704], [0, 466, 300, 8], [340, 466, 300, 8], [330, 474, 8, 230], [500, 92, 8, 130], [500, 280, 8, 14]];
export const ZONES: [string, number, number][] = [['Desks', 14, 100], ["Checker's office", 346, 480], ['Lounge', 14, 480], ['Meeting corner', 516, 98]];
export const GUARD_AT: [number, number] = [32, 448]; // every standing place is on the 16 px tile grid (half a floor tile)
export const LABELS = {desk: 'Desks', checker: "Checker's office", lounge: 'Lounge'} as const;

// Cubicle dividers and rugs are drawn shapes (x, y, w, h), not sprites.
export const DIVIDERS: [number, number, number, number][] = [[152, 112, 6, 130], [312, 112, 6, 130], [152, 312, 6, 130], [312, 312, 6, 130], [48, 252, 410, 6]];
export const RUGS: [number, number, number, number, number][] = [[24, 600, 190, 80, 0xc9a9a0], [352, 600, 110, 70, 0xb8cdbf], [520, 100, 110, 190, 0xd9c7e6]];
export const WINDOW: [number, number, number, number] = [458, 16, 70, 56];
// Hats: the figure's default is the hard hat; other roles swap it for one of these (index = Figure.hat).
export const HARD_HAT = '<path d="M24 24 q26 -22 52 0 v6 h-52z" fill="#FFC93C" stroke="#E2A800" stroke-width="2"/><rect x="20" y="28" width="60" height="6" rx="3" fill="#E2A800"/>';
export const HATS = ['', '', '<path d="M22 28 q28 -16 56 0 l-4 8 h-48z" fill="#3B2D7A"/><rect x="44" y="20" width="12" height="9" rx="2" fill="#FFC93C"/>',
  '<rect x="34" y="36" width="12" height="12" rx="4" fill="#1F2A44"/><rect x="54" y="36" width="12" height="12" rx="4" fill="#1F2A44"/><rect x="45" y="40" width="10" height="4" fill="#1F2A44"/>',
  '<rect x="30" y="14" width="40" height="14" rx="3" fill="#E8E4D8" stroke="#1F2A44" stroke-width="2"/><rect x="42" y="10" width="16" height="7" rx="2" fill="#1F2A44"/>'] as const;
