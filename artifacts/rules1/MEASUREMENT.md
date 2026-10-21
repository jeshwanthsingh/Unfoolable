# RULES-1 measurement

Decision: keep the added rule block OFF. All 38 user-approved real Builder attempts are complete (19 paired historical rows, including repeated tasks). Same pinned gpt-6.1-sol/low, Codex 0.160.0, initial attempt only, 120,000 reported-token / 80-command / 15-minute budget. No fixer, Test Writer, task-oracle author or hidden-grader runs. No paid API route.

| Outcome | OFF | ON |
|---|---:|---:|
| Started Builder attempts | 19 | 19 |
| Frozen outputs reaching checks | 16 | 14 |
| VERIFIED | 0 | 0 |
| PASSED WITH GAPS | 14 | 13 |
| FAILED | 2 | 0 |
| NOT CHECKED | 0 | 1 |
| Budget stop before checking | 3 | 5 |
| Actual protected-check ERROR | 0 | 0 |
| Reported tokens, all attempts | 1,752,527 | 1,971,970 |
| Average reported tokens | 92,238 | 103,788 |
| Recorded changed lines (unequal output counts) | 1,052 / 16 outputs | 782 / 14 outputs |
| Recorded files touched (summed per output) | 38 / 16 outputs | 29 / 14 outputs |
| Potential outside-allowlist files | 0 | 0 |

Thirteen pairs produced frozen outputs in both arms: OFF 815 changed lines / 28 files; ON 756 / 28. This descriptive subset has 7.2% fewer ON lines, with equal files. It excludes harder-to-finish attempts and cannot establish whole-set improvement. A budget-stopped attempt has UNKNOWN diff size, not zero. ON used 12.5% more reported tokens per attempt, produced fewer checkable outputs and hit the unchanged budget more often. It did not satisfy promotion.

The two OFF failures were unchanged Ruff quality gates: new test import/style findings in kept-c6263195; import/loop-variable findings in R1-correct. The ON career-ops output was NOT CHECKED because the study had no current approved playbook; operational/personal-data tests were not run. Old fixture truth labels (11 correct / 8 wrong) describe the saved Candidates, never the newly built outputs. A PASSED WITH GAPS result does not prove the requested new behavior. No fresh-output false-accept rate or exact task-correctness claim is made.

Scope measurement follows the pre-registered accepted-patch file allowlist plus newly added native test files. Zero outside-list files is not proof of zero semantic scope drift within an allowed file. Lines = additions plus deletions. File totals count a file again in each independent output. Usage is Codex-reported total tokens (including cached input), not a dollar estimate; asynchronous updates can overshoot the configured limit before cancellation.

Two preparation failures occurred before any Builder session or grading, and were preserved as VOID_ENVIRONMENT. Both corresponding T5 slots were completed after verifying the pre-existing benchmark dependency snapshot against every BASE lock entry. One A3 OFF output initially had a local recipe-copy setup error: its identical frozen commit was rechecked after restoring the already-approved recipe snapshot. The original record remains intact. No code failure or completed Builder was retried. Actual slot ordering, Candidate commits/trees, prompt hashes and void reasons are recorded in execution-order.json and setup-repairs.json. All 19 original frozen trees and source HEAD/status fingerprints were checked unchanged. No live approval or production ticket was created.

All OFF prompt hashes are a19e86310ed672af284e77a85d8b580021ce8d2a3b761852f54ba86c186e2030. All ON hashes are bbac55a904bd8110a80d911b4b5332272c4238ea5d04ee5a9d66ae67d0e2a562. Target-project instruction metadata is in project-instructions.json. The two aborted dependency preparations never had a prompt/session.

Full validation is recorded separately in RESULT.md after the standalone suite and protected-path probe finish.
