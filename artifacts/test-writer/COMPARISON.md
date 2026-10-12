# Fixed scoring-set comparison

| Measure | Baseline | Test Writer |
|---|---:|---:|
| Correct confirmed | 0/11 (0%) | 0/11 (0%) |
| Wrong confirmed | 0/8 | 0/8 |
| PASSED WITH GAPS | 16 | 17 |
| ERROR | 3 | 2 |

No confirmation improvement was demonstrated. The R4 baseline sampler ERROR became PASSED WITH GAPS on the second pass; this is not a verified confirmation or evidence of a Test Writer benefit.

| Case | Verdict | Reported tokens | Coverage |
|---|---|---:|---|
| A2-correct | PASSED WITH GAPS | 22078 | NONE |
| R4-correct | PASSED WITH GAPS | 31793 | NONE |
| T5-correct | PASSED WITH GAPS | 28811 | NONE |
| R1-correct | PASSED WITH GAPS | 30579 | NONE |
| T3-correct | PASSED WITH GAPS | 30104 | NONE |
| R3-correct | PASSED WITH GAPS | 30224 | NONE |
| A3-correct | PASSED WITH GAPS | 22511 | NONE |
| T2-correct | PASSED WITH GAPS | 29180 | NONE |
| kept-c6263195 | PASSED WITH GAPS | 29631 | NONE |
| kept-cfaaea5b | ERROR | not started | not run |
| kept-37b3646e | PASSED WITH GAPS | 32224 | NONE |
| A3-wrong-reference | PASSED WITH GAPS | 22443 | NONE |
| T2-wrong-reference | ERROR | not started | not run |
| A2-unchanged-base | PASSED WITH GAPS | 22124 | NONE |
| R4-unchanged-base | PASSED WITH GAPS | 32018 | NONE |
| T5-unchanged-base | PASSED WITH GAPS | 28779 | NONE |
| A2-planted-half-fix | PASSED WITH GAPS | 22099 | NONE |
| A2-planted-special-case | PASSED WITH GAPS | 22075 | NONE |
| A2-planted-edge-case | PASSED WITH GAPS | 22087 | NONE |

Total reported Test Writer tokens: 458,760. This excludes the synthetic preflight and setup orchestration. No token estimates were used.

Correct labels include eight earlier hidden-grader passes and three user-Kept tickets. Kept is a human-accepted label. Wrong controls include two saved wrong references, three unchanged BASEs and three planted incomplete event fixes. This reused scoring set is not a new holdout or a general reliability guarantee.
