# CORE-1 audit (report only)

Audited at base 3c94150, before application changes.

| Feature | Status | Evidence |
| --- | --- | --- |
| Rewind (undo a task) | MISSING | ticket-service.ts offers retry/recheck/decide, not reversal of a kept branch. |
| Bug From This Log | MISSING | No matching command, route or UI flow in apps/packages/scripts. |
| Fuel gauge | DONE | apps/server/chat-codex.ts reads account/rateLimits/read; ticket-budget.ts records task usage. This does not guarantee account availability. |
| Night Shift | MISSING | No overnight scheduler flow; automatic FIFO queue is not Night Shift. |
| Auto-playbooks | PARTIAL | project-playbooks.ts propose/proposeGates; human approval still required. |
| Mutation testing admission | PARTIAL | test-writer-admission.ts and test-writer-mutation.ts generate/retry mutations; policy remains ADVISORY. |
| diff-cover | DONE | test-writer-coverage.ts; scripts/protected-verification/writer-diff-cover.py; actual changed-line measurement. |
| Signed verdicts | MISSING | Evidence hashes bind content; hashes are not signatures. |
| eslogger tripwires | MISSING | builder-tripwires.ts observes macOS sandbox denial logs, best effort. No eslogger sensor. |

No feature in this audit is implemented by CORE-1.
