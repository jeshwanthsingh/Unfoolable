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

## Supplied-verdict provenance and explanation selection

The production supplier is `createVerifyOnly` in `apps/server/verify-only.ts`: its protected layer executions feed `scoreV1`, which delegates to the core; the shell persists `result.v1`. `createTicketChecker` receives that result through `verifier.createTicketCandidate` for owned workspaces or `verifier.create` for legacy exports, then `verifier.wait`. The adapter binds the supplied aggregate to the verification ID and evidence hash in core facts. Historical explanation can also supply the saved `verify_only_runs.result_json.v1` aggregate, explicitly marked historical with no evidence hash attestation. Dependency-injected test verifiers are isolated test adapters, not production sources.

No Builder return value, chat message, agent summary or permission response is wired to this supplied-verdict field. Builder output determines a frozen Git artifact for protected execution; it does not provide the verifier report. Filesystem read denial protects reports from the Builder. Provenance here is retained origin metadata, not a cryptographic signature or a new trust boundary.

`./cc explain b15600b3` defaults to event 664, whose stored verdict is PASSED WITH GAPS. Event 592 is earlier and remains NOT CHECKED; its regression replay agrees. Selection now explicitly takes the highest-sequence check_result, excluding unrelated later runtime traces. The CLI and Proof identify the selected event. No stored verdict or golden file was changed.

The download-denial regression no longer depends on npm/pip diagnostic wording. It requires unsuccessful installs, no downloaded package files, active Node/Python connection observers with no successful connections or received package data, and a separately denied non-loopback socket attempt. These observers are test instrumentation, not a kernel packet capture; the unchanged native sandbox enforces denial for descendants. pip's earlier wording differed (Errno 8 / nodename lookup instead of the regex's accepted messages). No VPN/DNS setting was changed here; whether NordVPN or DNS changes caused that wording is unproven.
