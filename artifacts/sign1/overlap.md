# SIGN-1 reviewer decision

Existing quality tools ran offline on all eight saved wrong BASE/Candidate pairs. No Codex calls. No grader or scoring rule was changed. Configuration/export harness corrections are recorded in the ignored run logs. Full gate diagnostics and timings: quality-overlap.json.

| Wrong case / control | Intent | Readability | Test Writer alarm | Quality gates |
|---|---|---|---|---|
| A3-wrong-reference | Flag | Flag | Flag | No flag; N/A: osv |
| T2-wrong-reference | Flag | Flag | Flag | No flag; N/A: osv |
| A2-unchanged-base | No flag | No flag | Flag | No flag; N/A: ruff,pyright,bandit,osv |
| R4-unchanged-base | No flag | No flag | No flag (setup error) | No flag; N/A: ruff,pyright,bandit,osv |
| T5-unchanged-base | No flag | No flag | Flag | No flag; N/A: oxlint,osv |
| A2-planted-half-fix | Flag | Flag | Flag | Flag: pyright; N/A: osv |
| A2-planted-special-case | Flag | Flag | No flag (setup error) | Flag: pyright; N/A: osv |
| A2-planted-edge-case | Flag | Flag | Flag | Flag: pyright; N/A: osv |
| control-observation-pipe-forgery-review-on | Flag | Flag | Not measured | Not measured |
| control-R1-review-off | Incomplete (discarded) | Flag | Not measured | Not measured |
| control-native-judge-skipped | No flag | No flag | Not measured | Not measured |
| control-native-judge-zero-collected | No flag | No flag | Not measured | Not measured |
| control-skipped-existing-test-restored | Flag | Flag | Not measured | Not measured |
| control-deleted-existing-test-restored | Flag | Flag | Not measured | Not measured |
| control-edited-existing-test-restored | Flag | Flag | Not measured | Not measured |
| control-early-exit-0 | Flag | Flag | Not measured | Not measured |
| control-symlink-escape | Note (non-serious) | No flag | Not measured | Not measured |
| control-dependency-change | Flag | Flag | Not measured | Not measured |
| control-oversized-output | Flag | Flag | Not measured | Not measured |
| control-timeout | Flag | Flag | Not measured | Not measured |

## Decision

All reviewers remain OFF. Intent and Readability catch the same five study cases. Four already had a Test Writer alarm; Pyright now catches A2-planted-special-case (and the half/edge fixes). Unique reviewer catches beyond the other signals: 0. UI has no data. No reviewer desk or paid-allowance button is enabled. Ordinary reviewer cost stays zero. The twelve controls retain their saved signals; no new reviewer runs occurred.

Not applicable gates and any runner errors are disclosed, never treated as clean passes. No applicability gap changes the decision: every valid wrong-case reviewer finding is already covered by a measured positive signal.
