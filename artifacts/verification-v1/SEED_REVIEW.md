# Verification V1 seed review

Status: proposed reusable recipes, not yet admitted on the final runtime. The user request authorizes preparing these seeds as approval-once proposals; a stored packet is not execution proof. No native tests or project code were executed during packet preparation.

All packets derive exclusively from Command Center own oracle artifacts. Frozen candidate references come from `verify-only-v2-real-test/correct-set.json`; git commit/tree metadata was confirmed read-only. No private hidden grader was read. No test code or request assertions were edited. Native-suite, SCOPE, and HUMAN task extras were excluded. The imported manifest's sourceRoot/id/evaluationSignature/dependencyRoot are historical bindings, and the runtime must rebind execution to protected exported trees rather than the live production root. The source field is prior source-discovery metadata.

| Packet | Own oracle source | Checks retained | Known-good / known-bad metadata |
| --- | --- | --- | --- |
| research-source-list | /Users/jeshwanthsingh/Projects/ai-lab/command-center/artifacts/verify-only-v2-real-test/matrix/R4/frozen-own-oracle.json | E1, E2 | 55d39ed22193be862b52abf5c1cdef80fe8753d0 / f7f198123955f6113cb583020d06bb47dc89817f |
| research-concurrency | /Users/jeshwanthsingh/Projects/ai-lab/command-center/artifacts/verify-only-coverage-round/old-eight/R1/frozen-own-oracle.json | E1 | 9d1de1e690ffcfcaaba7544fedc61627a32468e2 / f7f198123955f6113cb583020d06bb47dc89817f |
| therapy-cancellation | /Users/jeshwanthsingh/Projects/ai-lab/command-center/artifacts/verify-only-coverage-round/old-eight/T5/frozen-own-oracle.json | E1, E2 | 3b990174e4d768caac45ffda0c5a6da74f1c3053 / 1976e3766bf7145cdfaf17e874d85c82d11a5a3f |
| aegis-done | /Users/jeshwanthsingh/Projects/ai-lab/command-center/artifacts/verify-only-coverage-round/old-eight/A2/frozen-own-oracle.json | E1 | bd5ed0a2905d0b6775a83ff46a008907b9c3db10 / 5417ccb14a95e699e6ff2decbedabc891f052bcb |

R4 uses the previously successful real-test matrix own CLI oracle, not the invalid later old-eight R4 attempt. R1 uses only its E1 same-source concurrency check with 2000 pairs, zero failing histogram outcomes, and complete-pair assertions. Prior R1 base evidence comprises three 500-pair FAIL runs (12 failures/1500); a final-runtime rerun must show the known bad fails and known good passes all 2000 pairs. Independence and generalization beyond the sample remain assumptions.

T5 retains success reason/list/selected-state/isolation E1 and backend-failure-preservation E2. Its prior wrong-mutation outcomes include a PASS for reason trimming and an ERROR; this is a known sensitivity gap, not a claim of comprehensive detection.

A2 retains E1 malformed done-event rejection plus valid zero/nonzero outcomes. Prior E2 was the native suite and is excluded by scope.

All commit and tree metadata is present. Final frozen-runtime test-the-tester execution is still required for every proposal.
