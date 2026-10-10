# Bounded coverage round

Status: PARTIAL — required hidden-grader approval is pending. No new-task BASE/reference execution, builds or grading occurred. The new-task bar has not been evaluated.

Branch: codex/verify-only-coverage-round. Final scorer: 2c96f56e97fa4ba8135b692cf750bca86a47bb5d. Builder/model/dependency pins unchanged; no new billing.

## Training data — after fixes, not holdout

First pass was frozen at 333a08e. Narrow training-discovered fixture/source corrections were frozen at 2c96f56. T2/A3 supplemental runs remain separate; no successful result was cherry-picked. Historical evidence retains its originating evaluator hash; changing the evaluator makes historical views STALE rather than silently rebinding them.

| Task | First pass | Accepted | Seconds |
|---|---|---|---|
| A2 | PASS | VERIFIED | 76.8 |
| R4 | ERROR | NOT VERIFIED | 36.8 |
| T5 | PASS | VERIFIED | 477.7 |
| R1 | PASS | VERIFIED | 156.5 |
| T3 | PASS | VERIFIED | 393.1 |
| R3 | NOT CHECKED | NOT VERIFIED | 46.1 |
| A3 | ERROR | NOT VERIFIED | 73.6 |
| T2 | ERROR | NOT VERIFIED | 18.1 |

Totals: 4/8 VERIFIED; 0 Candidate FAIL on these known-correct artifacts; 3 ERROR and 1 NOT CHECKED. These are coverage/authoring limits, not evidence of Candidate defects. No new wrong-Candidate totals exist.

R1: three BASE samples 4/500, 5/500, 3/500 failures; measured BASE rate 0.8%. Candidate 2000 pairs, zero failures. Assuming independence and a tenfold lower failure rate, chance of zero failures in 2000 is about 20.18%. No statistical PASS sample is retried as a harness error.

T3 reached VERIFIED in two independent live authoring/admission runs on identical BASE/intent/Candidate. Semantic oracle hashes differ; matching verdicts do not prove deterministic model output. See T3_ROOT_CAUSE.md and t3-repeat/.

## Unresolved training limits

- R4: generated oracle rejected as invalid; raw output retained; no code/structural failure retry.
- R3: stateful SQLite setup/sequencing remains unsupported by the CALL observer; intent claims HUMAN / NOT CHECKED.
- T2: actual appointmentStore source still omitted by the bounded packet despite improved tokenization. Both training proposals fail safe relevance checks; no claim was weakened to admit them.
- A3: multi-call read-only executable reuse fixed and regression tested. Replaying the same authored oracle now observes real SDK exceptions, but its judge reads exception.type rather than documented exception.name and fails tester admission. NaN/infinity encoding, observing the five-second default within the cap, and success/failure CLI fixtures remain NOT CHECKED. No oracle assertion was patched to obtain admission.

## Verification

- Full suite: 493/493 passed; 124.7 seconds; no skipped/todo tests.
- Typecheck and production build passed.
- All twelve agreed negative controls non-PASS, including post-final corrections.
- Real owned child termination/reaping succeeded; signals to judge, harness and recorder denied (EPERM).
- Earlier failed regression/full-suite evidence retained, including the missing-UUID import defect caught before final success.

## New holdout — approval pending

R5 was already used in Breakouts 11/12. User approved replacement with unused A4. Cohort: R2, T1, T4, A1, A5, A4. Same original repo BASEs.

Six independently authored grader packets contain 33 native unittest/Vitest claims. All 21 packet hashes unchanged. Known-correct/wrong reference proposals were separately authored from BASE+intent without access to checks or Candidates. They are proposals, not yet validated.

Review: /Users/jeshwanthsingh/.bench-private/coverage-round/GRADER_REVIEW.md
Review SHA256: 994e86a6c275dc4480acc874da568a53a9d64ed987e2845b4cc0f21cf3c6ad92

Benchmark adapter and orchestration are static-checked, approval-gated and locally committed (benchmark 3c88bd5). No executable admission/arm/grading runs were performed. Source repos and unrelated benchmark changes preserved.

The user requires grader approval before anything runs on new tasks. Approval remains pending; no approval file was fabricated. After approval, validate groundtruth BASE/correct/wrong, run plain A once, freeze Candidates, grade once, then run own Verify-only correct/BASE/wrong matrix. Never feed hidden check code to the Command Center author or Builder.

New-only bar remains: false accepts 0; false rejects 0; correct VERIFIED >=5/6; at least 8/12 wrong artifacts real FAIL. Current status: NOT EVALUATED.

## Residual assurance

IN-PROCESS returned metadata can be deliberately forged by code that reverse-engineers the recorder; this remains the accepted residual risk. Parent timing/process cleanup and separate native judge constrain ordinary test gaming. Structural relevance is lexical, not reachability proof. Statistical absence of observed races is not proof of race elimination. No sandbox or oracle permission was broadened.
