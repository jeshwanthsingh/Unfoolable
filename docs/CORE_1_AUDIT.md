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

## Policy history

`149096ab6e34b897fedc427f6b9e9cf040aaeb58`, October 17, 2026 at 12:45:41 PDT, changes `ticket-playbook-hooks.ts`: after spreading the playbook result, explicitly retain native NOT CHECKED unless a required part FAILED. Previously the project result overwrote the native abstention. The commit message is “prove offline quality gates and preserve unchecked verdicts”: passing regression commands must not make an unavailable required verifier look checked.

Event 586 was recorded at 12:30:04 PDT and matches the older logic visible at parent `5eaef5b`. Event 592 at 12:33:09 matches the stricter logic in `149096a`. No commit lies between these events that proves activation; the stricter code was committed later. Runtime build identities were not saved then. The matching policy source is known; the exact active commit is not. Do not turn this working-tree inference into a claimed runtime attestation.

The untouched `golden.json` is the original historical archive. `current-policy-golden.json` contains expected outputs obtained from verbatim 3c94150 code on the same frozen facts; all 15 reconstructible events match the new core. `historical-records.json` retains stored labels, provenance qualifications and append-only annotations. Event 586 remains PASSED WITH GAPS historically; under 3c94150 rules it is NOT CHECKED. Four events lack enough original facts and are not silently counted as replayed.
