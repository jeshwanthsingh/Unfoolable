# CORE-1 — stopped at the requested verdict-difference gate

Branch: codex/core-1, based on 3c94150. No push, merge, deploy or live decision was performed.

Steps 0–3 have local WIP commits; step 4 is preserved as unfinished WIP. First prerequisites commit: 4de572e. Golden snapshot commit: 4a30eca.

## Stop

The new historical-explanation test found event 592 on ticket b15600b3: stored NOT CHECKED, but replaying the playbook path alone gives PASSED WITH GAPS. The native result was ERROR for a missing project recipe; the original ticket adapter turns that case into NOT CHECKED, and the combined path preserves it. The explanation reconstruction omitted that combined-path rule. No historical result was changed. The golden snapshot is unchanged. No attempt was made to change the rule or the golden to hide the mismatch.

The 46 standalone native/playbook replay cases and 10,000 frozen-policy random comparisons passed. They are insufficient: this combined historical result exposed a missing case. The complete golden diff is therefore NOT zero and CORE-1 is not complete.

A second focused failure is test infrastructure: TypeScript 7 lacks the parser API used by the new authority-lint test. Typecheck passes, but the lint test itself is not yet working. Final focused run: 18/20 pass, 2 fail. Canonical Python 3.13 + repo-local TMPDIR gave 6/6 playbook integration passes; the earlier Python 3.14/default-temp launch failed before scoring. No sandbox or process-ownership rule was modified.

## Current artifacts

- Feature audit: CORE_1_AUDIT.md.
- Frozen golden: artifacts/core1/golden.json + SHA256. Includes 11 current historical tickets, 19 check events, 111 runtime events, 16 verifier runs, the 19-case study and 12 prior negative-control records.
- Pure scorer: packages/shared/verdict-core.ts, 99 lines. Import-free. Both paths call it; runtime classification also calls it. This remains WIP until complete combined-path replay passes.
- Invariants and test links: INVARIANTS.md. fast-check 4.10.2, MIT; OSV query found no published findings for that pinned version.
- Explain CLI and Proof wiring exist in WIP, but historical reconstruction is not ready for use.
- Before-map is retained. After-map, full suite, fresh protected-path probe and fresh negative controls were NOT run after the stop. Do not reuse old evidence as current completion proof.

Next action requires resolving the recorded mismatch, preserving the original NOT CHECKED semantics, and extending the golden replay to cover the adapter plus combined path. Do not claim an extraction is finished on standalone-score comparisons alone. DESIGN.md was not edited.
