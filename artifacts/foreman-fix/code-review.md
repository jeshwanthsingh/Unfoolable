# Foreman-fix code review

Verdict: ACCEPT. No concrete correctness or safety blocker found in the reviewed diff from c7cb66d.

- Process recording accepts complete kernel PID/birth identity or ESRCH-confirmed absence only. Persistent live/permission uncertainty remains an error; no PID-only ownership or signal fallback was introduced.
- The final refinement records the root first and caps root/one-PID retry at 50 ms, leaving the shared descendant budget at one second. This avoids prolonged synchronous blocking while Node must reap its own exiting child, without changing the fail-closed outcome.
- Refreshed parent/group/session membership rejects stale inventory membership. Existing immediate PID/birth/executable/group/session checks before signals remain intact.
- Migration 17 preserves existing rows, index and immutable-card triggers within the existing migration transaction.
- Retry cards bind current ticket/evidence/failure/actions/latest event. Reservation is one-shot; service/queue locks and post-cleanup state revalidation prevent duplicate execution or revival after Discard.
- Added tests cover the actual chat Start path, recording-before-turn failure, uncertainty, ESRCH, PID reuse, concurrent Retry and Discard during cleanup.

Verification performed by this reviewer: git diff --check passed; read-only source/test review. Full-suite and negative-control execution belongs to the parent run and is not claimed here.
