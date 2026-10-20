# Verdict invariants

Each rule is tested against current policy; this refactor does not promote advisory checks or change approval rules.

1. Scoring the same facts preserves the frozen policy. [I1: 10,000 generated comparisons](../tests/verdict-properties.test.ts).
2. A runtime/harness failure never authorizes landing. [I2](../tests/verdict-properties.test.ts).
3. Adding a protected failure or error never improves landing eligibility. ERROR and FAILED are distinct non-accepting outcomes. [I3](../tests/verdict-properties.test.ts).
4. A Writer test is admitted only after BASE assertion failure and two Candidate passes with matching test identities. Admission alone never establishes ticket success. [I4](../tests/verdict-properties.test.ts), [native admission regressions](../tests/test-writer-v2.test.ts).
5. Candidate-only tests never replace the passing BASE test identities. [I5](../tests/verdict-properties.test.ts), [restored tests](../tests/playbook-checks.test.ts).
6. The same normalized facts give the same core result regardless of the calling shell. [I6](../tests/verdict-properties.test.ts), [both paths' frozen results](../tests/verdict-core.test.ts).
7. Empty required layers cannot pass; unchecked intent is disclosed as a gap. BASE-inapplicable recipes remain informational under the unchanged rule. [I7](../tests/verdict-properties.test.ts), [recipe scoping](../tests/verification-v1-contract.test.ts).
8. Scoring cannot mutate facts, access ambient authority, or authorize a human decision. [I8](../tests/verdict-properties.test.ts), [no-import/authority test](../tests/verdict-core.test.ts), [exact-item passkeys](../tests/human-confirmation.test.ts).
9. Shape validation does not hide scoring; public validation explicitly rejects forged results. [shape/policy split](../tests/verification-v1-contract.test.ts).

The admission preconditions are measured by the protected runners. These invariants do not claim that in-process Candidate execution is immune to deliberate observation forgery. A graph is a navigation aid, not an enforcement boundary.
