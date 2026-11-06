// OUR office room: a placement map. Sprite rectangles are cut from two licensed sheets that are read at run time from a local folder
// (never part of this repo). Coordinates: sheet pixels for sprites, room pixels (640 x 704) for places.
export const ROOM = {w: 640, h: 704};
export type Rect = {sheet: 'office'; x: number; y: number; w: number; h: number};
const o = (x: number, y: number, w: number, h: number): Rect => ({sheet: 'office', x, y, w, h});
export const SPRITE = {
  desk: o(192, 18, 96, 104), deskDark: o(32, 16, 96, 104), monitor: o(448, 384, 32, 32), chair: o(0, 270, 32, 50), plant: o(192, 244, 32, 56), board: o(288, 462, 64, 48),
  shelf: o(224, 400, 64, 56), printer: o(256, 706, 32, 38), cooler: o(384, 494, 32, 64), sofa: o(0, 552, 64, 50), vending: o(10, 746, 48, 70), laptop: o(448, 494, 32, 36)
} as const;
export type SpriteName = keyof typeof SPRITE;
// [sprite, x, y]: drawn in this order (back to front).
export const PLACE: [SpriteName, number, number][] = [
  ['shelf', 160, 20], ['board', 340, 14], ['plant', 24, 30], ['printer', 560, 40],
  ['desk', 48, 120], ['desk', 208, 120], ['desk', 368, 120], ['monitor', 80, 108], ['monitor', 240, 108], ['monitor', 400, 108],
  ['chair', 80, 196], ['chair', 240, 196], ['chair', 400, 196],
  ['desk', 48, 320], ['desk', 208, 320], ['desk', 368, 320], ['monitor', 80, 308], ['monitor', 240, 308], ['monitor', 400, 308],
  ['chair', 80, 396], ['chair', 240, 396], ['chair', 400, 396],
  ['plant', 548, 150], ['cooler', 556, 300], ['plant', 552, 380],
  ['deskDark', 400, 520], ['monitor', 416, 508], ['monitor', 448, 508], ['laptop', 480, 540], ['plant', 590, 520],
  ['sofa', 32, 560], ['sofa', 104, 560], ['vending', 232, 520], ['plant', 180, 600], ['plant', 20, 500]
];
// Where a helper stands, by spot and slot (room pixels, feet position). Extra helpers beyond the slots are listed on the side only.
export const SLOTS = {
  desk: [[96, 214], [256, 214], [416, 214], [96, 414], [256, 414], [416, 414]],
  checker: [[448, 668], [512, 668], [384, 668]],
  lounge: [[72, 660], [144, 660], [216, 668], [288, 668]]
} as const;
export const GUARD_AT: [number, number] = [28, 456];
export const LABELS = {desk: 'Desks', checker: "Checker's office", lounge: 'Lounge'} as const;
