# Chat polish — PARTIAL

Branch codex/chat-polish, from f45237c. Four step WIP commits are recorded; final review changes preserve Discard alongside the one pending playbook card.

1. Status matching ignores case, spacing and punctuation. Database/fuel variants avoid the AI drafter; actual engineering requests still draft. Existing untouched misrouted drafts are retired, not turned into tickets.
2. Current exact-item cards appear under Needs you now, one ticket card per ticket; harness failures appear under Stuck - can retry with their actual reason. Historical cards are compact, folded and non-actionable. Desktop/390px browser flow verified.
3. career-ops was blocked by `.claude/skills/career-ops/SKILL.md` outside the approved `liveness-core.mjs` export. Validation now filters exact selected entries before path/type/size checks. Selected unsafe paths, symlinks, submodules and oversized files remain refused; full exports retain full validation. The approved BASE suite passed all five checks. Two exact Retry actions then stopped at `Kernel process ownership could not be recorded.` No Candidate was created and career-ops remains harness_error, not ready_for_review. Owned cleanup was recorded; the real source is unchanged. No ownership check was bypassed.
4. Research-router approval was executed by this assistant's real-run script via chat-card HTTP API at 2026-10-10T13:48:14.147Z (6:48:14 AM PDT), after the user's explicit approval of the exact playbook. It was not a unit test or a manual UI click. The old ledger did not store actor/channel; provenance is established from saved script/log, not fabricated fields.

New LIVE playbook approval writes are paused in the persistent store and API until a human-presence mechanism is chosen. This also pauses new manual approvals; existing approved books remain usable and byte-for-byte unchanged. Tests may open only separate TEST stores under the temporary root; DB/WAL/SHM and playbook root symlink aliases are rejected. Test approvals are explicitly labelled test-fixture/node:test/TEST. This protects application paths against accidental automation, not malicious same-user direct filesystem access. No biometric gate is claimed.

Research-router e56f790f was rechecked without rebuilding: same Candidate cb8a026cb203d664e42f7565ac7863456e7fc8bb, ready_for_review, PASSED WITH GAPS, Keep available. Keep/Discard remain untouched. Gaps: task intent is not independently proved by regression guards; advisory task checks were not requested.

Fresh full suite: 768 passed, 0 failed, 0 skipped, 240.117 seconds. Typecheck and production build passed. All 12 negative controls non-PASS and matched expected outcomes. Focused post-review suite: 27 passed. Credential-pattern scan found no matches; existing approvals unchanged. No dependencies, billing, remote, push, merge or deployment added.

Evidence: career-paths.json, career-ticket.json, career-source-unchanged.json, approval-audit.json, research-recheck.json, verification.json, negative-controls-summary.json, credential-scan.json, code-review.md, desktop.png, mobile.png. Detailed temporary logs stay in ignored .work/chat-polish.
