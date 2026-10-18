# Unfoolable handoff

## Current state

Personal local Mac app; repository remains `command-center`. UI-4 is the Hallmark light/dark interface. A request becomes a reviewed draft, then an isolated Codex build, protected checks and at most two fixes, then an explicit human decision. Existing tests and project checks are authoritative within their documented limits; the Test Writer is advisory. Older Mission orchestration and visual experiments remain in Labs, not the default screen.

`main` was fast-forwarded from Breakout 0 to `2a6e939`, preserving history. Tag `v0.1.0` marks exactly that UI-4 commit. Later local cleanup WIP commits advance main. No push, merge commit, deployment, branch deletion or new paid API. Two older branches are not ancestors: `codex/glass-main`, `codex/verification-v1-scoping`; leave them alone.

Application behavior, Builder model/runtime, sandbox, checks, Touch ID and decision policy are unchanged by cleanup. Builder remains codex-cli 0.160.0 / gpt-6.1-sol, using the existing ChatGPT entitlement. Do not change them as incidental cleanup.

## Run

Repository: `/Users/jeshwanthsingh/Projects/ai-lab/command-center`.

```sh
cd /Users/jeshwanthsingh/Projects/ai-lab/command-center
unfool
# Repository-local equivalent: ./cc chat
```

Local screen: `http://localhost:3225/`. The launcher supplies the private operator capability without printing it. Do not paste it into chat or Git. Use localhost for the registered passkey. `./cc stop-all` stops owned work without Touch ID; resuming/deciding still needs the human.

Current machine settings: `.work/ticket-loop-v1/ACTIVE.json`; live data: `.work/ticket-loop-v1/app-data`; database: `command-center.sqlite` there. Defaults can be overridden by `COMMAND_CENTER_PORT`, `COMMAND_CENTER_DATA_DIR`, and JSON `COMMAND_CENTER_PROJECT_ROOTS`. Preserve the existing LIVE data marker and human records. Tests must never use this live directory or a fake authenticator there.

The real UI-4 ticket `e4f4596f-7d5e-4d88-8952-2e321f3621d8` (“Clarify source platform option help”) was left at ready_for_review, PASSED WITH GAPS; no Accept/Reject was made. Its source checkout was dirty, so existing clean-copy behavior was used. Do not decide it on the owner's behalf.

## Test

Use pinned Node 24 in this shell; do not replace other projects' runtimes:

```sh
export PATH="$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH"
mkdir -p .work/tripwires/native/owned
TMPDIR="$PWD/.work/tripwires/native/owned" npm test
npm run typecheck
npm run build
```

Run HTTP/process tests outside an enclosing sandbox, with appropriate Codex escalation when needed. Preserve assertions, timeouts and process-ownership checks. UI-4 passed 976 tests; cleanup adds one Node wrapper covering six isolated Python backup-helper tests. See `artifacts/cleanup/full-suite.json` for the fresh final result.

Repeatable security evidence:

```sh
node scripts/read-guard-run.ts after
node scripts/oracle-negative-controls.ts .work/negative-controls-new-run
python3 -I tests/backup_helpers_test.py
python3 scripts/backup.py status
python3 scripts/backup.py restore --output "$PWD/.work/new-restore-proof"
```

Use a fresh output directory. The regular read probe writes its own ignored artifacts; cleanup also checked the late-created repository and both backup paths (67 targets total). Twelve negative controls must all stay non-PASS. Stop if a negative control unexpectedly passes. Never weaken a grader to finish a task.

## Backups

Litestream 0.5.17 continuously copies SQLite locally; an idle five-minute job makes complete file/database checkpoints. Friendly location: `~/UnfoolableBackups`, linked into already-denied `~/.config/unfoolable/backups`. Both user LaunchAgents survive login. Configuration, service controls, restore steps, retention and limits: [BACKUPS.md](docs/BACKUPS.md). There is no cloud destination or charge.

Do not delete `.work` wholesale: it currently contains live data and installed verification tools. Do not overwrite live data to test recovery. The offline proof compares restored public passkey records, approvals, event data and proof files; it does not export the hardware private key or simulate a human's Touch ID.

## Open issues and limits

- Latest writer study confirmed only 2/11 correct changes; historical study 1/6. It stays advisory. Zero false accepts includes abstentions, not universal detection.
- Deliberate in-process framework/instrumentation or observation-channel forgery remains a residual risk. This is not VM containment. Tripwire logs are best effort.
- Older failed drafts can clutter the screen. Full freshness/diff risk is rechecked in Proof and before a decision; the light list is recorded status.
- The general reported browser freeze was not reproduced. The real read-only drafter startup failure and synchronous Ask delay were reproduced and fixed.
- No complete manual VoiceOver/WCAG audit. Existing secondary-screen build chunk warnings remain.
- Same-disk backups do not protect against device loss. Files wait for idle, and a moving application can delay a complete checkpoint. A restored public passkey record still needs the original authenticator; replacement-device recovery is not proven.
- Older research/design documents describe historical limitations. Prefer current source, current tests and dated result reports over treating every old note as current behavior.

## Next three rounds — planning only

1. **Daily-use/accessibility cleanup:** reproduce failed-draft recovery friction; keyboard/VoiceOver review of real states. Preserve all decisions and check semantics.
2. **Recovery hardening:** human-confirmed restored-copy Touch ID exercise; scheduled restore checks and an owner-approved off-device backup option. No cloud purchase implied.
3. **Evidence Receipt:** the previously deferred receipt, bound to exact code/checks/gaps and the owner's decision. No new automatic approval or new AI role.

These are proposed follow-ups for owner review, not authorization to implement them during cleanup.
