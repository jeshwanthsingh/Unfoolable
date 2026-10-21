# RULES-1

Base: 6a49b3d31ab9f42c234d8882fc03e9fc6ba34290. Branch: codex/rules-1. Local commits only.

1. Audit the exact coordinator-owned prompts and discovery boundaries; scan and pin source. Verify: saved prompt text and SkillSpector report.
2. Add a short owned optional instruction block, initially OFF. Verify: failing-then-passing prompt and real supervisor transport tests; no instructions written into user repositories.
3. Freeze 19 paired OFF/ON trials (38 fresh builds), using each row's BASE and exact intent. Same pinned model, profiles, 120k tokens / 80 commands / 15 minutes; one initial attempt, no fixer or Test Writer. Counterbalance pair order; original 19 frozen changes and 12 controls remain untouched. Verify outputs with the same protected existing-test/recipe checker; no hidden-grading slots consumed. Record verdicts, diff size/files, scope flags and real tokens.
4. Enable by default only with equal-or-better check outcomes and no larger diffs/files or scope flags. Missing measurements cannot promote. No claim that old tests alone prove task correctness.
5. Full suite, protected-path probe, 12 negative controls, golden replay. Any changed frozen verdict or negative control PASS stops work.

The 19 rows include repeated requests and originated as 11 correct / 8 wrong checker fixtures. Jesh explicitly approved 38 fresh Builder trials; those old truth labels do not label newly built output.

Study setup notes (before valid Therapy2 builds): its historical lock omits resolved/integrity metadata, so the production installer was not changed. A study-only copy of the existing benchmark dependency tree matches all 283 installed BASE versions, has no escaping symlinks, and is content-hashed. Both arms receive independent copies. Two setup attempts with no Builder/session/grade are retained as VOID_ENVIRONMENT and will be completed later in the same within-pair order. The first A3 OFF check lacked copied recipes due to directory initialization order; it is retained as VOID_HARNESS_SETUP and only that same frozen output is rechecked, with no Builder rerun.
