# CORE-1 resumed work — stopped on event 586

Resumed from ad32aca on codex/core-1. No stored verdict or golden file was modified.

## Implemented WIP

- Live checking and explanation replay call the same combineResults() entry in the pure core.
- Missing-project-recipe ERROR is converted to the original ticket-level NOT CHECKED inside the core.
- Caution table in the core: FAILED, ERROR, NOT CHECKED, PASSED WITH GAPS, VERIFIED (lower wins). The original returned combined path used FAILED > NOT CHECKED > PASSED WITH GAPS; ERROR threw before combination. Its fallback remains non-passing.
- Added the exact event-592 regression and a fast-check no-improvement property.
- Replaced the obsolete parser entry point with the scanner exported by pinned TypeScript 7.0.2. That lint change is not yet validated to completion: the test process was interrupted after the new historical mismatch. Do not call it finished.

## Required stop

Event 592 now correctly replays as NOT CHECKED. The broader historical replay found event 586 on the same ticket: stored PASSED WITH GAPS, reconstructed NOT CHECKED. Both events' frozen native reports contain a passing protected-test layer, missing mandatory recipe ERROR, and unchecked task checks. Both recorded combined results have no failures and the same gap reasons. Event 586 cannot be reproduced by the current cautious combination rule without additional historical policy/fact provenance. The stored label was retained; no special case was added to imitate it.

Coverage of the 19 frozen check events: 15 reconstructible, 4 unavailable, 1 mismatch among the 15. Missing original facts remain unavailable, not silently matched. This is not a zero-difference full historical replay.

The new core has 117 lines. Stop evidence: artifacts/core1/STOP-586.json. The running owned test command was interrupted; complete lint/property results, final typecheck/build, full suite, fresh 69-path probe, fresh 12 negative controls, after-map and final completeness audit were not run. Before-map remains 148 files / 3,982 edges. DESIGN.md was not edited.
