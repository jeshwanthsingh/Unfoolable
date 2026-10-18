# UI-4 regressions and fixes

Every implementation batch began with failing regression output, retained beside its passing run. Existing security and admission assertions were not weakened.

| Bug / before | Fix / after | Regression and proof |
| --- | --- | --- |
| Chat needed a separately started coordinator | Bare `unfool` and `./cc chat` start/reuse the tracked coordinator before opening the authenticated UI | `ui4-launcher.test.ts`; step1 red/green; real idle restart through `unfool` |
| Operator/server errors could masquerade as clarification or a failed decision | Plain error mapping, truthful QUESTION/ERROR cards, decision errors only on failed decisions | launcher and interaction tests; step1, draft-error-copy and false-ready-draft red logs; focused green |
| Cancellation card lingered/reappeared | Hide immediately while confirming; retain exact Touch ID requirement, restore on failure, persist CANCELLED after success | interaction regression uses isolated data, actual SQLite reopen and stale Start rejection |
| Repeated list and full-detail polling | One authenticated event-log SSE stream; small summaries; full Proof fetched only on demand and cached | ui4-stream tests; step2 red/green; actual previous/new request protocols |
| Second browser could hide a pending event from the first | Flush existing clients before initializing a new connection | reconnect-race red/green |
| Refreshes could miss hallmark result or phase timing | Stable ticket keys and stored check/state event sequences drive the mark and timing | live-strike red/green; browser focus/scroll checks |
| Offline cleared or obscured saved work | Retain/dim last-known list, timestamp, safe automatic reconnect, Back online note | ui4-offline tests, step3 red/green; stability/offline.png |
| Ask waited for a model round-trip and could double send | Bounded asynchronous acknowledgement, single in-flight draft, immediate sending feedback | interaction HTTP test defers provider result; step4 red/green |
| Enter/newline behavior, theme and Proof scrolling | Enter sends, Shift+Enter/IME do not; system theme default; modal background lock, diff scroll and file expansion | interaction tests plus official MCP input/Proof/theme assertions |
| Distinct terminal/attention marks and plain titles missing | Original distinct SVG shapes/accessibility names; saved plain-title metadata; full original title preserved; word preview | ui4-words tests, step5 red/green; light/dark screenshots |
| Long event/diff lists dominated | One technical timeline toggle, lazy details, plain style labels | words/interaction tests and Proof screenshots |
| Large task lists | Real-state groups, Earlier disclosure, search >15, first25 rows per group, Show more | ui4-groups tests, step6 red/green; 50/500 browser cases and actual500-row server test |
| Real read-only drafter could not create its thread | Empty read-only cwd now outside denied Projects ancestor; same deny/no-network profile; provider diagnostics retained privately | chat-workspace/draft-diagnostic red/green; real Codex draft and ticket completed |
| Light metadata omitted some stored warnings and open Proof reloaded for routine process events | Include warning type in summaries; separate meaningful detail revision from routine progress revision | final-review red/green; no decision policy changes |

The original mistaken --tags task and failed startup drafts are preserved as operator history. The corrected --platform request was explicitly approved before resubmission. Test-only fixture cancellations do not alter real user data or create passkey approvals.
