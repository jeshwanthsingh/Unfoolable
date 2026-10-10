# Playbooks v1

Branch codex/playbooks-v1 from28d17da. Four local WIP commits, no push/merge/deployment.

## What changed

Builder paths now avoid protected-data ancestors. Protected sibling denials retain read-denial for CC source/runtime/checks and the private benchmark store, while allowing directory traversal to owned capabilities. Git status/diff/log work. The own-worktree index is writable; new Git objects stay in .cc-runtime/git-objects with read-only private-clone alternates. Shared refs remain read-only. HOME, TMPDIR and zsh TMPPREFIX are worktree-local. CC still freezes Candidate on BASE independently. No model/version/reasoning/runtime flags changed.

Playbooks are versioned/hash-bound JSON in CC data, not source repositories. Read-only committed metadata proposes setup/test argv, safe environment, runner, timeout, BASE-failure and flaky annotations. Missing/unapproved playbooks stop at Needs You before building. Explicit approval resumes matching waiting tickets. Editing withdraws approval; changed content/check evidence cannot authorize Keep. Commands run under the existing protected sandbox and archive materialization, never registered working trees. Existing native verification runs first for supported native layouts. Custom scripts use their native named records. Every invocation is matched to its BASE records. Zero collection, duplicate identities, environment/cleanup failure never pass. BASE failures must be explicitly named; skips/known failures are named gaps, never passes. Flaky labels never waive failures. New Candidate failures cannot hide behind passing guards. Candidate-only records are non-authoritative. Existing installed dependencies are borrowed read-only; no network installation is implied.

CLI: ./cc playbook show REPO; approve REPO; edit REPO (prepares a local JSON draft and prints the explicit --file apply command). Approval is always a user action. UI shows the same proposal and approval control.

## Previously blocked commands

Exact original nonzero compound commands: previous-failed-commands.json. Historical logs intentionally omitted aggregate stderr; diagnostic strings below were reproduced in before-probe.json rather than invented as historical output.

| Commands | Reproduced error / reason | Final result |
|---|---|---|
| git diff --check, --stat, -- research_router/sources; status/log also reproduced | fatal: Invalid path '…/command-center': Operation not permitted; denied ancestor traversal | All exit0 under real Codex profile and both Builder reruns |
| Python unittest discovery for test_since/test_hn/test_github; tempfile+SQLite probe | sqlite3.OperationalError: unable to open database file, despite local TMPDIR; denied ancestor traversal | SQLite probe and relevant/full research-router tests pass |
| zsh here-docs (found in first rerun) | shell temporary-file denial; zsh TMPPREFIX is separate from TMPDIR | Local TMPPREFIX; real here-doc probe passes |
| Direct oversized-duration Python call | Expected requested OverflowError bug reproduction, not sandbox failure | Builder task changes handle overflow; not a permission defect |

Final real reruns: research-router8 structured commands,174 tests; career-ops5 commands,10 copied-script fixture tests plus syntax/Git checks. **Zero sandbox-blocked permitted commands** in both final reruns. These are Builder checks, not hidden grading or protected proof of the new intents. Bound diagnostics may be clipped; the finding combines command records, summaries and direct permission probes. Operational career-ops test-all.mjs was not run against personal data.

Two career startup/process-inventory attempts failed closed, with certified cleanup, and were retained before rerun. Kernel exec/exit identity now gets3x15ms bounded retries; live unidentified PIDs still fail closed and are never killed on PID alone. Tests prove both transient recovery and permanent-unknown rejection.

## Career-ops waiting

Ticket cfaaea5b-737e-4e5c-b489-cf16e14d44b8 is needs_you, attempt0, no Builder launch. Proposal hash ce1a072cd4d1292c69e44bf0157a27e97bb1920205f0bf12d810d329b1f3d452. Approval remains null.

- Setup: none.
- Test: node test-all.mjs --quick, cwd .
- Runner: node-script.
- Environment: HOST=127.0.0.1, BIND_ADDRESS=127.0.0.1, CI=1; fixed HOME/TMPDIR/TZ/LANG.
- Timeout:600 seconds.
- Known failures/flaky tests: none declared; BASE has not been run for this unapproved proposal.
- Warning: the script invokes operational commands. It must run only in a protected disposable export, never the registered repository. Native script completion alone is not individual test proof.

## Verification

Fresh full suite **689/689 passed**, zero failed/skipped/cancelled,165.310 seconds. Typecheck and production build exit0. All original tests retained, except the independently specified state-edge test now includes the required queued→needs_you transition. All12 existing negative controls non-PASS; no agreed negative PASS. Core identities unchanged during control execution; no grader edits.

Focused tests cover approval identity/edit invalidation, unapproved admission rejection, BASE known-fail admission, restoration of weakened tests, nonzero collection/skip handling, unexpected Candidate failure, approval/resume once, stale Keep rejection, old review compatibility, actual Git/SQLite/temporary capabilities, denied shared refs/CC/protected files/private benchmark reads/outbound traffic, and kernel identity retries. Browser verified desktop1440/mobile390, keyboard approval focus, older review readability, no overflow and no approval click. Existing pending reviews survived coordinator restart. Basic changed-file credential scan: zero findings. No new dependencies or paid API billing.

## Limits

Playbook suites are regression guards; task intent still may be untested, so successful playbook checks honestly yield PASSED WITH GAPS. In-process native reporters share the established residual risk of deliberate reporter forgery; static tripwires are review flags, not proof of arbitrary-code isolation. Command/process deadlines and protected materialization remain enforced. Setup/test commands needing unsupported reports, unavailable local dependencies or disallowed effects fail closed rather than pass. Career-ops admission remains intentionally untested until the user approves; any BASE failure then requires review before a build. Wildcard fixture inbound risk from the prior accepted network boundary remains unchanged.
