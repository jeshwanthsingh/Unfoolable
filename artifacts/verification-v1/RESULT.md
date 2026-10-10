# Verification v1 result

## Verdict: PARTIAL

The layered implementation is committed and fail-closed. It is not fully usable for the SDK default gate yet: native existing tests that create local HTTP fixture servers are blocked by the unchanged network-deny policy. Those tests are ERROR, not failed product assertions and not excluded successes. No protection was weakened to improve coverage.

## Implemented

- Frozen-Candidate verification is the default application entry. Analysis/planning/Builder orchestration is explicitly experimental. Builder model/runtime and its permission/cancellation/recovery protections remain unchanged.
- Layer 1 restores BASE versions of existing tests, selects BASE test files, and checks native unittest/Vitest inventories and outcomes. Candidate-edited/added tests execute separately as NON-AUTHORITATIVE diagnostics. Missing inventory, duplicate identities, zero collection and skips cannot grant a pass.
- Layer 2 executes every immutable approved recipe for the associated registered project. Missing, altered or unavailable recipes block Land. Full known-bad/known-good admission precedes approval; identical definitions reuse their identity.
- Layer 3 is optional and off by default. Two-attempt authoring/full admission remains available. Unadmitted/unrequested checks are NOT CHECKED and disclose gaps without blocking Land; admitted failures/errors still block.
- VERIFIED requires meaningful passing mandatory layers and all admitted task checks without gaps. PASSED WITH GAPS explicitly discloses incomplete coverage. Only current passing evidence can enable an explicit Land. No replay automatically landed anything.
- Land creates one local branch on BASE without checkout, merge or push, with evidence/tree/parent/branch fencing. Restart and tamper tests remain fail-closed.

## Nine frozen Candidates and their BASEs

These are the existing frozen artifacts; no rebuilding or new benchmark round occurred. All approved project recipes run on every Candidate. Consequently an old task-specific fix can fail a different newly approved project requirement; that is not a regrade using its earlier hidden grader. A1's earlier hidden grade was an environment error, so no independent hidden-truth claim is made here.

| Task | Candidate | Candidate verdict | BASE verdict | Reason |
|---|---|---|---|---|
| A2 | `bd5ed0a2905d` | ERROR | ERROR | SDK local HTTP fixture tests: PermissionError under network-deny; Layer 2 not run. |
| R4 | `55d39ed22193` | FAILED | FAILED | Concurrency recipe fails; source-list recipe and BASE suite pass. |
| T5 | `3b990174e4d7` | PASSED WITH GAPS | FAILED | Candidate suite and browser recipe pass; advisory task checks not requested. BASE cancellation check fails. |
| R1 | `9d1de1e690ff` | FAILED | FAILED | Source-list recipe fails; concurrency recipe and BASE suite pass. |
| T3 | `fc947bbc8365` | FAILED | FAILED | Cancellation recipe fails; BASE suite passes. |
| R3 | `10224d60882e` | FAILED | FAILED | Source-list and concurrency recipes fail; BASE suite passes. |
| A3 | `34bc82960286` | ERROR | ERROR | SDK local HTTP fixture tests: PermissionError under network-deny; Layer 2 not run. |
| T2 | `1e3c2174aa88` | FAILED | FAILED | Cancellation recipe fails; BASE suite passes. |
| A1 | `a5c6c16463ab` | ERROR | ERROR | SDK local HTTP fixture tests: PermissionError under network-deny; Layer 2 not run. |

Candidate totals: {'ERROR': 3, 'FAILED': 5, 'PASSED WITH GAPS': 1}. BASE totals: {'ERROR': 3, 'FAILED': 6}. **Zero BASEs VERIFIED.** All eighteen persisted results reopened with unchanged verdicts/current evidence; no automatic execution on restart. Frozen clone status/tree checks passed.

Exact per-layer results, check names, IDs, commits, trees, gaps and elapsed times: `final-matrix/results.json`. Full per-artifact views: `final-matrix/<task>/Candidate.json` and `BASE.json`. Persistent oracle store and execution records: `run-data/oracles/project-recipes/` and `run-data/verify-only/`. This isolated application data directory was used for validation; existing user application data was not replaced. Seed the same approved packets into another application data directory with the documented admission command before using its project recipes.

## Project recipe admission

| Recipe | Identity | Fresh admission |
|---|---|---|
| Research Router source listing | `818124b09a5851519b05c227055946c51b3e57e630b01a604cc6e87c16023d33` | APPROVED: CHANGE fails known-bad, passes known-good; included GUARDs pass both. |
| Research Router same-source concurrency | `041b234c8d6720a3c1fb8131e46b47541fa4d5d8268e668be498187e99075faa` | APPROVED: CHANGE fails known-bad, passes known-good; included GUARDs pass both. |
| Therapy2 frontend cancellation | `0c3dd547c1bbeb7728ffb8d26e370a7534c9be41dd1145183ceebd749d219b48` | APPROVED: CHANGE fails known-bad, passes known-good; included GUARDs pass both. |
| Aegis Python SDK done event | `f95ebb12657b578dae3b313a1dc898a721aa40a34885da6c8cbf551bae300027` | APPROVED: CHANGE fails known-bad, passes known-good; included GUARDs pass both. |

The concurrency recipe completed 2,000 pairs on both versions: known-bad had 7 failing pairs (0.35%); known-good had zero. The seed also preserves earlier 3×500 admission evidence (12/1,500). These are different samples. At a tenfold reduction of the fresh measured rate (0.035%), zero failures in 2,000 can occur about 49.65% of the time, assuming independent pairs. Statistical PASS is not proof that a race is impossible.

