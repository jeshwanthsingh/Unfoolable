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
