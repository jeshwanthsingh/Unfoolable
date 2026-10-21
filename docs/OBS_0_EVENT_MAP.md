# Observatory: real event map (before implementation)

Mockup only, based on c890988. No task submissions, decisions, event writes, or runtime changes. Read current task summaries from the existing authenticated `/api/desk/events` SSE stream; fetch details and diffs with existing GET endpoints. Historical views are labelled recorded, with the exact event sequence. Never mix historical result data with a different check or attempt.

## Ticket events

Source: `packages/shared/tickets.ts`, emitters in `apps/server/ticket-loop.ts`, `ticket-service.ts`, `ticket-queue.ts`. Existing presentation interpreters: `apps/web/src/office-model.ts`, `office-activity.ts`.

| Real event | Room / journey / copy | Does not establish |
|---|---|---|
| submitted | Package at intake; waiting | A running Builder |
| state_changed: queued | Waiting at intake | Work started |
| state_changed: building / fixing | Builder bench / correcting | Test success |
| state_changed: checking | Package enters glass lab | Any check passed |
| state_changed: ready_for_review | Package at your desk; needs your review | Accepted |
| state_changed: kept / discarded | Accepted / rejected label | A new grader result |
| state_changed: needs_you | Station stops; attention line | Continuing work |
| state_changed: interrupted / cancelled / harness_error | Stopped, cancelled, or app error | Code failure or pass |
| transition_rejected | Technical history only | A state transition |
| agent_launch_requested | Preparing a session | Process successfully started |
| agent_started / agent_bound | Recorded session start | Any file read or edit |
| agent_stopped | Work stops | Completion or correctness |
| agent_event | See typed payload map below | Arbitrary prose is not an animation command |
| processes | Technical history only | Work or progress |
| needs_you | Plain recorded reason; stop activity | Approval or permission granted |
| candidate_frozen | Package is ready for inspection | Protected checks passed |
| verification_started | Lab begins checking | Completion percentage |
| check_result | Actual protected result mark at desk | Sealed or accepted |
| decision | Recorded human action only | Any other action authorized |
| retry_requested | Reset to the new recorded attempt | Automatic permission reuse |
| cancellation_requested | Stop requested, lights settle | Confirmed process exit |
| recovery / cleanup | History and stopped-state context | A successful check |

## Nested agent_event payloads

| Kind (source) | Display use |
|---|---|
| turn.started, builder.completed (`build-protocol.ts`) | Session lifecycle; completion is not verification |
| tool.started / tool.completed (`build-protocol.ts`) | commandExecution -> terminal; explicit read actions -> bookshelf; fileChange -> desk. Only safe repo-relative basenames in bubbles. Never raw commands/output. Completion stops that tool's pose. |
| command_observed (`ticket-loop.ts`) | Command count, deduplicated per attempt/item |
| usage_observed / usage_unavailable (`ticket-loop.ts`, `ticket-service.ts`) | Reported tokens only; unknown stays unknown. Writer and Builder usage remain separate. |
| budget_limits / budget_extension (`ticket-budget.ts`) | Exact recorded limit. A later extension is never applied backwards in replay. |
| check_progress (`ticket-checker.ts`) | Named running check; pass/total only when numbers actually exist. No guessed count, percent, or individual green tubes. |
| test_writer_launch_pending | Preparing writer, not writing or passed |
| reviewer_started / reviewer_finding / reviewer_done / reviewer_discarded / reviewer_unavailable / reviewer_processes / reviewer_cleanup (`advisory-reviewers.ts`) | Advisory notes/history only; no reviewer actor in this strip; never changes the mark |
| verdict_sealed (`verdict-seal.ts`) | Seal shimmer only when bound to the exact check event, via officeFrame; recording is not a new cryptographic verification |
| blocked_action | Recorded blocked action count; never inferred from a character pose |
| tripwire / needs_you: TRIPWIRE | Alarm and freeze only for that recorded alarm |
| needs_you: STOP_ALL / cancellation_requested: STOP_ALL | Dim and stop on a real stop request |
| workspace_prepared / dependencies_prepared / clean_clone | Plain lifecycle line; no file-read animation |
| bug_log_received / bug_reproduced / bug_fixed / bug_not_reproduced (`bug-reproduction.ts`) | Actual reproduction status; never a decorative bug success |
| display_title | Stored plain title, no movement |
| output_truncated / policy_annotation | Technical history only |
| other / future kind | Unknown; no new animation |

Burst queue: deduplicate by ticket + event sequence; merge adjacent explicit read-action records only, count distinct safe recorded paths exactly; retain source sequences. Each visible beat is at least 350ms. Other work cannot be invented to fill gaps. Replay is visibly recorded, not live. Scrubbing reduces the event prefix; never mutates stored data.

## Non-ticket sources and limits

| Fact | Source and honest interpretation |
|---|---|
| Connection | Existing SSE connection, not a fake status dot |
| No internet | Configured Builder profile and dated real denial probe, not continuous surveillance |
| Protected drawers | Latest tracked `artifacts/rules1/protected-probe.json`: 74 targets, all unreadable, 2026-10-20. These are paths, NOT 74 distinct secrets, and not a per-ticket guarantee. Old Workshop constant 71 must not be reused. |
| Fuel | usage_observed per Builder attempt divided by that attempt's recorded budget. Missing limit or usage -> unknown. Not the Codex account allowance. |
| Grader boundary | Existing separate protected runner architecture; no new isolation in this mockup |
| Seal | Exact recorded verdict_sealed binding. Do not claim a new signature verification. |
| Night Shift | Current store has zero shift runs. Morning view says no recorded report; no invented completed jobs. |
| Tripwire | No production tripwire alarm in current ticket history. View says no recorded alarm; armed context only, no fabricated red event. |
| Grader self-tests | 12 planted controls belong to system validation, NEVER to an individual task |

Current data audit: 12 tickets; 6 kept, 1 discarded, 5 ready_for_review. Historical prefixes can show actual working, needs-you and check-failure states. Current summaries always stay current. No production task is started for the mockup.
