# NEW-task validation

Verdict: FAIL — coverage bar not met; ground-truth evidence incomplete. No assertions changed or once-only grade replayed.

| Task | Full hidden-grader admission | Candidate truth | Verify-only Candidate | BASE | Wrong reference |
|---|---|---|---|---|---|
| R2 | EXCLUDED | NOT RUN | EXCLUDED | NOT RUN | NOT RUN |
| T1 | EXCLUDED | NOT RUN | EXCLUDED | NOT RUN | NOT RUN |
| T4 | EXCLUDED | NOT RUN | EXCLUDED | NOT RUN | NOT RUN |
| A1 | ADMITTED | UNKNOWN | NOT CHECKED | NOT CHECKED | NOT CHECKED |
| A5 | EXCLUDED | NOT RUN | EXCLUDED | NOT RUN | NOT RUN |
| A4 | EXCLUDED | NOT RUN | EXCLUDED | NOT RUN | NOT RUN |

## Totals: NEW tasks only

- Correct accepted: 0 of the original six-task cohort; zero Candidates have usable hidden truth.
- False rejects observed: 0; false accepts observed: 0. This does not prove zero errors on excluded/truth-unknown artifacts.
- Wrong artifacts evaluated: 2/12, both NOT CHECKED / NOT VERIFIED; real FAIL: 0/12 (target >=8/12). Ten wrong artifacts not evaluated because their packets were excluded.
- Correct VERIFIED target >=5/6: not met. No denominator reduction.

## Full admission evidence

A1 is the sole fully admitted packet. CHANGE test_change_data_without_space and test_change_mixed_multiline_data: each BASE FAIL, independent CORRECT PASS, WRONG-1 FAIL. GUARD test_guard_spaced_comments_metadata and test_guard_eof_spaced_event: BASE PASS and CORRECT PASS. Exact native IDs and one-test structured reports are retained in /Users/USER/.bench-private/coverage-round/artifacts/coverage-round-v1/scores/A1.

R2 BASE CHANGE checks FAIL and correct-reference all checks PASS. WRONG-1 passes every CHANGE and fails only the query-preservation GUARD. It therefore fails full per-claim admission and is excluded; guard failure was not substituted for a CHANGE counterexample.

T1/T4 BASE observer ERROR: sandbox denies reading the installed Playwright sibling playwright-core/package.json. A5 independent correct-reference observer and A4 BASE observer exit 0 but timedOut/incomplete is set. Their native judging is not completed; no valid admission result inferred. All are excluded as instructed. No permissions, fixtures, thresholds, test names or assertions repaired during validation.

## A1 automated arm

Plain Codex self-reported done and output was committed without implementation review. Frozen commit a5c6c16463ab10433f0985c0488cdaa47c099b0f; tree 0564059e3096c90af49cbce919f8f1f8e7141abb.
Files changed: sdk/python/aegis/_http.py
Scope violations: none by declared path scope

The once-only hidden Candidate grade is ERROR: observer exits 0, certified cleanup, but interrupted/timedOut flag remains set. Truth is UNKNOWN; false-done is unavailable. That grade was not replayed and no grader changed.

## Verify-only two attempts

Both independently authored A1 attempts are INCOMPLETE: executable fake-response injection and consuming the SSE iterator are unavailable in the supported CALL protocol. Native regression and path-scope guards pass, but intent CHANGE and parser/lifecycle GUARD remain required NOT CHECKED. The first attempt is used only for its admitted guards; no intended-behavior check was admitted. Same own selected checks are reused for Candidate/BASE/WRONG-1, with no additional authoring after scoring. Candidate truth is labeled UNKNOWN in the reporting adapter.

## Verification before NEW execution

Scorer committed at aa6478f after full suite 500/500, runtime 129.6 seconds; typecheck/build passed; all 12 negative controls non-PASS. Pre-registration and checks: ../two-attempts/. Builder model/runtime, sandbox policy and dependencies unchanged. No new billing.

## Old eight — after fixes (training, separate)

These are the prior coverage-round results, not a rerun under the new two-attempt policy; their original evaluator hashes are retained. Supplemental T2/A3 attempts also stayed ERROR. They are not scored against the NEW bar.

| Task | Outcome | Acceptance |
|---|---|---|
| A2 | PASS | VERIFIED |
| R4 | ERROR | NOT VERIFIED |
| T5 | PASS | VERIFIED |
| R1 | PASS | VERIFIED |
| T3 | PASS | VERIFIED |
| R3 | NOT CHECKED | NOT VERIFIED |
| A3 | ERROR | NOT VERIFIED |
| T2 | ERROR | NOT VERIFIED |

Training total: 4/8 VERIFIED; 0 FAIL on known-correct training Candidates; 1 NOT CHECKED, 3 ERROR. T3 reached VERIFIED twice with different semantic oracle hashes.

## Remaining risks and limits

No NEW-task pass claim is justified. Most evidence was excluded by full admission or environmental flags, and the sole admitted task lacks executable own intent checks. This result measures a blocked validation cohort, not comparative model correctness. Deliberate in-process observation-channel forgery remains the previously accepted residual risk; guard-only checks cannot produce VERIFIED. The next action would require explicitly authorized environment/coverage repairs and a fresh pre-registered validation, not silent grader changes or replacement grade slots.
