# Saved-signal overlap

No new Codex study calls. Sources and SHA-256 bindings: analysis.json. A flag is a valid in-patch finding, not a verdict. Unknown signals are not zero flags. Protected-check failure is not a quality-gate finding.

| Wrong case / control | Intent | Readability | Test Writer alarm | Quality gates |
|---|---|---|---|---|
| A3-wrong-reference | Flag | Flag | Flag | Not measured |
| T2-wrong-reference | Flag | Flag | Flag | Not measured |
| A2-unchanged-base | No flag | No flag | Flag | Not measured |
| R4-unchanged-base | No flag | No flag | No flag (setup error) | Not measured |
| T5-unchanged-base | No flag | No flag | Flag | Not measured |
| A2-planted-half-fix | Flag | Flag | Flag | Not measured |
| A2-planted-special-case | Flag | Flag | No flag (setup error) | Not measured |
| A2-planted-edge-case | Flag | Flag | Flag | Not measured |
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

Intent and Readability overlap on all five flagged wrong study cases. Four have Test Writer alarms; only A2-planted-special-case is additional to that alarm. Neither has a proven unique catch beyond both other signals, because quality gates were not measured. Both OFF; UI OFF for lack of data. No new desks. Reviewer cost in final setup: 0 tokens per ticket.

Saved mean cost per role: Intent 7,824.87; Readability 7,820.61 tokens per task (31 cases). Both had zero false alarms on 11 correct cases. With the new drop policy, retained valid notes are counted and all-dropped output is incomplete. Original records remain untouched.

Non-serious notes are distinguished from the amber reviewer flag. Intent’s symlink note was valid but not marked serious. Test Writer setup errors are not clean results.
