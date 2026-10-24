# Urgent Workshop repair

## What was wrong

1. The nine original CC0 PNGs were already tracked in Git and copied by Vite. The production static allowlist did not serve /workshop-pixel/. Real browser GETs returned 404.
2. After serving them, the real production browser exposed two more initialization failures: Pixi's default shader generation wanted eval, and its image loader wanted a blob worker. Strict CSP correctly denied both. Previous visual tests did not exercise this production policy.
3. The exact “can't start tasks” sentence was used for a missing/invalid per-tab operator capability, even while the coordinator was healthy. No key means no SSE and no private tickets. `unfool` successfully reused the existing healthy server and opened a connected window; it does not connect a different browser/tab automatically. The screenshot supplied by the user alone cannot distinguish a missing key from a rejected key.

## Initial checkout and process

Initial clean checkout: codex/rules-1, d44ca83. Main remains 6a49b3d and contains a776cd8 (Night Shift). d44ca83 is NOT merged into main. Repair branch: codex/workshop-repair, from the inspected checkout; no branch was merged.

Port 3225 initially belonged to owned Node PID 60716, working directory /Users/USER/Projects/ai-lab/command-center, launched by scripts/local-coordinator.ts. Its kernel start time was October 20, 2026, 4:41:02 PM PDT. Reflog puts HEAD at 8077611 then; the process did not record source provenance, so exact loaded uncommitted bytes cannot be proven retrospectively. /api/health reported coordinator online, database ready, schema 21. The old server was not dead.

Full `unfool` stdout, before and after, was exactly:

```
Unfoolable: http://localhost:3225/?view=chat
```

No stderr. See unfool-before.log, unfool-final.log and restart.log.

## Backup before restart

First, a read-transaction-consistent SQLite safety copy was created in ~/.config/unfoolable/backups/urgent-workshop-20261020.sqlite and verified against all 58 source-table digests. The user's active README task was left running; it naturally reached ready_for_review.

Then a fresh complete Litestream/file checkpoint was created: snapshot-20261021T031812Z-a3d43822.tar.gz in ~/UnfoolableBackups (the existing protected symlink). It was restored to a new isolated .work/urgent-workshop/restore folder. All 58 table digests and 212,999 file digests match; SQLite integrity is ok, foreign-key errors 0, passkeys 1, ticket events 1,339, event-chain head matches. Playbook approvals and proof files are included in the verified file manifest. No restore was activated over live data. Retention was overridden only in this backup caller to preserve every prior archive. No data was deleted or reset. See backup-proof.json. Backup/restore private contents remain ignored and uncommitted.

## Narrow fixes

- Only the nine exact known PNGs are served, with image/png and revalidation. Unknown files, art source scripts, traversal and symlink escapes remain refused.
- A build guard verifies every required PNG and its signature; tests remove each required file in turn and prove the guard fails. No dependency or lockfile changed.
- Pixi's existing pinned `pixi.js/unsafe-eval` entry point is used: despite its name, its implementation replaces generated shader code with static functions. No unsafe-eval permission was added. Optional worker-based image loading is disabled. CSP is unchanged.
- Missing local connection now says “This tab isn't connected. Run: unfool and use the window it opens.” No auth, passkey, approval, scoring or Builder policy changed.

Each actual fault was reproduced before fixing: test-before.log (PNG route), connection-before.log (message), browser-trace.log / csp-before.log (eval), worker-before.log plus the observed blob-worker CSP console error (blob worker). Final browser console has zero errors.

## Owned restart and browser proof

Each restart required the verified full restore and no queued/building/checking/fixing ticket, verified PID plus kernel birth/group/session identity, used existing reconcileOwnedProcesses and ensureCoordinator controls, and compared ticket/draft/passkey digests across restart. Final coordinator PID 38910 launched from clean code commit 992e51f. Its directory is the same repository. Schema remains 21. See restart.json and restart.log; first restart proof is retained separately.

Playwright MCP used an isolated browser with the existing local capability, not a fake session or production decision bypass. Final: SSE /api/desk/events 200, 12 real tickets, one canvas, room plus Builder/Grader/Test Writer/Owner visually inspected, all six Pixi PNG GETs 200. Replay uses real ticket 6647cc2d-6199-40be-be33-35eae3e2b609: Builder moves from x=110 to x≈125 and activity changes from idle to inspect; camera follows recorded stages. No ticket was built or decided by this verification. A deliberately disconnected test tab shows the new message and no private tickets (the picker has only its empty placeholder).

Screenshots: before.png, after.png, replay-1.png, replay-2.png, disconnected-tab.png. Browser proof: browser-proof.json. To use the real app, run unfool and use the connected window it opens, then click Workshop. A clean URL pasted into another browser/tab does not carry its private connection.

## Night Shift

All three original draft records survive. dc7cddb1 (README local-file guidance) was already STARTED and its ticket is now ready_for_review; it is not an unused draft anymore. 786722c8 (doctor help) and de080c22 (source relevance help) remain unarchived DRAFTs. Their dry-run eligibility was checked with the actual approved playbook on an isolated database copy. Both pass for October 21, 1–7 AM PDT, 300,000 total shift tokens. Night entries remain zero; nothing was queued or approved. Your Touch ID, the Mac remaining on AC power and the coordinator staying running are still required. See night-preflight.json.

## Validation

PNG/launcher/static regressions: 22 passed. Additional final image/CSP regressions: 5 passed. Guarded production build and typecheck pass; all nine build images present. Golden replay: 61 comparisons, zero differences. Final full suite: 1,200 / 1,200 passed, zero failures/skips/cancellations, 375.484 seconds (validation.json). The only changed existing backend file is the static asset allowlist; grader, scoring, sandbox, permissions, passkey and decision sources are unchanged. No new dependencies, AI calls, merge, push or deployment.
