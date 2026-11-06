import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {reduce} from '../../apps/observatory/office-reducer.ts';
import type {OfficeEvent} from '../../apps/observatory/office-schema.ts';
import {sceneOf} from '../../apps/observatory/office-scene.ts';
import {SLOTS} from '../../apps/web/src/annex/room-map.ts';

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
