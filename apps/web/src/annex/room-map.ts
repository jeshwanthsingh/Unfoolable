// OUR office room: a placement map. Sprite rectangles are cut from two licensed sheets that are read at run time from a local folder
// (never part of this repo). Coordinates: sheet pixels for sprites, room pixels (640 x 704) for places.
export const ROOM = {w: 640, h: 704};
export type Rect = {sheet: 'office'; x: number; y: number; w: number; h: number};
const o = (x: number, y: number, w: number, h: number): Rect => ({sheet: 'office', x, y, w, h});
export const SPRITE = {
  desk: o(192, 18, 96, 104), deskDark: o(32, 16, 96, 104), monitor: o(448, 384, 32, 32), chair: o(0, 270, 32, 50), plant: o(192, 244, 32, 56), board: o(288, 462, 64, 48),
  shelf: o(224, 400, 64, 56), printer: o(256, 706, 32, 38), cooler: o(384, 494, 32, 64), sofa: o(0, 552, 64, 50), vending: o(10, 746, 48, 70), laptop: o(448, 494, 32, 36), tall: o(224, 496, 64, 64), pod: o(96, 494, 32, 36), table: o(32, 16, 96, 104)
} as const;
export type SpriteName = keyof typeof SPRITE;
// [sprite, x, y]: drawn in this order (back to front).
export const PLACE: [SpriteName, number, number][] = [
  ['tall', 60, 18], ['shelf', 160, 20], ['board', 340, 14], ['plant', 24, 30], ['tall', 440, 18], ['printer', 560, 40],
  ['desk', 48, 120], ['desk', 208, 120], ['desk', 368, 120], ['monitor', 80, 108], ['monitor', 240, 108], ['monitor', 400, 108],
  ['chair', 80, 196], ['chair', 240, 196], ['chair', 400, 196],
  ['desk', 48, 320], ['desk', 208, 320], ['desk', 368, 320], ['monitor', 80, 308], ['monitor', 240, 308], ['monitor', 400, 308],
  ['chair', 80, 396], ['chair', 240, 396], ['chair', 400, 396],
  ['table', 528, 150], ['pod', 520, 124], ['pod', 568, 124], ['pod', 520, 246], ['pod', 568, 246], ['cooler', 580, 330], ['plant', 530, 388],
  ['deskDark', 400, 520], ['monitor', 416, 508], ['monitor', 448, 508], ['laptop', 480, 540], ['plant', 590, 520],
  ['sofa', 32, 560], ['sofa', 104, 560], ['vending', 232, 520], ['plant', 180, 600], ['plant', 20, 500]
];
// Where a helper stands, by spot and slot (room pixels, feet position). Extra helpers beyond the slots are listed on the side only.
export const SLOTS = {
  desk: [[96, 214], [256, 214], [416, 214], [96, 414], [256, 414], [416, 414]],
  checker: [[448, 668], [512, 668], [384, 668]],
  lounge: [[72, 660], [144, 660], [216, 668], [288, 668]],
  library: [[150, 106], [118, 106], [186, 106]], terminal: [[560, 452], [596, 452], [524, 452]], window: [[478, 106], [512, 106]], meeting: [[572, 284], [540, 284]]
} as const;
// Walls: [x, y, w, h, fill]. Doorways are gaps. Zone labels: [text, x, y] (room pixels, top-left of the label).
export const WALLS: [number, number, number, number][] = [[0, 0, 640, 8], [0, 696, 640, 8], [0, 0, 8, 704], [632, 0, 8, 704], [0, 466, 300, 8], [340, 466, 300, 8], [330, 474, 8, 230], [500, 92, 8, 130], [500, 280, 8, 14]];
export const ZONES: [string, number, number][] = [['Desks', 14, 100], ["Checker's office", 346, 480], ['Lounge', 14, 480], ['Meeting corner', 516, 98]];
export const GUARD_AT: [number, number] = [28, 456];
export const LABELS = {desk: 'Desks', checker: "Checker's office", lounge: 'Lounge'} as const;
