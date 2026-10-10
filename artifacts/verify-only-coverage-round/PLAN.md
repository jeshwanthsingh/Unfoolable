# Bounded coverage round — frozen rules

Base: dc3a6ef. Builder model/runtime unchanged.

1. Relevance: visible-UI claims require actual relevant component identity; nonvisual frontend claims target their declared source module/function. No unrelated component fallback.
2. Statistics: three independent BASE samples of 500 pairs, each with at least one failure; Candidate 2000 pairs, zero failures. Already implemented; preserve thresholds. A clean BASE sample rejects admission, never triggers a harness retry.
3. Harness errors: one recorded retry only when cleanup is certified. Second error remains ERROR. Assertion/code failures are never retried. Uncertain process ownership remains fail closed.
4. Timeout observation: fixed child-process call technique with deadline, elapsed time, exception identity, and certified owned descendant cleanup. Judge stays separate. No broader signal permissions.
5. Authoring stability: diagnose T3 using retained proposals; validate relevance against real named modules and retain every rejected output. Demonstrate repeated authoring outcome, not assume LLM determinism.

Holdout: R2, T1, T4, A1, A5, A4. User approved replacing previously used R5 with unused A4. Original BASEs preserved.
Ground-truth graders authored independently from BASE + intent; review names/assertions and obtain approval before new-task execution. No hidden checks disclosed to Builder or Command Center author.
Old eight are training data, rerun separately after fixes. New bar: false accepts 0; false rejects 0; correct VERIFIED >=5/6; wrong real FAIL >=8/12. Stop on any negative-control PASS. No post-holdout scorer tuning.

Verification: focused regressions -> full suite/typecheck/build -> twelve negative controls -> freeze scorer -> old-eight report -> approved new-task builds/once-only truth grading -> Verify-only correct/BASE/wrong matrix.
