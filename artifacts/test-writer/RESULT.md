# Round 4 — independent Test Writer

Implementation and measurement completed on codex/test-writer from d7909c1. No improvement in real-case confirmation was demonstrated. No false acceptance occurred. No push, merge, deployment, new dependency, paid API or human decision was performed.

## Before / after

19 fixed known-answer cases: 11 correct-labelled (8 frozen hidden-grader passes plus 3 user-Kept), 8 wrong (2 saved wrong references, 3 unchanged BASE controls, 3 planted incomplete event fixes). Kept is a human-accepted label, not an independent correctness proof. A1 excluded because its saved hidden result was ERROR. Old grader hashes/assertions and once-only slots were untouched.

| Measure | Baseline | Test Writer |
|---|---:|---:|
| Confirm rate | 0/11 (0%) | 0/11 (0%) |
| False accepts | 0/8 | 0/8 |
| PASSED WITH GAPS | 16 | 17 |
| ERROR | 3 | 2 |
| FAILED | 0 | 0 |

The R4 baseline sampling ERROR became PASSED WITH GAPS on the second pass; this is environmental variation, not evidence of a confirmation benefit. One baseline A2 provisioning race was explicitly voided and remeasured on stable records; the initial attempt remains recorded.

## What exists

Fresh tool-free read-only Codex authoring receives raw request and committed BASE code only. No Candidate ref/source, Builder transcript, truth label or grader reaches the packet. Memory and tools are disabled for this role. An actual canary preflight demonstrated BASE-only input, real BASE FAIL/Candidate PASS and 4,410 reported tokens.

Tests execute outside Candidate trees with the existing protected runner/judge. Admission requires meaningful BASE FAIL and exact Candidate PASS (concurrency retains three 500-pair BASE samples and 2,000 Candidate pairs). Non-admitted tests remain gaps. Existing failures, exclusions and harness errors are never upgraded. Costs, source packet, test proposal, ownership and executed evidence are recorded and hashed. Tickets enable the writer automatically; its usage joins their token cap. STOP ALL aborts the same owned operation; restart reconciles recorded PID/birth and refuses unknown launch gaps.

## What it still cannot confirm

- A2: generated judge asserted fields missing from its requested observation projection; Candidate execution was ERROR, never a code failure. The live credential-dependent broker test remains excluded and never counts as passed.
- R4: generated check failed on the known-correct Candidate; it was not admitted, not used to label the Candidate FAILED.
- T5 and T3: author abstained instead of using the available nonvisual browser fixture, citing missing setup/stubbing support. These claims stayed not checked.
- R1: authored request failed fixed concurrency-technique validation.
- R3: author could not express shared-database persistence/history assertions with the selected observation interfaces.
- A3 and T2: claim relevance/requirement identity validation failed.
- Kept c6263195: BASE excerpt did not contain the complete duration parsing path; author abstained.
- Kept 37b3646e: author selected an unknown source export.
- Kept career-ops: no supported unittest/Vitest native layout; writer did not start.

No prompt, test or scoring rule was altered during the fixed-set after pass. The earlier synthetic preflight correction removed an invented test-file-immutability obligation before this pass.

## Cost

458,760 actual reported writer tokens for the fixed set; no estimates. Per-case counts in COMPARISON.md. Two cases did not start the writer because the existing checker/runner was unavailable. Synthetic preflights and setup orchestration are excluded from that total.

## Verification

Final quiet full suite 834/834, zero skips, 282.618 seconds. Typecheck/build pass. 65 real Builder probe paths unreadable; own Git status/diff/log, SQLite temp files and writes still work. All 12 protected negative controls remain non-PASS. Watchman, tripwire, budget and STOP ALL tests remain in the green suite. New tests cover BASE-only dataflow, admission, no-upgrade, cost, cancellation, shared budget and PID/birth restart recovery. Desktop/mobile evidence display reviewed; no 390px overflow. Credential scan found no matches.

An intermediate concurrent suite hit one existing correction fixture's 20-second settle limit. Its exact isolated reproduction passed without changing the timeout; the final quiet expanded suite passed. Logs retained.

## Limits / recommendation

This authoring path is conservative but currently ineffective on this real scoring set. It adds cost and does not justify treating more work as verified. Do not call it reliable or expand it on these results. Semantic coverage cannot be proved merely by an intent quote and red/green examples; the fixed reused set is not a new holdout. Planted event variants share a Boolean-type edge, so they are not independent failure families. Existing in-process observation-channel residual risk and best-effort macOS logging remain unchanged.

No new model or Builder runtime was introduced. Do not automatically Keep or change any user ticket based on this study.
