# Chat polish safety/scope review

Reviewed the diff against f45237c, read-only. This review did not run model calls or mutate application data. Parent owns full-suite and negative-control evidence.

## Findings found and resolved

- **Resolved P1 — TEST child-path aliases needed guarding.** The initial diff guards the canonical data-directory marker, but SQLite opens command-center.sqlite without rejecting a symlink, and the playbook store uses dataDir/playbooks without rejecting a symlink at that root. An isolated TEST directory can therefore alias LIVE child storage. The implementer added non-symlink regular-file checks for SQLite/ WAL/SHM and a non-symlink directory check for the playbooks root, plus synthetic alias regression coverage. No actual live data was used.
- **Resolved P2 — waiting playbook removed Discard.** Clearing all ticket actions for a waiting playbook also hides Discard in chat. The implementer now uses one bound ticket card with Approve plus Discard and includes playbook hash/definition in the exact binding. The LIVE guard checks the approval action before card reservation; Discard remains available.

## Confirmed by inspection

- Selected oracle exports validate every selected entry, enforce file/aggregate caps, use an explicit git archive whitelist, inspect the decoded filesystem, compare exact inventory, and compare each extracted blob byte-for-byte. Whole exports still inspect every entry. Unselected symlinks/submodules never enter the archive.
- Live approval writes are blocked in the persistent store as well as the chat path; claimed client actor/source metadata cannot override this. This safely pauses new human approvals too and must be reported as a deliberate limitation pending a chosen human-presence mechanism. Existing approved records remain readable; historical missing actor/channel fields are not fabricated.
- Status normalization runs before drafting and preserves the original message; exact-item reservation/current-binding checks remain authoritative. Grouping is presentation-only and does not relax stale-action rejection.
- History is folded and stale items have no buttons. Retry grouping preserves the recorded real reason.

## Residual boundary

LIVE/TEST markers prevent accidental test/automation use through the application, not a malicious local same-user process rewriting files or directly opening SQLite. Do not describe chmod 0400 as a kernel-enforced immutable boundary.

## Final inspection

Re-read the follow-up changes. Both findings are addressed in the inspected code, with focused synthetic regression tests. No additional high-confidence actionable findings found in this bounded diff. Full-suite and negative-control results are owned by the parent and not independently asserted here. Career startup kernel-identity failures remain unresolved outside this review scope; do not claim ready_for_review.
