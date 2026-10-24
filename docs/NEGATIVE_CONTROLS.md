# Negative controls

The twelve deliberately wrong inputs are a checker self-test suite, not twelve checks on every task. Recorded outcome: **5 FAIL, 7 INCONCLUSIVE, 0 PASS**. FAIL is a rejected check; INCONCLUSIVE is refusal to claim success, not proof that a defect was detected. Neither automatically accepts a change.

## Coverage map

| Control in the saved runner | Boundary exercised | Recorded outcome |
| --- | --- | --- |
| observation-pipe-forgery-review-on | Saved observation-channel forgery is fenced for human review by a heuristic | INCONCLUSIVE |
| R1-review-off | Saved append-only attack against duration validation, with the review heuristic disabled; not the pilot concurrency task | FAIL |
| native-judge-skipped | An actually skipped native judge cannot count as a passing test | INCONCLUSIVE |
| native-judge-zero-collected | An actually empty native judge cannot count as a passing test | INCONCLUSIVE |
| skipped-existing-test-restored | Candidate skip cannot replace the original restored test | FAIL |
| deleted-existing-test-restored | Candidate deletion cannot remove the original restored test | FAIL |
| edited-existing-test-restored | Candidate vacuous assertion cannot replace the original restored test | FAIL |
| early-exit-0 | Exiting successfully without observations does not prove success | INCONCLUSIVE |
| symlink-escape | Unsafe export symlink is refused | INCONCLUSIVE |
| dependency-change | Unapproved dependency change is held for review | INCONCLUSIVE |
| oversized-output | Excessive application output produces the wrong exception for the duration assertion | FAIL |
| timeout | Non-terminating work produces no completed passing evidence | INCONCLUSIVE |

Exact saved inputs, expected results and stop rule are in [the runner](../scripts/oracle-negative-controls.ts). It stops if any control scores PASS. The unchanged full pack was rerun during this recovery: [2026-10-24 results](../artifacts/recover-docs/negative-controls.json), five FAIL, seven INCONCLUSIVE, zero PASS. [SCION-1b safety](../artifacts/scion1b/safety.json) and [Observatory results](../artifacts/obs3/negative-controls.json) are earlier dated evidence. Reading this page does not rerun them.

## What is not covered

No new ADV-1 verdict-control pack was found or admitted. This map is complete for the existing twelve, but that ADV-1 item remains **PARTIAL**. It does not establish resistance to arbitrary native reporter forgery, every language/runtime, malicious approved checks, a compromised host, or all future attacks.

The [new grading-time access diagnostic](../artifacts/recover-docs/grading-probe.json) is separate: two Python runner lanes, protected-read/write attempts, outbound networking, private API authentication, environment sanitization and parent signal permission. Its successful access-denial checks are not extra planted-cheat verdict controls. Nine absent targets per lane were not exercised, and browser/Vitest access remains unmeasured.

Do not report “12 bugs detected,” “all attacks prevented,” or “12 cheats caught on this task.” Report the denominator and the split: **12 non-PASS; five FAIL and seven INCONCLUSIVE**. Small-study false-accept counts retain blocked and abstaining cases; they are not detection rates. [Study denominators](../artifacts/warning-signal/RESULT.md).

[Threat model](THREAT_MODEL.md) explains host trust and in-process forgery. [Signing](SIGNING.md) explains what integrity checks do and do not prove.
