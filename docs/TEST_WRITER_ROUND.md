# Round 4 measurement contract

Fixed before checker changes: 11 correct-labelled cases (8 frozen hidden-grader passes plus 3 user-Kept tickets), 8 wrong controls (2 saved wrong references, 3 unchanged known-bug BASEs, 3 planted incomplete A2 fixes). Kept is a human-accepted label, not an independent grader pass. A1 is excluded because its saved hidden grading result was ERROR. No old once-only grading slot is consumed again.

Protected manifest: `.work/test-writer/data/scoring-set.json`, SHA256 `ab8e1ce7ca8c322e799c1016389857bc6ec33a7cb28cfac47a09966e62e2ac6c`. Source commits, trees, original request text and provenance are frozen. The existing Builder denies the whole CC source/data tree.

Baseline: unchanged d7909c1 checker, existing approved project recipes, task checks off. Compare the same cases with the independent Test Writer. Confirm rate counts only VERIFIED correct-labelled cases. False accepts count only VERIFIED wrong cases. PASSED WITH GAPS and ERROR are disclosed separately, never successes. Preserve all prior failures and protected isolation. Authoring gets request and committed BASE only; no Candidate, verdict, truth label, hidden grader, or Builder transcript.

Admission for the new focused tests: meaningful protected BASE assertion FAIL and Candidate PASS. Non-admitted checks stay gaps; no failure can be upgraded. This contrast is weaker than an independent known-good/known-bad admission and cannot prove semantic completeness. Report the fixed scoring-set result and this residual risk without changing truth labels or tests to rescue a score.
