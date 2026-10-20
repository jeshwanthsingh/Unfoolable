# NIGHT-1 — Night Shift

## Scope and current state

Local branch `codex/night-1`, from `d1ea19f`. No merge, push or deployment. No new dependency, AI role, Builder model, runtime or permission profile. The three real drafts are not queued and no real Night task has run.

## Reliability

BUG-1 retained the ancestry-validation error but not its offending PID/parent row. The reproducible race is a non-atomic process census: a parent exits before its already-exiting child is recorded. The fix omits only a child proved dead after reparenting to PID 1 and proof that its original parent died. Live, unreadable, changed-birth or conflicting identities still fail closed. Root ownership and pre-signal checks remain strict.

The strict helper passed 100 chat-server launches with 50 immediate retries, 50 review-ready fixture tickets and 513 kernel birth records. These are real owned processes using a fixture Codex protocol, not 100 model calls. See ownership-stress.json. Future failures retain sanitized kernel diagnostics.

Full-suite testing also exposed buffered callbacks advancing after stop and command/permission startup frames losing their chronology. Focused failing regressions now prove the stop fence and chronological queue; raw bounded logs and cleanup remain available, without granting permission. Fresh human recovery after night expiry uses ordinary passkey authority; account backoff cannot claim that authority or reset the allowance.

Pyright now receives the frozen export root (and BASE src layout if present) as explicit execution environment / extraPaths. Three added test files import the root module correctly; a planted real type error still fails. This is a documented gate-configuration correction, not a change to recorded verdicts.

## Scheduling and consent

- Default local window 01:00–07:00; 300,000 reported tokens shared by the shift, plus existing 120,000 Builder / 40,000 Test Writer, 80-command and 15-active-minute ticket limits.
- Each Do tonight action consumes a separate current passkey confirmation bound to exact draft/version/request, canonical repository/HEAD, approved playbook/hash/approval, budgets and absolute cutoff. It authorizes only one delayed Start, never Keep or broader permissions.
- Existing serial ticket queue and protected checker/sealing path. No scoring in the scheduler. Results wait for human review.
- Positive AC only; recorded owned caffeinate helper only during a shift. Cutoff, power loss, sleep/pause, STOP ALL, tripwire, unknown cleanup, exhausted allowance or unknown usage stop the shift. Mid-work restart never silently resumes consent.
- Structured provider account limits alone get bounded backoff: 60, 120, 240, 480, 900, 900 seconds, then stop. It revalidates the same consent and keeps cumulative usage.
- Morning results and usage freeze in the end event. Later daytime retries cannot rewrite them. Optional fixed-text macOS notification is off by default. Workshop sign and Replay last night use recorded shift/ticket events and the existing SSE stream.

## Simulation and prepared real drafts

Isolated TEST simulation: three sequential tasks; two VERIFIED, one PASSED WITH GAPS; 3,000 fixture-reported tokens; all three ready_for_review; zero Accept/Keep decisions. This is scheduler integration evidence, not a real AI build. See simulation.json and the labelled screenshots.

Prepared through the normal read-only chat drafter on research-router:

1. Clarify local file requirements in README — `dc7cddb1-21e2-434a-a52f-de523f3f42ac`.
2. Clarify doctor subcommand description — `786722c8-a3ea-4f63-847b-766a184ae11e`.
3. Explain source relevance argument in help — `de080c22-9022-47ac-af95-aa6b8f2e3ff9`.

Source HEAD and dirty-state fingerprint were preserved. Choose your window in Settings, then Do tonight and Touch ID separately for each. Do not use Start for scheduled work. Nothing starts from preparation alone.

## Verification

Final standalone suite: **1,189/1,189 passed**, no failures, skips or cancellations; 352.095 seconds. Typecheck and production build passed. Final machine-readable results: validation.json. Historical verdict replay compares the actual fbad889 implementation on frozen facts: 61 comparisons, zero differences, with the same four older missing-fact events explicitly unavailable. No stored verdict or original golden file was changed. The current protected probe exceeds the requested 69 paths: 74 paths, eight decision endpoints, two signing-helper calls, plus owned Git/SQLite/write checks. All twelve negative controls must remain non-PASS.

Earlier full-suite runs found schema-fixture inventories, the too-broad first ownership patch, a post-stop callback race and startup frame chronology; those failures were retained and fixed with regressions. A final release run overlapped the real probes and hit the 450ms timeout fixture; its independent recheck passed unchanged. Final clean-run status is recorded in validation.json, without suppressing that failed run.

## Backup, UI and review

Private SQLite backup and restored-copy identities match for all 58 tables, including passkeys, approvals and stored evidence. No key files are copied into public artifacts. Owned coordinator activation succeeded: migration 21, zero broken seals/errors, 19 honestly unsealed older checks and no new production seals. Desktop/390px screenshots use the three real unstarted drafts; simulation screenshots are explicitly labelled. Browser verification uses isolated Playwright MCP sessions and does not press a decision button.

Manual diff review: no new verdict authority, network permission, blanket approval or automatic Keep. Security scanners found only reviewed content/path hashes and unchanged synthetic redaction fixtures; no new credentials. Logs and backups under .work remain private and ignored.

## Limits

No actual overnight run or physical unplug/sleep/power-loss test has occurred. Those conditions were simulated. The coordinator must already be running and the Mac awake to begin: this version does not schedule an OS wake. A missed window expires. Monitoring is once per second, plus bounded cleanup time; reported provider usage can arrive late, so reservations and existing task budgets supplement the shared limit. Missing usage stops and appears as unknown. Native notification delivery depends on macOS permissions. Scheduling is from the Mac with Touch ID; real phone scheduling was not added or tested. BUG-1’s exact historical PID race remains unreconstructible because its original row was not retained.
