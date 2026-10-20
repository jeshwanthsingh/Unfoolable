# BUG-1 — Bug from this log

Implemented on `codex/bug-1`, from `3cc96e5`. Code measured at `9f8f5696ec669251acd85d5b1b73f5d2d07dd760`. Local commits only; no push, merge or deployment. The normal owned localhost coordinator was restarted after testing.

## Key revocation

Read-only production audit found zero signatures from the old `fc261d6df296` software identity (zero production seals total). It is REVOKED: status overrides the retained historical metadata dates, so **no timestamp is accepted**, including a forged backdate. Eight key-history tests pass, including four revoked-time cases. The hardware key remains current. Older backups cannot forge seals accepted by this verifier, but still contain other sensitive data and older code; see BACKUPS.md.

Activation: migration 21, 19 older unsealed check events, zero broken seals/errors. A protected SQLite snapshot was verified by all-table digests and integrity/foreign-key checks before restarting the idle, PID/birth-recorded coordinator.

## Implemented path

Ask traceback or `./cc bug <file>`; 19,000-byte bound; ANSI stripping; existing local Gitleaks and detect-secrets scans before storage/model input. Detected lines are redacted wholesale. Scanner failures reject intake. Start still requires the normal exact-item passkey.

A fresh reproduction session can read BASE but write only its one test file and disposable runtime directory. The native protected runner uses a separate read-only BASE export. Admission requires exactly one errored test with the matching exception type, literal message and project file/function/line. No match means no fix session. The admitted code and BASE report are hash-locked outside Builder access.

A fresh fix session starts from untouched BASE and is told the reproducer is already locked. It does not need duplicate reproduction tests. Existing protected tests/recipes/gates still run. The exact locked test runs against the frozen Candidate; explicit pure-core reproduction facts cannot improve an existing failed guard. Changed/missing locked artifacts block Accept; Recheck never rebuilds. Fixed display events follow a persisted sealed passing check. Workshop scroll/jar/stamp and Proof use those real events.

## Five-case final measurement

Four actual seeded faults plus one deliberately unreproducible report, using the real pinned Codex runtime and ordinary protected checking in **isolated TEST data**. Existing 120,000 Builder / 40,000 Writer token limits stayed unchanged. No production approval was fabricated, no source repository outside the safe fixture was changed, and no result was accepted/landed.

| Case | Reproduced | Outcome | Builder / Writer tokens | Time |
|---|---|---|---:|---:|
| B1: Zero-count division | Yes | Fixed; passed with gaps; sealed | 62,069 / 7,735 | 129.3s |
| B2: Empty-list first item | Yes | Fixed; passed with gaps; sealed | 61,824 / 7,636 | 150.4s |
| B3: Missing record name | Yes | Fixed; passed with gaps; sealed | 68,776 / 7,683 | 138.7s |
| B4: Invalid integer text | Yes | Fixed; passed with gaps; sealed | 69,095 / 7,853 | 122.8s |
| B5: Unreproducible RuntimeError report | No | Couldn't reproduce; no fix attempted | 27,944 / — | 28.6s |

Totals: **4 reproduced, 4 fixed, 1 honest non-reproduction, 0 false fixed**. “Fixed” is the observed trigger passing its locked reproducer and separate truth check, not an exhaustive guarantee. All four remain **PASSED WITH GAPS**, not VERIFIED. Their exact retained gaps are: Test Writer is advisory-only; OSV is not applicable because this dependency-free fixture has no supported lockfile. B5's proposed test was inadmissible; it never reached a fix session.

The separate post-freeze truth checker judged each fixed function's expected output PASS. The four check events were sealed and replay successfully. `new-bug-verify.txt` records the actual `./cc verify` result for B1, Event 150; this is a TEST signing key, not a manufactured production hardware seal.

## Earlier evidence, retained honestly

The first full measurement reproduced four but fixed zero: one process-ownership guard failed closed; three fixes added duplicate tests, which hit the existing Pyright root-import diagnostic and then exhausted their correction budgets. All of that evidence remains in `study-summary.json` and `initial-ui/`. A separate test-package-marker probe did **not** solve the Pyright diagnostic; the quality runner was not changed or weakened.

A failing regression exposed the missing reproduction-to-fix handoff. The sole correction tells the new fix session that its independent test is already locked and requests source changes only. All five cases were rerun; their fixture source, requests, expected outputs, gates, admission checks and budgets were unchanged. The earlier exploratory run stopped while source was still changing is separately marked VOID_DEVELOPMENT_VERSION, with verified owned-process cleanup.

## Verification

- Full suite: **1,150/1,150**, 0 failed, cancelled or skipped; 397.262 seconds under caffeinate.
- Strict TypeScript and production build: PASS. Existing bundle-size/Pixi chunk warnings remain.
- Real Codex + identical kernel profile: **74 paths unreadable**, both signing helpers uncallable, six sensitive endpoints denied. Owned Git/status/diff/log, SQLite temp and file writes work. The new locked reproduction store was included. Relevant permission/runner source hashes are identical to the final version; the fresh full suite also exercises the stricter reproduction profile.
- Twelve established negative controls: all expected non-PASS; none changed.
- Frozen comparison against actual fbad889 behavior: **61 comparisons, zero verdict/trace differences**. No old record or golden was rewritten.
- Fresh exact-wrapper `./cc verify` on a new seeded ticket: sealed, same replay, intact chain. Production `verify --all`: zero broken; 19 older checks honestly remain unsealed.
- Official Playwright MCP: desktop 1440px and phone 390px card/Proof/Workshop captures; no horizontal document overflow. Screenshots manually inspected. Read-only previews use real stored study events and production components; decision controls are intentionally unavailable there.

## Boundaries and remaining limits

- Initial reproducible-signature support is Python unittest with an ordinary unconditional test. Other runners, dynamic messages/frames and complex test setup can stop as not reproduced.
- Static shape screening is a tripwire. Arbitrary Python interpreter/observation forgery remains the previously documented residual risk; this round does not claim a complete malicious-code authenticity boundary.
- A reproducer covers its observed trigger. Gaps are retained and human Accept/Reject, look-before-accept and Touch ID are unchanged.
- The first run's transient kernel ownership failure remains an observed reliability issue; cleanup was verified and execution stopped. No ownership fallback was weakened.
- The existing Pyright root-import issue remains for duplicate newly added tests in this fixture. It was not suppressed, reclassified or globally fixed to change verdicts.
- Secret scanners cover their known patterns, not every possible confidential value. Raw intake scratch files are protected and removed.
- Zero new dependencies or paid APIs/billing. Same pinned Builder model/runtime and existing entitlement.

## Artifacts

`bug-card-1440.png`, `bug-proof-1440.png`, `bug-workshop-1440.png`, and matching `390` images; `final-study/study-summary.json`; initial `study-summary.json`; `validation.json`; `after-probe.json`; `negative-controls.json`; `golden-replay.json`; `full-suite.txt`; `new-bug-verify.txt`. The measurement harnesses are retained separately and are never run by the ordinary test glob.
