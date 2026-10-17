# Focused review

Reviewed the complete task diff for native inventory, source isolation, bounds and scope.

- BASE identities come from protected native runners, not Candidate discovery or source-name expressions. Collection includes dynamic Unicode cases and native skip identities. Candidate execution is compared to the frozen native inventory using file/fullName pairs for Vitest and native IDs for unittest.
- BASE collection setup errors, duplicate IDs, missing records and count mismatches fail closed. Final review removed a `_FailedTest` name heuristic in favor of native TestLoader error records; the regression covers both a legitimate similarly named test and a genuine loader failure.
- The original owned execution, cleanup, output/deadline, filesystem, network and signal rules remain in use. Trusted native dependency resolution no longer needs access to denied parent package/config files.
- Tree-sitter receives immutable BASE bytes and request text only, never Candidate content, grader files, truth labels or Builder sessions. It does not import source. AST parse errors, parser failure and oversized definitions result in omitted context, not invented definitions.
- New parser helper and pinned requirements are included in evaluator identity. Changing this evaluator correctly makes historical evidence stale; historical holdout results were not rewritten or rerun.
- Native writer prompt, writer admission/scoring/promotion, 40k budget and Builder model/runtime files are unchanged. No UI, new AI role, action gate or benchmark grader was added.

Limits: AST relevance remains a deterministic heuristic, not semantic understanding. Complete relevant definitions too large for the bounded pack are omitted. Vitest inventory currently executes the BASE suite through its JSON reporter rather than using list output; this includes skips and avoids source-title parsing. Existing native in-process observation risks remain unchanged. Optional Pynguin was not run.
