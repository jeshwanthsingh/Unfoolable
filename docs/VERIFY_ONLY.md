# Verify-only

Input is a canonical allowed local Git repository, BASE commit/ref, Candidate commit/ref and original intent. Both refs are frozen to commit/tree identities. Dirty working trees and a HEAD beyond BASE are allowed; verification reads committed objects and does not checkout, commit, fetch or modify the repository.

`POST /api/verify-only` starts independent oracle authoring and BASE admission. `GET /api/verify-only/:id` shows test names, assertion summaries, assurance, red-on-base results and unsupported claims. `POST /api/verify-only/:id/approve` requires the exact review hash. No Candidate code executes until approval. There are no analysis, planning or Builder stages.

The existing protected materializer and process-isolated observer/judge are reused. BASE versions of existing test files are restored; dependency changes/security review flags remain non-passing. Strict native report correlation, exactly one test, no skips/zero-test PASS and certified process cleanup remain authoritative. Python SDK returned object attributes can be captured as observations; the judge never imports Candidate code. Direct calls are IN-PROCESS and retain the previously documented observation-forgery residual risk.

Unsupported claims are HUMAN / NOT CHECKED with a reason. Invalid/vacuous admission is REJECTED, not converted to passing or silently removed. The result distinguishes automated score and total coverage: PARTIAL means passing executable checks plus unchecked claims. Zero executable checks is NOT CHECKED, never PASS. A rejected proposal is retained for diagnosis. Oracle source selection is bounded and BASE-only. The initial UI runner still requires a default component that mounts without provider/API fixtures; unsupported interactions are disclosed rather than replaced with unrelated UI. Existing native-suite orchestration and concurrent scheduling are likewise not asserted by a function/CLI observation.

Review is persisted; interrupted authoring/verifying becomes ERROR on restart and never automatically replays. Approval also binds the protected evaluator identity. No model/runtime change to the Builder.

Abandon can be requested without a reviewed Spec. It fences new work, interrupts only that Mission's active preparation, stops owned execution and records ABANDONED only after cleanup is certified. Uncertain cleanup remains Needs You with the durable request. An already-recorded Land side effect/journal still requires reconciliation; Abandon never erases a branch or changes a recorded Land permission.
