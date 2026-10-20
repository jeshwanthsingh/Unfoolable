# Verdict invariants

Each rule is tested against current policy; this refactor does not promote advisory checks or change approval rules.

1. Scoring the same facts preserves the frozen policy. [I1: 10,000 generated comparisons](../tests/verdict-properties.test.ts).
2. A runtime/harness failure never authorizes landing. [I2](../tests/verdict-properties.test.ts).
3. Adding a protected failure or error never improves landing eligibility. ERROR and FAILED are distinct non-accepting outcomes. [I3](../tests/verdict-properties.test.ts).
4. A Writer test is admitted only after BASE assertion failure and two Candidate passes with matching test identities. Admission alone never establishes ticket success. [I4](../tests/verdict-properties.test.ts), [native admission regressions](../tests/test-writer-v2.test.ts).
5. Candidate-only tests never replace the passing BASE test identities. [I5](../tests/verdict-properties.test.ts), [restored tests](../tests/playbook-checks.test.ts).
6. The same normalized facts give the same core result regardless of the calling shell. [I6](../tests/verdict-properties.test.ts), [both paths' frozen results](../tests/verdict-core.test.ts).
7. Native scoring with empty required layers cannot pass; the separate provenance-bound legacy adapter forwards its protected supplied aggregate for compatibility (see POLICY_PROPOSALS.md); unchecked intent is disclosed as a gap. BASE-inapplicable recipes remain informational under the unchanged rule. [I7](../tests/verdict-properties.test.ts), [recipe scoping](../tests/verification-v1-contract.test.ts).
8. Scoring cannot mutate facts, access ambient authority, or authorize a human decision. [I8](../tests/verdict-properties.test.ts), [no-import/authority test](../tests/verdict-core.test.ts), [exact-item passkeys](../tests/human-confirmation.test.ts).
9. Shape validation does not hide scoring; public validation explicitly rejects forged results. [shape/policy split](../tests/verification-v1-contract.test.ts).

The admission preconditions are measured by the protected runners. These invariants do not claim that in-process Candidate execution is immune to deliberate observation forgery. A graph is a navigation aid, not an enforcement boundary.

10. Combining required parts never improves on the most cautious part. The legacy reachable order is FAILED > NOT CHECKED > PASSED WITH GAPS; an unexpected ERROR remains non-passing. [I10, 10,000 combinations](../tests/verdict-properties.test.ts).
11. New production verdicts retain exact replay inputs, immutable content hash and core version. Missing facts fail rather than silently producing unreplayable results. [Snapshot integrity and replay](../tests/verdict-snapshot.test.ts).
12. Historical labels are append-only records, not the current-policy comparator. Every reconstructible event must match actual 3c94150 code on identical facts. [Current-policy golden](../tests/current-policy-golden.test.ts), [verbatim original adapter](../tests/fixtures/core1-original-ticket.ts).

13. A legacy protected supplied aggregate is retained as a provenance-bound fact, including the empty-layer compatibility case. Builder summaries are not a supplier. [Adapter compatibility](../tests/verdict-core.test.ts), [native adapter regression](../tests/ticket-checker.test.ts).
14. Explanation selects the highest-sequence check_result and preserves that event's stored label; an unrelated later runtime trace cannot replace it. [Latest-event selection and event 592](../tests/ticket-explain.test.ts).

15. Reviewer notes never change a verdict, its reasons or human decision binding. They are separate advisory events, not core facts. [10,000 random reviewer sidecars and stale binding](../tests/advisory-reviewers.test.ts).

## SIGN-1

16. A seal authenticates a recorded core decision; it never changes or accepts it. [DSSE binding](../tests/attestation-format.test.ts), [stored replay](../tests/verdict-seal.test.ts).
17. Every post-SIGN-1 ticket event participates in one ordered hash chain; insertion and its head commit or roll back together. Editing or deleting a past event is detected. [Tamper and rollback tests](../tests/verdict-seal.test.ts).
18. A signature is scoped to one ticket and check-event ID, facts snapshot, trace, core, BASE and frozen diff. Another ticket cannot borrow it. [Swapped seal and byte attacks](../tests/verdict-seal.test.ts).
19. Older checks remain unsealed; migration never manufactures signatures or rewrites verdicts. [Exact f947240 upgrade](../tests/verdict-seal.test.ts).
20. The Builder cannot read the signing key or execute the protected signing helper. [Real profile probe](../tests/builder-read-guard.test.ts). Signing uses its own bounded trusted helper, never Candidate code.
21. Backup copies retain the latest chain head and signed facts; verification after restore must replay the same. [Backup copy test](../tests/verdict-seal.test.ts), [backup integrity](../tests/backup.test.ts).

Threat boundary: these checks detect changes against the trusted verification key and retained chain anchors. They do not defeat an owner/root attacker who replaces application code and pinned keys, steals the fallback private key, or rolls back the entire machine and every backup. SIGN-1b activated a device-bound Secure Enclave signer without biometric prompting. BUG-1 revokes the unused retired software identity at every timestamp; older software backups cannot forge an accepted seal under the current registry.

## BUG-1

- B1: A bug fix is never VERIFIED without a matching BASE exception, message, project file/function/line and the same immutable test passing on the exact Candidate. Test: tests/bug-reproduction.test.ts, 5,000 generated combinations plus protected BASE/fixed/wrong executions.
- B2: Reproduction cannot edit source: one test file and disposable runtime storage are writable; all project source is read-only. Test: real kernel-sandbox case in tests/bug-reproduction.test.ts.
- B3: Log secrets are redacted before persistence or any model input; scanner failure is closed. Tests: tests/bug-log.test.ts and the pasted-log case in tests/chat-service.test.ts.
- B4: A revoked signer has no valid timestamp, including backdated signatures. Tests: tests/verification-keys.test.ts.
- B5: Old facts keep the same verdict and trace. Frozen comparison: artifacts/bug1/golden-replay.json against actual fbad889.

Bug admission currently supports ordinary unconditional Python unittest reproductions. Dynamic test construction, helper functions, conditionals, exception swallowing, framework changes and unsupported runner traces fail admission; they never authorize a fix. Static shape checks are additional tripwires, not replacements for the process/filesystem boundary or authenticity guarantees against arbitrary Python interpreter forgery.

- B6: A non-admitted reproduction never starts a fix session or creates a fix Candidate. [Loop stop regression](../tests/ticket-loop.test.ts), [fresh handoff and source-only fix](../tests/bug-reproduction.test.ts).
- B7: A bug mark is derived from stored checker events, never Builder prose; a fresh check clears the fixed mark. [Presentation truth tests](../tests/bug-presentation.test.ts).

## Night Shift review boundary

- Night consent authorizes only one exact draft Start, up to its fixed morning cutoff. It cannot authorize Keep, Retry after an ordinary error, extra allowance, or a permission grant. Proof: `tests/night-queue.test.ts`, `tests/night-shift.test.ts`.
- Night work ends at the existing human review boundary. Only the normal protected checker writes check results, using the same fact snapshots and sealing path; Night Shift never computes a verdict. Proof: `Night dispatch uses the real ticket loop and leaves its frozen change for explicit human review`.
- A restart never consumes an old running consent again. Neither expiry nor a security stop renews consent. Rate-limit backoff is the only automatic retry and does not reset the ticket’s budget. Proof: `tests/night-shift.test.ts`.
