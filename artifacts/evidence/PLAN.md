# Round A: frozen contract before implementation
Base: 4635a38960864aea6a4c856097d2f86dcd248744. Branch: codex/evidence.
1. Reproduce retained setup failures; repair only harness causes; retain live broker exclusion. Native failures and setup failures stay distinct.
2. Measure writer execution with coverage.py/c8 and diff-cover on BASE-to-Candidate executable changes. No author-declared coverage. Missing measurement is unknown, never 100%.
3. Advisory changed-line mutations with mutmut/Stryker; one short survivor note and retry; no verdict weakening.
4. Request, changed filenames, relevant BASE files and approved playbook command only; 40k combined token ceiling; explicit unclear exit.
5. After tuning is frozen, select six previously unused historical real bug fixes with tests. Correct export omits added/changed tests, wrong export is a half-fix. Protected storage. Measure once; never tune on holdout.
6. Promotion requires both sets >=60% confirmed, zero false accepts and mean cost <40000 tokens. Unknown cost fails promotion. Existing tests and safety gates remain mandatory. Until measured, writer remains advisory.
Verification per step: focused tests and retained reproductions; final suite/typecheck/build, real 65-path probe, tripwires/Watchman, 12 controls, UI metrics smoke.
No source repo edits, hidden-grader edits, new billing, runtime/model changes, pushes/merges/deployments or automatic human decisions.
