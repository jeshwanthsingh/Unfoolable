# RULES-1 result

Completed on `codex/rules-1`, from main `6a49b3d`. Decision: **keep the added rules OFF**. All 38 authorized fresh Builder trials ran; no frozen Candidate, hidden grader, stored production verdict or approval was changed. Local WIP commits only; no push, merge or deployment.

## Before

CC's own AGENTS.md contains Karpathy-style rules, but the isolated Builder did not receive that file. Its existing prompt already required relevant inspection, the smallest scoped change, safe local checks, no planner/network/install/commit and no weakened tests. The exact normal, legacy Mission and correction prompts are saved in `before-*-prompt.txt`; transport details and target-project instruction caveats are in AUDIT.md and project-instructions.json. This describes CC-supplied instructions, not undocumented provider internals.

## Source and implementation

Source: https://github.com/multica-ai/andrej-karpathy-skills/tree/2c606141936f1eeef17fa3043a72095b4765b9c2 . MIT declared in the pinned README and skill; no standalone LICENSE exists there. SkillSpector 2.12.0, static `--no-llm`, network denied, OSV offline fallback: SAFE 0/100, no findings. No global skill or new dependency was installed.

The short project-authored block adds think before coding, simplicity first, surgical changes and goal-driven checks to the original scope/safety prompt. It lives in apps/server/builder-instructions.ts. It never writes AGENTS.md into the user's repositories. Internal OFF/ON injection has real supervisor transport tests; no request/API/environment switch selects it. Model/runtime/profile/budget and protected scoring remain unchanged. Default is OFF.

## OFF versus ON

| Measure | OFF | ON |
|---|---:|---:|
| Fresh initial attempts | 19 | 19 |
| Frozen outputs | 16 | 14 |
| VERIFIED | 0 | 0 |
| PASSED WITH GAPS | 14 | 13 |
| FAILED (new Ruff findings) | 2 | 0 |
| NOT CHECKED (career-ops approval unavailable) | 0 | 1 |
| Token-budget stop before checking | 3 | 5 |
| Protected-check ERROR | 0 | 0 |
| Average reported tokens | 92,238 | 103,788 |
| Total reported tokens | 1,752,527 | 1,971,970 |
| Captured lines / output denominator | 1,052 / 16 | 782 / 14 |
| Captured file touches / output denominator | 38 / 16 | 29 / 14 |
| Potential outside-file-allowlist flags | 0 | 0 |

Thirteen pairs had frozen outputs in both arms: OFF 815 lines / 28 files; ON 756 lines / 28 files. That subset is 7.2% smaller in ON, but missing outputs have UNKNOWN diff size, not zero. ON had fewer checkable outputs, more budget stops and 12.5% more average reported tokens. Promotion did not pass.

Important limits: these are 19 historical rows with repeated requests, not 19 distinct tasks or a fresh holdout. The old 11-correct/8-wrong labels do not classify the new builds. No hidden-grader slots were consumed. Existing checks leave task-specific intent unproved; none was VERIFIED. Scope flags measure files outside the accepted-patch allowlist plus new native tests, not semantic scope within an allowed file. Tokens include cached input and can overshoot the fixed 120k threshold before an asynchronous stop. No budget was raised.

`comparison.csv`, `comparison.json` and `execution-order.json` preserve every trial, frozen commit/tree and prompt hash. MEASUREMENT.md explains admission/setup caveats. Two T5 preparation-only failures were retained as VOID_ENVIRONMENT and completed with a verified, BASE-lock-matching existing dependency snapshot; no model had started in the void records. The first A3 OFF output was rechecked unchanged after restoring an existing approved recipe snapshot. No assertion was altered and no completed Builder was retried.

## Final verification

- Full suite outside the outer sandbox, under caffeinate: **1,195 / 1,195 passed**, 0 failed/skipped/cancelled, **348.606 seconds**. New prompt tests: 6.
- Typecheck and production build: PASS. Existing large-bundle/Pixi import warnings remain; no dependency changed.
- Real Builder plus exact-profile probe: **74 paths denied**, 8 endpoints denied, 2 signing-helper calls denied; owned git status/diff/log, SQLite temp and write checks all pass. Owned cleanup certified.
- Twelve negative controls: all expected non-PASS; no malicious PASS.
- Golden replay: **61 comparisons, zero differences** against fbad889. Four originally missing fact snapshots remain unavailable, unchanged.
- Verdict core byte-identical to starting main. Credential scans: Gitleaks clean; detect-secrets findings reviewed as recorded hashes only. Diff whitespace check clean.

See validation.json, protected-probe.json, negative-controls.json and golden-replay.json. Full raw local logs remain in ignored .work/rules1; private provider/auth/oracle data is not committed.

No additional study, policy change or default enablement is warranted by these results.
