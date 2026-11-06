import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import type {OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {sceneOf} from '../../apps/observatory/office-scene.ts';
import {SLOTS} from '../../apps/web/src/annex/room-map.ts';
import {CAPACITY, createSeatTracker, type Want} from '../../apps/observatory/office-seats.ts';
import {createLive} from '../../apps/observatory/office-live.ts';
import type {Spot} from '../../apps/observatory/office-scene.ts';
import {appendFileSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Soak check (c): no two helpers on the same tile. Every drawn figure stands at a place of its spot; places are never shared.
const stood = (state: ReturnType<typeof reduce>) => sceneOf(state).figures.flatMap((f) => { const at = (SLOTS[f.spot] as readonly (readonly [number, number])[])[f.slot]; return at ? [{key: f.key, spot: f.spot, slot: f.slot, at: `${at[0]},${at[1]}`}] : []; });

test('no two helpers on the same tile, whatever the events (property, fixed seed)', () => {
  const row = fc.record({k: fc.constantFrom('tool_end', 'tool_end', 'turn_end', 'needs_you', 'subagent_start', 'gate_result', 'session_end'), s: fc.integer({min: 1, max: 14}), p: fc.constantFrom('Unfoolable', 'AgentRunLab', 'Muse Guard'),
    tool: fc.constantFrom('Read', 'Bash', 'WebSearch', 'Edit', 'Grep'), v: fc.constantFrom('PASS', 'FAIL'), t: fc.integer({min: 0, max: 120})});
  fc.assert(fc.property(fc.array(row, {minLength: 1, maxLength: 60}), (rows) => {
    const evs: OfficeEvent[] = rows.map((r, i) => ({v: 1, seq: i + 1, ts: `2026-11-05T10:${String(Math.floor(r.t / 60)).padStart(2, '0')}:${String(r.t % 60).padStart(2, '0')}`, sid: `h:${String(r.s).padStart(12, '0')}`, project: r.p, kind: r.k as OfficeEvent['kind'],
      tool: r.k === 'tool_end' ? r.tool : null, ok: r.k === 'tool_end' ? true : null, code: r.k === 'needs_you' ? 'permission' : null, gate: r.k === 'gate_result' ? {task: 'T', verdict: r.v as 'PASS', passed: 1, total: 2} : null}));
    const at = stood(reduce(evs, '2026-11-05T10:02:05'));
    assert.equal(new Set(at.map((a) => a.at)).size, at.length, 'two helpers on one tile');
    assert.equal(new Set(at.map((a) => `${a.spot}#${a.slot}`)).size, at.length, 'two helpers on one slot');
  }), {numRuns: 400, seed: 2026});
});

test('capacity matches the room map (a seat is a real place)', () => {
  for (const spot of Object.keys(SLOTS) as Spot[]) assert.equal(CAPACITY[spot], SLOTS[spot].length);
});

// Soak check (b), tracker level: the same sequence of states, with the helpers listed in any order, gives the same places; nobody who stays
// in a spot is ever moved; a helper that goes away (quiet) and comes back to its desk gets its own desk back; no two share a place.
test('shuffled order, merges and quiet-and-back never move a helper (property, fixed seed)', () => {
  const SPOTS: Spot[] = ['desk', 'desk', 'desk', 'library', 'terminal', 'window', 'checker', 'lounge'];
  const step = fc.record({present: fc.array(fc.record({k: fc.integer({min: 0, max: 8}), s: fc.constantFrom(...SPOTS)}), {maxLength: 9}), gone: fc.array(fc.integer({min: 0, max: 8}), {maxLength: 3}), shuffle: fc.integer({min: 0, max: 1000})});
  fc.assert(fc.property(fc.array(step, {minLength: 2, maxLength: 14}), (steps) => {
    const A = createSeatTracker(), B = createSeatTracker(), first = new Map<string, number>();
    let prev = new Map<string, {spot: Spot; slot: number}>(), prevWants = new Map<string, Spot>(); const homeOf = new Map<string, number>();
    for (const st of steps) {
      const seen = new Map<string, Spot>(); for (const p of st.present) seen.set(`h${p.k}`, p.s); // a repeated id in one step is a merge: one helper
      const wants: Want[] = [...seen].map(([key, spot]) => ({key, spot, order: first.get(key) ?? first.set(key, first.size).get(key)!}));
      const ended = new Set(st.gone.map((g) => `h${g}`).filter((k) => !seen.has(k)));
      const alive = new Set([...first.keys()].filter((k) => !ended.has(k)));
      for (const k of ended) { first.delete(k); homeOf.delete(k); }
      const shuffled = [...wants].sort((a, b) => ((a.order * 7919 + st.shuffle) % 13) - ((b.order * 7919 + st.shuffle) % 13));
      const ra = A.update(wants, alive), rb = B.update(shuffled, alive);
      assert.deepEqual([...ra].sort(), [...rb].sort(), 'the order of the list changed somebody\'s place');
      for (const [k, seat] of ra) { // a helper that stayed in its spot did not move
        if (prevWants.get(k) === seat.spot && prev.has(k)) assert.deepEqual(prev.get(k), seat, `${k} moved without changing spot`);
        if (seat.spot === 'desk') { if (homeOf.has(k)) assert.equal(seat.slot, homeOf.get(k), `${k} did not get its own desk back`); else homeOf.set(k, seat.slot); }
      }
      const tiles = [...ra.values()].map((x) => `${x.spot}#${x.slot}`);
      assert.equal(new Set(tiles).size, tiles.length, 'two helpers share a place');
      prev = ra; prevWants = new Map([...ra].map(([k, v]) => [k, v.spot]));
    }
  }), {numRuns: 500, seed: 7});
});

test('the live server remembers places: more helpers, a re-sort, a merge and quiet-and-back move nobody; a page reload asks again and sees the same', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'seatlive-')); mkdirSync(join(dir, 'logs')); const log = join(dir, 'office-v1.jsonl'); writeFileSync(log, '');
  let now = new Date(2026, 10, 5, 11, 0, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  let seq = 0;
  const put = (sid: string, project: string, kind = 'tool_end', o: object = {}) => appendFileSync(log, JSON.stringify({v: 1, seq: ++seq, ts: iso(now), sid, project, kind, tool: kind === 'tool_end' ? 'Edit' : null, ok: kind === 'tool_end' ? true : null, code: null, gate: null, ...o}) + '\n');
  const live = createLive(log, {pollMs: 40, clock: () => now});
  const wait = () => new Promise((r) => setTimeout(r, 160));
  const seats = () => live.state().seats;
  try {
    put('h:00000000000a', 'command-center'); put('h:00000000000b', 'muse-guard'); put('h:00000000000c', 'jeshwanth.com'); await wait();
    const first = {...seats()};
    assert.deepEqual(Object.keys(first).sort(), ['h:00000000000a', 'h:00000000000b', 'h:00000000000c']);
    const same = (label: string) => { const now2 = seats(); for (const [k, v] of Object.entries(first)) if (now2[k]) assert.deepEqual(now2[k], v, `${label}: ${k} moved`); };
    now = new Date(now.getTime() + 20_000); put('h:00000000000d', 'proof-lab'); put('h:00000000000a', 'command-center'); await wait(); same('a new helper and a re-sort (A has the newest news now)');
    assert.equal(new Set(Object.values(seats()).map((x) => `${x.spot}#${x.slot}`)).size, 4);
    now = new Date(now.getTime() + 10_000); put('h:00000000000e', 'muse-guard'); await wait(); same('a second helper in the same project (labels renumber, places do not)');
    now = new Date(now.getTime() + 120_000); await wait(); // everybody goes quiet: no figures, but the desks stay reserved
    put('h:00000000000f', 'jeshwanth.com'); put('h:00000000000b', 'muse-guard'); await wait(); same('quiet and back');
    assert.deepEqual(seats()['h:00000000000b'], first['h:00000000000b']);
    const reload = JSON.parse(JSON.stringify(seats())); assert.deepEqual(reload, seats()); // a reload is another read of the same server state
  } finally { live.stop(); }
});