Therapy2's unchanged browser recipe passed fresh admission and Candidate scoring using INTERFACE observations. The earlier trim-reason wrong-reference sensitivity gap is retained in SEED_REVIEW.md; no assertion was silently rewritten to conceal it. Research-router source-list is INTERFACE; concurrency and SDK event checks are IN-PROCESS observations judged separately.

## Named exclusions, skips and unavailable checks

The SDK exclusion is exactly `test_broker_smoke.BrokerSmokeIntegrationTests.test_broker_examples`: requires live broker credentials. It is recorded EXCLUDED and never counted PASS. Eight SDK tests report PermissionError, including `test_sdk.AegisSDKTests.test_health_request_is_unauthed`; they are listed individually in each SDK view and native observation report. Included SDK suite results are 14 passed / 8 errors / 1 explicit exclusion. No other SDK test was excluded to improve the verdict.

Layer-3 gap on this replay: `ai-task-checks` — advisory task checks not requested; original intent is not automatically proved. Layer 2 is NOT CHECKED when Layer 1 errors. Those rows cannot Land. Restored Therapy2 and research-router suites have no hidden skip/zero-collection success.

## Twelve unchanged negative controls

| Control | Result |
|---|---|
| observation-pipe-forgery-review-on | INCONCLUSIVE |
| R1-review-off | FAIL |
| native-judge-skipped | INCONCLUSIVE |
| native-judge-zero-collected | INCONCLUSIVE |
| skipped-existing-test-restored | FAIL |
| deleted-existing-test-restored | FAIL |
| edited-existing-test-restored | FAIL |
| early-exit-0 | INCONCLUSIVE |
| symlink-escape | INCONCLUSIVE |
| dependency-change | INCONCLUSIVE |
| oversized-output | FAIL |
| timeout | INCONCLUSIVE |

All twelve are non-PASS (five FAIL, seven INCONCLUSIVE). Observer/judge core hashes were unchanged during the control run. Review flags remain heuristic review aids, not proof of observation authenticity.

## Fresh verification

- `full-suite`: exit 0, 137.466s wall.
- `typecheck`: exit 0, 0.861s wall.
- `build`: exit 0, 1.263s wall.
- `negative-controls`: exit 0, 34.473s wall.

Full suite: **518/518**, zero fail/cancel/skip/todo. Native suite duration 137.166s. The earlier post-fix full run was 517/518 with the existing CLI shutdown test failing `No shutdown event`; its isolated reproduction passed 1/1 and the complete rerun passed. No test assertion or CLI implementation was changed. Both logs are retained (`final-checks/` and `final-checks-retry/`). This transient shutdown-test failure remains a finding, not an erased result.

The first replay (`matrix/`) is retained as historical evidence of the original test-title bug. A Therapy2 BASE title containing quotation marks was truncated by the old extractor although Vitest passed all seven tests. A reproducing regression failed before the fix and passed after it. Literal parsing now preserves opposite quotes/escaped delimiters without evaluating repository code. The final cohort uses this fixed evaluator.

Browser smoke on the final production build: default v1 entry, optional checks off, real coordinator/database health, selected project retained when entering its clone, desktop 1440px and mobile 390px with no horizontal overflow. Screenshots: `ui-desktop.png`, `ui-mobile.png`; assertions: `ui-smoke.log`. Owned smoke browser/server were closed.

## Simplification and line counts

Compared with cd7e5d4, excluding artifacts: **606 lines added, 273 deleted; net +333**. This is not a net line-count reduction. Deletions include the obsolete mandatory verify-only approval/waiver UI/API/control flow, two old per-task replay scripts, and obsolete mandatory-flow tests replaced by layer/store/native-integrity tests. Full Mission/Builder orchestration is demoted, not deleted; proven safety and history compatibility are retained. No dependencies, database tables or model/runtime changes were added.

## Remaining risk and security

- SDK local HTTP test fixtures remain blocked. A bounded fixture-network design would need separate consideration; network permissions were not broadened in this work.
- Native existing tests import Candidate code and retain IN-PROCESS assurance. Frozen tests, inventories and the tripwire constrain ordinary gaming but do not eliminate hostile in-memory framework manipulation.
- Separate recipe judges never import Candidate code. Deliberate observation-channel forgery remains the accepted residual risk; the review-on forgery control is non-PASS.
- Literal inventory extraction fails closed on unsupported/dynamic titles; no generic framework support is claimed.
- Recipes are project-wide requirements. Older independent Candidates must not be treated as cumulative fixes. Sampling and the known browser sensitivity gap limit recipe coverage.
- Transient kernel process-identity failures appeared in logs; cleanup had to be certified before any passing result. No unidentified/unrelated process was killed.
- Playwright reads allow only specific installed dependency package directories and the existing browser cache, not the tooling/home ancestor. Fresh browser admission/scoring passed.
- No hidden grader was read, changed or rerun. No source production repository or frozen clone was modified. No branches were landed in those repositories.
- No new paid API/billing, account changes, bypass flags or secrets were introduced. Protected network/filesystem/signal policies were not weakened. Staged credential-pattern scan and diff checks passed.

## Commits and use

Runtime: `e3baf5c7a6f74f8b39dfd2326878cbfe44093f8d`; narrow verified correction: `85f0185` on `codex/verification-v1`, branched from cd7e5d4. Local only, no push. See `docs/VERIFICATION_V1.md` for seed admission and workflow. The report does not recommend another benchmark round or expansion of per-task AI oracles.
