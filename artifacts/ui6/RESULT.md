# UI-6 polish

Branch codex/ui-polish from b968ade. Local WIP commit per requested step. No push, merge or deployment.

Implemented: brighter light surface / deep-neutral dark surface; large distinct original hallmarks; one primary action; plain recorded gap and allowance copy; AI-title attribution in Proof; exact duplicate links, conservative similar-request disclosure; reversible browser-local archive; three-item waiting preview; slim real-status header; consistent spacing/type and calm interactions.

Same-data comparisons: `comparisons/1440-light.png`, `1440-dark.png`, `390-light.png`, `390-dark.png`. Both original b968ade and new UI use snapshot b7f7962d81f1e39c460e933249df044139de155e5a1117f853afbbc1dd3a6bc6. The user’s live data changed during review; the snapshot harness is read-only and rejects every mutation. Original live screenshots and three review passes are retained locally; selected evidence is committed.

Secondary contrast >=6.7757:1 light, >=8.5464:1 dark. No horizontal scroll at 390/1440. Native reduced motion: no running animations and transition duration 0s. Browser audit confirms archive/restore through reload, all waiting tasks accessible, visible keyboard focus, modal background locked, and Accept still disabled on an unreviewed item. No approval/Start/Continue/Keep/Discard was performed.

67-path real Builder probe: zero readable protected targets; owned Git status/diff/log, SQLite temp and writes work. Twelve negative controls: zero PASS. The first full suite was 1,011/1,012: an existing debug-store correction fixture exceeded its unchanged 15-second settling deadline. It passed alone unchanged in 13.457 seconds. Original run retained; no deadline or assertion changed. The final fresh suite passed 1,013/1,013, with zero failures or skips, in 342.027 seconds; source remained unchanged during the run. The same correction fixture passed in the full run without changing its deadline. Typecheck and production build passed on the final source before the suite. No app dependencies added. New MIT make-interfaces-feel-better skill scanned first (0/100, CAUTION), network denied, no LLM, OSV offline fallback. Taste and Impeccable remain quarantined by explicit user instruction.

No scoring, Builder, budget, sandbox, approval, passkey, stale-binding or database schema changes. Server edits only add read-only display metadata. Byte-for-byte handler preservation: safety-scope.json.

Limits: archive is local to this browser, not a new server-side lifecycle. Similar wording is not claimed identical. Manual VoiceOver/physical-phone testing and instrumented slow-device frame-rate testing remain unverified. All data/proof remain accessible. No new paid API billing enabled.
