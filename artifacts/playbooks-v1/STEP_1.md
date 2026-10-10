# Builder restrictions

Historical normalized protocol lists the exact four nonzero compound commands in previous-failed-commands.json; it intentionally omitted aggregated output, so historical stderr cannot be reconstructed. before-probe.json records actual reproduction diagnostics under the old profile.

- git diff --check / --stat / -- research_router/sources (research-router), and git diff --check / --stat (career-ops): exit128. Reproduction: `fatal: Invalid path '…/command-center': Operation not permitted`. Denied ancestor metadata traversal was the cause. Git status and log also reproduced the same failure.
- unittest discovery test_since.py / test_hn.py / test_github.py in the research-router compound commands: SQLite fixture access failures. Reproduction: `sqlite3.OperationalError: unable to open database file`; even a new SQLite file in worktree-local TMPDIR failed because ancestors were denied.
- The direct oversized-duration Python call exited1 to reproduce the requested bug, not a sandbox failure.
- First correction rerun revealed zsh here-doc temporary-file denials. TMPDIR alone is insufficient: zsh TMPPREFIX now points inside the worktree.

Protected data remains a wholly denied tree. Owned workspaces/common Git metadata moved into separate ignored .work/builder-workspaces paths. CC source is denied at protected siblings, permitting only directory traversal down owned capabilities. Shared Git refs remain read-only. Own worktree index/index.lock are writable; Git objects written by Builder go inside .cc-runtime/git-objects with the private-clone objects as read-only alternates. CC still freezes Candidate on BASE independently.

Real installed Codex sandbox probes prove git status/diff/log, staging, zsh here-docs, tempfile and SQLite work. Probes prove shared-ref writes, CC source reads, a newly created protected check file and non-loopback network are denied. The directory names of ancestors are traversable; their protected sibling contents are not readable. No broad ancestor write/read capability was granted.

Both real task reruns completed with zero sandbox-blocked permitted commands: research-router 174 tests; career-ops10 copied-script fixture tests, syntax and Git checks. Full operational career-ops suite was deliberately not run against personal data. Native build test claims are evidence, not protected verification. Initial shell-temp finding and two career process/startup failures remain recorded separately. A bounded3x15ms kernel-identity retry fixes transient exec/exit inventory races; unresolved live identities still raise, never become kill authority. The pinned model/version/runtime flags did not change.
