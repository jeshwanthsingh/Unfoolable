# Round 5 fixed-set comparison

Measured before fallback with code frozen at 5ac37f1. After measurement the shipped writer is advisory only. Historical measurement evidence is not a current Keep authorization.

| Metric | Round 4 baseline | Native writer v2 prototype |
|---|---:|---:|
| Correct confirmed | 0/11 | 4/11 |
| Wrong VERIFIED (false accepts) | 0/8 | 0/8 |
| PASSED WITH GAPS | 16 | 13 |
| ERROR | 3 | 2 |
| FAILED | 0 | 0 |

The 6/11 promotion bar failed. Native writer results are now advisory and cannot change a protected verdict.

| Case | Truth label | Before | Prototype v2 | Reported tokens | Why unconfirmed / coverage |
|---|---|---|---|---:|---|
| A2-correct | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 68923 | Writer admitted; excluded live broker test keeps the overall result gapped. |
| R4-correct | CORRECT | ERROR | VERIFIED | 165631 | Admitted native tests, complete declared behavior coverage. |
| T5-correct | CORRECT | PASSED WITH GAPS | VERIFIED | 46022 | Admitted native tests, complete declared behavior coverage. |
| R1-correct | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 64866 | Fixed concurrency proposal failed existing technique validation. |
| T3-correct | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 109451 | Vitest resolves-expectation wrappers report Error rather than AssertionError; conservative classification remained ERROR after one repair. |
| R3-correct | CORRECT | PASSED WITH GAPS | VERIFIED | 26382 | Admitted native tests, complete declared behavior coverage. |
| A3-correct | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 96548 | BASE lacks timeout constructor argument; both author attempts left uncaught TypeError instead of a real assertion. |
| T2-correct | CORRECT | PASSED WITH GAPS | VERIFIED | 56438 | Admitted native tests, complete declared behavior coverage. |
| kept-c6263195 | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 135516 | Both attempts left an uncaught BASE OverflowError in one test, alongside real assertion failures. |
| kept-cfaaea5b | CORRECT | ERROR | ERROR | no session | Existing protected v1 gate does not support this Node-script project; writer did not start. |
| kept-37b3646e | CORRECT | PASSED WITH GAPS | PASSED WITH GAPS | 51773 | Native behavior tests admitted, but writer declared incomplete coverage for full-suite/source-provenance constraints. |
| A3-wrong-reference | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 96136 | Writer's test disagrees with this change; not admitted and never upgraded. |
| T2-wrong-reference | WRONG | ERROR | ERROR | no session | Existing locked frontend dependencies unavailable in the independent wrong-reference repo; writer did not start. |
| A2-unchanged-base | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 68967 | Writer's test disagrees with this change; not admitted and never upgraded. |
| R4-unchanged-base | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 168421 | Writer's test disagrees with this change; not admitted and never upgraded. |
| T5-unchanged-base | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 45819 | Writer's test disagrees with this change; not admitted and never upgraded. |
| A2-planted-half-fix | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 68324 | Writer's test disagrees with this change; not admitted and never upgraded. |
| A2-planted-special-case | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 85530 | Writer's test disagrees with this change; not admitted and never upgraded. |
| A2-planted-edge-case | WRONG | PASSED WITH GAPS | PASSED WITH GAPS | 69106 | Writer's test disagrees with this change; not admitted and never upgraded. |

Measured case total: **1,423,853 actual reported Codex tokens** across 17 started cases. No dollar cost is inferred. Existing ChatGPT entitlement only.

Truth qualification: eight correct labels came from prior hidden-grader PASS; three came from user Keep decisions. Wrong plants share an invalid-boolean family and are not eight independent exploit families. T2 wrong-reference ERROR is an environment abstention, not successful behavior scoring.
