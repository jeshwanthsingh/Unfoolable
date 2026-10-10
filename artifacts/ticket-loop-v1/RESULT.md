# Ticket loop v1

Branch: codex/ticket-loop-v1, based on 034c280 (verification-v1).

## Built

Steps 0–9 each have a local WIP commit. Migration 15 adds tickets and immutable, typed, monotonic ticket_events. Input and BASE bindings are immutable. One durable FIFO uses the existing single-coordinator database lock. Fresh pinned plain-Codex sessions build/fix in owned private-clone worktrees without a planner. Freeze is one commit on original BASE. Checker verdicts are independent of Builder prose.

Fix 1 starts at failed Candidate; fix 2 starts at clean BASE with both failure summaries. Two failed fixes require the user. Harness errors remain separate from code FAILED. Restart marks mid-build/check/fix interrupted and does not auto-resume. Cleanup requires recorded process birth/group identities; uncertainty blocks dispatch, never kills unidentified processes. Explicit Retry is required.

CLI: ./cc ticket new "request" --repo PATH; list; show ID [--open]; keep ID; discard ID; retry ID; stats. Ticket API has a private local operator capability in the data directory, protecting decisions even from loopback-capable verification code. The UI shows the list, recorded timeline, checks/gaps, diff and explicit decision controls. Keep creates cc/ID, never checks out, merges or pushes. No decision was made for the real tickets.

## Step 0

BASE-failing project recipes are not applicable regression guards; newly satisfied is informational. Non-loopback OUTBOUND remains denied. The additional wildcard-server en0 inbound probe succeeded. Labelled residual risk: **wildcard bind allowed; inbound exposure limited to test duration**. HOST/BIND_ADDRESS=127.0.0.1 is advisory, not an enforcement boundary. See STEP_0.md and step-0-network.json.

## Verification

- Fresh full suite: **668/668 passed**, zero failures/skips/cancellations, **173.731 seconds**.
- Typecheck: exit 0. Production build: exit 0.
- 12/12 existing negative controls non-PASS, zero malicious PASS; saved core identity unchanged during controls.
- First full suite: 667/668; one old health assertion expected schema14. Updated only the expected additive schema version to15, then reran everything.
- Tests include exhaustive state edges and explicit decisions, migration, append-only enforcement, FIFO/single dispatch, interrupted build/check/fix recovery, clean-BASE second fix, bounded correction, harness errors, automatic stats and API permission/Keep safety.
- Production browser: list/detail/timeline/diff, explicit decision controls, keyboard focus, reduced-motion emulation, 1440px and390px with no horizontal overflow. No Keep/Discard clicked.
- Real coordinator restart: both ticket IDs, BASEs, Candidates, phases, verdicts and metadata unchanged; no auto execution or decision. RESTART.json.
- Basic credential scan: zero findings. No new dependencies, billing, push, merge or deployment.

## Real runs

Both tasks are from the original candidate list and were not used in graded benchmark runs. R5 was used in an earlier non-benchmark experiment; that is disclosed. C2 is the unused tracker-header task. Builds read committed BASE, not dirty source modifications.

| Ticket | Verdict | Fixes | Submit to review | Agent work | State |
|---|---|---:|---:|---:|---|
| R5 research-router: oversized since durations | PASSED WITH GAPS | 0 |145.886s|67.299s|ready_for_review|
| C2 career-ops: reject invalid destination headers | NOT CHECKED | 0 |230.776s|84.103s|ready_for_review|

Research-router gap: advisory task checks not requested, original intent not automatically proved. Protected existing tests and applicable project recipes passed; BASE-failing recipes stayed non-applicable. Candidate-added/edited tests are not authoritative. Career-ops gap: custom MJS runner unsupported, no protected checks executed. It is not claimed as verified. Both had zero Needs You stops and no recorded decision. Both source HEADs, indexes and dirty status are identical before/after; source contents were not broadly scanned. Worktree isolation and automated fixture tests separately prove no source tracked-file mutation during normal build/Keep.

Builder reported SQLite fixture-access and Git diff sandbox denials in research-router; protected checks ran independently and passed. Some short-lived process inventory races emitted diagnostics; retained cleanup certification, no relaxed ownership rule. An extra restart probe initially used macOS /usr/bin/python3 and met an Xcode-license requirement; rerun used already-installed Homebrew Python. No system license/config changed.

## Fuel probe

Pinned codex-cli 0.160.0 supports account/rateLimits/read. Probe returned ordinaryUsageAllowed=true, primary usedPercent=52, windowDurationMins=10080, resetsAt=1791948747, secondary=null; spendControlReached=false and rateLimitReachedType=null. Credits have hasCredits=false, balance="0"; three free reset credits were available. Account/reset identifiers are redacted in FUEL.json. No reset, purchase or model turn was performed. Usage is a timestamped snapshot, not a live gauge.

## Review / remaining limits

Code review found no remaining blocker for the requested local loop. Existing Mission screens remain experimental; no new AI role, planner stage or Workshop redesign was added. Review is not a proof of new intent: PASSED WITH GAPS and NOT CHECKED must remain visible when deciding Keep. Career-ops needs a separately scoped protected runner before its behaviour can be independently checked. Runtime work and credentials remain ignored under .work; losing the local data directory loses pending tickets. Do not rerun ticket-real-run.ts casually: it submits new tickets.

Next: use the two pending reviews, then add coverage for an actually needed unsupported runner rather than more orchestration.
