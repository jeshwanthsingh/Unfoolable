# UI-4 — reliability, speed and clarity

Implemented on local branch `codex/ui-reliability`, from Unfoolable `0bf21c7`. Source tested at `639dcecd173c732b441f368a35c748726c8c388f`; the final documentation/evidence commit does not alter that source. No push, merge or deployment. No new npm dependency or paid API.

## What changed

One command, `unfool` (or `./cc chat`), now starts/reuses the local coordinator, serves the screen and event stream, and opens the private browser. Plain errors no longer masquerade as clarification or failed decisions. Ask acknowledges quickly; cancellation hides immediately but still requires the existing Touch ID confirmation before being permanently saved.

The main screen uses one authenticated SSE connection, small summaries, cached on-demand Proof, stable row identities, timestamped offline recovery, keyboard submission, system appearance, distinct accessible marks, whole-word title previews, and grouped/paged searchable task lists. Full technical records remain in Proof. `BUGS.md` maps every regression batch to its failing/passing tests.

The real drafter startup defect was its empty cwd inside the denied Projects tree. Only that read-only empty cwd moved to the approved ~/.cc-work area. Its read-only/no-network policy and Builder model/runtime are unchanged.

## Measured traffic and stability

| Measurement | Before | After |
| --- | --- | --- |
| Idle API requests | 45 in 10 seconds, including 35 full details | 0 in 120 seconds after the single stream connects |
| Open a ticket Proof | Previously preloaded every ticket | 1 request; cached reopen 0 |
| Idle animation frames | Not measured | 0 over 120 seconds |
| Scroll/focus stability | Reported jumps | Stable over 120 idle and 120 running seconds |
| 50/500 task rendering | Unbounded list/details | First 25 rows per group, searchable; real 500-row server test passed |

Durations differ deliberately; no baseline extrapolation. Actual protocols: `before-requests-verified/`, `browser-verified/`, `stability/`. `browser-metrics.json` collects the measured values. The intermediate browser script had test-harness locator/smooth-scroll-baseline mistakes; corrected stability and final real-flow runs completed. Console review found no AbortError or uncaught-error lines in the saved reviewed scopes.

## Verification

- Full `npm test`: **976 passed,0 failed,0 cancelled,0 skipped**,341.428 seconds. Source SHA 256 unchanged during the run; see `full-suite.json`.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing secondary-tool chunk-size warnings remain.
- Final review regressions:13/13; earlier focused run 36/36. Failing logs precede fixes.
- Official Playwright MCP: final real task Proof/file review at 1440 px and 390 px, light and dark; no horizontal overflow; stopped before final Touch ID.
-65-path real Builder probe:0 readable protected targets. Own Git status/diff/log, SQLite/temp and writes passed. Cleanup certified.
-12 negative controls:5 FAIL and 7 INCONCLUSIVE;0 PASS.
- Protected offline Gitleaks scan:0 findings. Temporary private browser init removed; test-only listeners stopped after PID/start-identity checks. Live app 3225 left running.

## Real task

Ticket `e4f4596f-7d5e-4d88-8952-2e321f3621d8`: “Clarify source platform option help”. Your Touch ID Start was confirmed. It reached ready_for_review in about 3 minutes 20 seconds with no correction, changing only `research_router/cli.py`. Frozen commit `c8ba349fe00655f74c718736dc4adf03992d95e5`.

Result **PASSED WITH GAPS**, no failed checks. Gaps: the Test Writer is advisory; regression checks do not independently prove the requested wording; OSV had no supported lockfile. The source checkout was dirty, so existing clean-copy behavior protected it. Accept/Reject were never clicked; no final confirmation was created.

The original --tags request was my selection mistake. The corrected --platform task was explicitly approved before resubmission. Earlier failed drafts remain visible rather than silently deleting operator history.

## Screenshots and review

`SCREENSHOTS.md` indexes the actual request/draft/live/review/Proof/expanded-change flow, both sizes and themes, offline/reconnect and stress captures. `REVIEW.md` records the fresh screenshot-only review and remaining issues.

My scores: clarity 7/10 (old failed drafts still add clutter; exact gaps require Proof), look 8/10 (Hallmark visual language retained), feel 8/10 (quiet idle, fast acknowledgement, stable scrolling; model/check durations remain real). These are judgments, not automated design scores.

Not verified: a manual VoiceOver session or a new full WCAG audit. The reported generic freeze did not reproduce as a browser hang; the actual drafter launch failure and synchronous Ask delay were separately reproduced and fixed. The light list shows recorded outcomes; artifact freshness and full diff-based risk are checked when Proof opens and again by the server before any decision. Safety rules were not relaxed.
