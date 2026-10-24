# Jarvis thin foreman v1

## Result: PARTIAL

All seven implementation steps are present on `codex/foreman-v1`, based on `c80aa74`. The real-ticket requirement is blocked; no unchecked Candidate is described as ready. Seven numbered WIP commits were made, followed by narrowly tested robustness fixes and this evidence commit. Nothing was pushed, merged or deployed.

## Open

```sh
cd /Users/USER/Projects/ai-lab/command-center
./cc chat
```

Server remains on http://127.0.0.1:3225. `./cc chat "what's running?"` submits a message only; it never makes a decision. The authenticated browser opening uses a fragment removed immediately.

## Built

SQLite16 stores append-only messages, versioned drafts, one-shot exact-item cards and a deduplicated event cursor. Only draft creation uses a fresh read-only pinned Codex session. Status, ticket updates and post-Keep instructions are code. One question maximum; explicit Start required. Start and ticket insertion bind atomically in SQLite. Stale or already-resolved buttons reject. Safe buttons reuse existing ticket, evidence, playbook and generation/transport permission fences. Fuel is a cached/coalesced read of account/rateLimits/read, with unknown on failure. Existing explicit trusted ticket CLI commands remain available. No new AI product role, planner, Workshop visuals, dependencies or billing.

Keep instructions name the actual source repo/local cc branch, shell-quote inspection and manual merge commands, and never merge automatically. This is covered by tests; the real ticket was never kept.

## Verification

- Full release suite: **735/735**, zero failures/cancellations/skips, **174.626s**.
- Strict typecheck and production build: PASS.
- All12 unchanged protected negative controls: non-PASS (FAIL or INCONCLUSIVE), zero malicious PASS.
- Desktop1440/mobile390, keyboard, reduced motion, Edit/Cancel, no automatic Start, truthful status/fuel, persistence after server restart: PASS.
- Actual read-only profile probe: own workspace read allowed; source/private data reads denied; writes denied, no sentinel created.
- Credential scan of added diff/artifact text: zero findings.

## Real chat run

Typed exactly:

> In research-router, add a top-level research --version option that prints the package version and exits successfully without needing configuration, network, or state files. Add focused tests and preserve existing commands.

Draft: **Add top-level research --version option**, repository research-router, zero clarification questions. Request/done criteria and provider usage are in `real-chat-draft.json`. Explicit Start created ticket **e56f790f-beb4-4c80-8bee-88bd26aa75eb**. Your approved playbook hash `12ce997a18dece8699f9959f2fc432086c5d213a159eb8f663695d5b64369133` was applied through the bound chat approval card. BASE admission passed.

Final: **harness_error / NOT CHECKED**, three startup attempts, zero correction attempts, no frozen Candidate. Source HEAD, status and full binary diff were unchanged after every run. Keep/Discard are untouched.

The first two failures appeared as protocol timeouts. A deterministic regression proved the existing supervisor could mask a prior error while waiting for its pending RPC. The narrow correction cancels pending RPCs and preserves the original failure; model, profile, ownership checks, network and deadlines remain unchanged. All18 supervisor tests pass. The explicitly approved final Retry exposed **Kernel process ownership could not be recorded**, with cleanup verified. No further Retry or unidentified-process kill was attempted.

## Draft usage

| Draft | Input | Output | Total | Outcome |
|---|---:|---:|---:|---|
| Browser verification draft | 6942 | 98 | 7040 | Edited, cancelled; never started |
| Real research-router draft | 7077 | 125 | 7202 | Started, later blocked by harness |

Independent read-only runtime smoke draft:5598 input+108 output=5706 tokens (not a persisted user draft). Provider totals only; cached-input metric unavailable. Fuel reads and status answers make no model calls. No new paid API billing was enabled.

## Remaining uncertainty

The exact transient live-PID identity gap remains unresolved. Protocol-only probes succeed, but production correctly stops when kernel ownership is uncertain. A next bounded investigation should reproduce that race and improve identity collection without weakening birth/group checks or continuing unidentified execution. This is a real-run blocker, not a passed code result.

Evidence: `verification.json`, `negative-controls.json`, `runtime-proof.json`, `browser-results.json`, final desktop/mobile screenshots, `real-run-summary.json`, `source-unchanged.json`, `code-review.md`. Detailed logs/owned probes remain under repo-local `.work/foreman-v1/`; no important work lives only in /tmp.
