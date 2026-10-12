# Round 3 — Watchman, action budget, STOP ALL

PASS. Branch codex/watchman, based on 247cb31. Local WIP commits after each step; no push, merge or deployment. Model/runtime and read/network boundaries unchanged. No real approval or Keep/Discard was recorded.

## Verification

- Final frozen-source full suite: 819/819, zero skips, 259.972 seconds. Typecheck and production build pass.
- Twelve unchanged negative controls: 12 expected results, zero PASS.
- Real 65-path read probe: zero readable protected paths; owned Git status/diff/log, SQLite temp files and writes all work. The new-repository path was created after thread start.
- Native normal fixture ticket: ready_for_review, zero denials, 3 commands, 33,300 reported tokens, zero fixes. Only deterministic fixture behavior was checked: PASSED WITH GAPS, not a claim about a production repository.
- Planted provider: actual installed Codex sandbox returns eleven permission denials; production supervisor stops the ticket at Needs You. No Candidate/checks. Cleanup certified. This is a deterministic provider fixture with real native sandbox effects, not model-generated evidence.
- Under/over command, minute and token limits tested. A real native diagnostic also stopped at 105,192 reported tokens, preserving evidence and certified cleanup.
- STOP ALL tested during Builder and protected-check execution. Actual chat button pressed with one running and one queued ticket; both stop, owned processes gone, no passkey required. Unconfirmed Retry rejected; safe same-Candidate Recheck can resume after confirmation. FIFO remains one active ticket.
- Desktop/390px chat and ticket screenshots reviewed; no horizontal overflow at 390px. CLI stop-all tested on isolated localhost data.

## Defaults and limits

80 Builder command invocations, 15 active minutes, 100,000 reported Codex tokens. Watchman pauses above 10 observed blocked invocations. Each fresh passkey-confirmed Retry starts another accounting window with the same limits. Unknown token usage is never zero and prevents production Candidate freezing.

Counts cover observable command results, not hidden system calls or errors swallowed inside a command. Provider token reports arrive in batches, so a final batch can overshoot the cap. Existing macOS tripwire logging remains best effort; enforced filesystem/network denial is unchanged.

## Review findings and diagnostic failures

The first probing prompt was refused by the normal Builder. Later model diagnostics claimed invocations without structured command evidence; those claims were ignored, and no passing Candidate was inferred. The deterministic native provider proof replaces that unreliable diagnostic, and no diagnostic-only production function remains.

A protocol test fixture emitted interruption after completion; corrected in the fixture. A browser fixture's initial 10-second deadline expired before attachment; the interactive fixture alone received 90 seconds. Production limits stayed unchanged.

One intermediate suite saw “Protected evaluator changed” and STALE because checker-related source was edited while it ran. No assertion was weakened. The source was then frozen and the fresh 819-test suite passed.

Review also closed pre-stop admission races and separated safe queue pause from uncertain cleanup. Uncertain ownership still blocks execution; PID/start-time requirements remain intact.

## Evidence

normal-ticket.json; native-denial-proof.json; probing-initial-refusal.json; probing-budget-stop.json; probing-ticket.json; after-probe.json; negative-controls.json; tests.txt; build.txt; ui-stop-proof.json; ui-stop.txt; chat-desktop.png; chat-mobile.png; ticket-desktop.png; ticket-mobile.png; stop-two-tickets.png; credential-scan.json; server-cleanup files.

All temporary fixtures are under the ignored .work tree or the previously approved ~/.cc-work namespace. No new dependencies, paid APIs or production repository edits.
