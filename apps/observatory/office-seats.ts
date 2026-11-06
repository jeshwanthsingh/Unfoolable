// Seats keyed by session id. A helper gets a home desk the first time it is seen as a figure and keeps it until its session ends or has been
// silent too long; any other spot (library, terminal ...) keeps its slot while the helper stays there. Positions are never derived from an
// array index, so re-sorting, merging or reloading the page cannot move anybody. Pure code: the live server holds one tracker.
import {SLOTS} from '../web/src/annex/room-map.ts';
import type {Spot} from './office-scene.ts';

export type Seat = {spot: Spot; slot: number};
export type Want = {key: string; spot: Spot; order: number}; // order = when the helper was first seen (any increasing number)
export const CAPACITY = Object.fromEntries(Object.entries(SLOTS).map(([k, v]) => [k, v.length])) as Record<Spot, number>;
const lowestFree = (cap: number, taken: ReadonlySet<number>): number | undefined => { for (let i = 0; i < cap; i++) if (!taken.has(i)) return i; return undefined; };

export function createSeatTracker() {
  const home = new Map<string, number>(), at = new Map<string, Seat>();
  return {
    // wants: where each helper should stand now. alive: sessions that still exist (not ended, not silent for 30 min). Returns every placed helper's seat.
    update(wants: readonly Want[], alive: ReadonlySet<string>): Map<string, Seat> {
      for (const k of [...home.keys()]) if (!alive.has(k)) home.delete(k);
      const order = [...wants].sort((a, b) => a.order - b.order || (a.key < b.key ? -1 : 1));
      const homes = new Set(home.values());
      for (const w of order) if (!home.has(w.key)) { const d = lowestFree(CAPACITY.desk, homes); if (d !== undefined) { home.set(w.key, d); homes.add(d); } }
      const taken = {} as Record<Spot, Set<number>>;
      for (const s of Object.keys(CAPACITY) as Spot[]) taken[s] = new Set();
      const result = new Map<string, Seat>();
      for (const w of order) { // pass 1: everybody who already has a valid place keeps it
        const keep = w.spot === 'desk' ? home.get(w.key) : at.get(w.key)?.spot === w.spot ? at.get(w.key)!.slot : undefined;
        if (keep !== undefined && keep < CAPACITY[w.spot] && !taken[w.spot].has(keep)) { result.set(w.key, {spot: w.spot, slot: keep}); taken[w.spot].add(keep); }
      }
      for (const w of order) { // pass 2: the rest take the lowest free place of their spot (a desk that is somebody's home is not free)
        if (result.has(w.key)) continue;
        const slot = lowestFree(CAPACITY[w.spot], new Set([...taken[w.spot], ...(w.spot === 'desk' ? homes : [])]));
        if (slot !== undefined) { result.set(w.key, {spot: w.spot, slot}); taken[w.spot].add(slot); }
      }
      at.clear(); for (const [k, s] of result) at.set(k, s);
      return result;
    }
  };
}
