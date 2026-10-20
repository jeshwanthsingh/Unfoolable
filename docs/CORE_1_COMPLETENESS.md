# CORE-1 completeness audit

The 148-file before slice is a conservative dependency closure, not 148 independent scoring rules. No sandbox, process-ownership or human-decision rule is moved into an automatic approval.

| Rule / surface | Disposition |
| --- | --- |
| Native layers, errors, empty guards, recipe BASE applicability and gaps | verdict-core.ts native path; scoreV1 is a compatibility wrapper. |
| Missing required recipe; unsupported runner | Core native-ticket / unsupported; ticket adapter gathers stored reports. |
| Passing BASE identities, new failures, skipped/missing tests | Core project-tests; native parsers supply test identities and statuses. |
| Native + playbook combination | Core combineResults, shared by live and historical replay. |
| Quality findings and tamper-runner ERROR | Core playbook path aggregates findings/errors. Tool-specific report parsing, changed-line filtering and AST diagnostic detection remain collectors feeding that rule. |
| Test tampering flags, diff size and changed-test review | Existing review-risk.ts is the separate human-review policy, not an automated check verdict. It determines look-before-accept; it cannot grant PASS. Deliberately retained unchanged, with its existing tests. |
| Scope and dependency changes | oracle-tree.ts / playbook admission collect actual changed paths and refuse unsupported execution. The refusal is an exception fact classified by the core runtime path, not a successful verdict. |
| Command/token budgets | Core budget path; event counting and clock/deadline observation remain in the shell. Deadline expiry becomes ACTION_BUDGET runtime facts. |
| Harness failure, cancellation and attention stops | Core runtime path. Queue recovery and process cleanup remain enforcement/observation, not a passing score. |
| Writer admission | Core writer-admission requires real BASE assertion failure and two matching Candidate passes. The advisory writer never upgrades a failed protected result. |
| Verify-only claim precedence | scoreVerifyV2 delegates to core claims. |
| Report shape | isV1Report checks shape; public isVerifyView explicitly calls scoring for consistency. |
| Freshness and passkeys | Unchanged evidenceProblem, exact-item authorization and decision paths; these can block Keep, never manufacture a check result. |

## Every before-map dependency

The following files remain source collectors, schema/type/shape validators, adapters, enforcement or observers unless identified above as a scoring adapter. Their generated observations reach the core through the native/playbook/runtime facts. Low-level runner PASS/FAIL describes that invocation; it is not a ticket-level verdict.

- `apps/server/analysis-errors.ts`
- `apps/server/analysis-packet.ts`
- `apps/server/analysis-phase.ts`
- `apps/server/analysis-store.ts`
- `apps/server/analysis-validation.ts`
- `apps/server/build-admission.ts`
- `apps/server/build-compatibility.ts`
- `apps/server/build-errors.ts`
- `apps/server/build-phase.ts`
- `apps/server/build-processes.ts`
- `apps/server/build-protocol.ts`
- `apps/server/build-runtime.ts`
- `apps/server/build-store.ts`
- `apps/server/build-workspace.ts`
- `apps/server/builder-filesystem.ts`
- `apps/server/builder-private-paths.ts`
- `apps/server/builder-tripwires.ts`
- `apps/server/career-safe-playbook.ts`
- `apps/server/chat-cards.ts`
- `apps/server/chat-events.ts`
- `apps/server/chat-status.ts`
- `apps/server/chat-store.ts`
- `apps/server/codex-json.ts`
- `apps/server/config.ts`
- `apps/server/content-identity.ts`
- `apps/server/context-errors.ts`
- `apps/server/context-observation.ts`
- `apps/server/context-repository.ts`
- `apps/server/context-store.ts`
- `apps/server/contract-errors.ts`
- `apps/server/contract-input.ts`
- `apps/server/contract-phase.ts`
- `apps/server/contract-store.ts`
- `apps/server/contract-validation.ts`
- `apps/server/correction-admission.ts`
- `apps/server/correction-workspace.ts`
- `apps/server/data-mode.ts`
- `apps/server/debug-correction-prompt.ts`
- `apps/server/debug-diagnosis.ts`
- `apps/server/debug-ownership.ts`
- `apps/server/debug-packet.ts`
- `apps/server/debug-store.ts`
- `apps/server/desk-stream.ts`
- `apps/server/diagnosis-sampling.ts`
- `apps/server/diff-review.ts`
- `apps/server/draft-archive.ts`
- `apps/server/effect-reconciliation.ts`
- `apps/server/errors.ts`
- `apps/server/human-context.ts`
- `apps/server/log.ts`
- `apps/server/mission-analyzer.ts`
- `apps/server/mission-errors.ts`
- `apps/server/mission-outcomes.ts`
- `apps/server/mission-workflow.ts`
- `apps/server/missions.ts`
- `apps/server/oracle-author.ts`
- `apps/server/oracle-execution.ts`
- `apps/server/oracle-source.ts`
- `apps/server/oracle-suite-policy.ts`
- `apps/server/oracle-tree.ts`
- `apps/server/permission-validation.ts`
- `apps/server/phone-access.ts`
- `apps/server/phone-push.ts`
- `apps/server/planning-drafter.ts`
- `apps/server/planning-errors.ts`
- `apps/server/planning-input.ts`
- `apps/server/planning-phase.ts`
- `apps/server/planning-store.ts`
- `apps/server/planning-validation.ts`
- `apps/server/playbook-checks.ts`
- `apps/server/project-body.ts`
- `apps/server/project-errors.ts`
- `apps/server/project-playbooks.ts`
- `apps/server/project-recipes.ts`
- `apps/server/projects.ts`
- `apps/server/protected-existing-tests.ts`
- `apps/server/quality-gates.ts`
- `apps/server/repository-identity.ts`
- `apps/server/repository.ts`
- `apps/server/review-risk.ts`
- `apps/server/runtime-permissions.ts`
- `apps/server/spec-errors.ts`
- `apps/server/test-edit-review.ts`
- `apps/server/test-tampering.ts`
- `apps/server/test-writer-admission.ts`
- `apps/server/test-writer-context.ts`
- `apps/server/test-writer-coverage.ts`
- `apps/server/test-writer-execution.ts`
- `apps/server/test-writer-mutation.ts`
- `apps/server/test-writer-native.ts`
- `apps/server/test-writer-session.ts`
- `apps/server/test-writer.ts`
- `apps/server/ticket-budget.ts`
- `apps/server/ticket-checker.ts`
- `apps/server/ticket-dependencies.ts`
- `apps/server/ticket-loop.ts`
- `apps/server/ticket-migration.ts`
- `apps/server/ticket-playbook-hooks.ts`
- `apps/server/ticket-queue.ts`
- `apps/server/ticket-service.ts`
- `apps/server/ticket-stats.ts`
- `apps/server/ticket-store.ts`
- `apps/server/ticket-workspace.ts`
- `apps/server/verification-environment.ts`
- `apps/server/verification-executor.ts`
- `apps/server/verification-migration.ts`
- `apps/server/verification-recipe.ts`
- `apps/server/verification-routes.ts`
- `apps/server/verification-store.ts`
- `apps/server/verification-workspace.ts`
- `apps/server/verify-only-admission.ts`
- `apps/server/verify-only-author.ts`
- `apps/server/verify-only-authoring.ts`
- `apps/server/verify-only-deadline.ts`
- `apps/server/verify-only-identity.ts`
- `apps/server/verify-only-references.ts`
- `apps/server/verify-only-retry.ts`
- `apps/server/verify-only.ts`
- `apps/server/watchman.ts`
- `apps/server/writer-concurrent-args.ts`
- `packages/shared/analysis.ts`
- `packages/shared/build.ts`
- `packages/shared/chat.ts`
- `packages/shared/check-copy.ts`
- `packages/shared/context.ts`
- `packages/shared/contracts.ts`
- `packages/shared/debug-validation.ts`
- `packages/shared/debug.ts`
- `packages/shared/display-title.ts`
- `packages/shared/missions.ts`
- `packages/shared/oracle.ts`
- `packages/shared/outcomes.ts`
- `packages/shared/permissions.ts`
- `packages/shared/planning.ts`
- `packages/shared/playbooks.ts`
- `packages/shared/projects.ts`
- `packages/shared/quality-gates.ts`
- `packages/shared/review-risk.ts`
- `packages/shared/spec.ts`
- `packages/shared/test-writer.ts`
- `packages/shared/ticket-activity.ts`
- `packages/shared/ticket-budget.ts`
- `packages/shared/tickets.ts`
- `packages/shared/verification-v1.ts`
- `packages/shared/verification.ts`
- `packages/shared/verify-only-v2.ts`
- `packages/shared/verify-only.ts`
- `packages/shared/workshop.ts`

## Rule-authority metric (not graph reachability)

The source-reviewed aggregate policy loci are listed with functions and source lines in `artifacts/core1/graph/rule-authorities.json`: **8 files / 8 functions before, 1 file / 1 deciding function after**. `combineResults`, `scoreV1`, `scoreVerifyV2`, `budgetExceeded` and `nativeAdmission` now delegate; wrappers are not counted as additional rule authorities. Native aggregation, legacy supplied-verdict adaptation, project-test comparison, quality/tamper execution errors, combination, required claims, runtime and budgets, and Writer admission live in `scoreVerdict`.

This deliberately counts aggregate decisions, not every upstream conditional. Existing `testWriterLayer` constructs a layer from measured coverage and the retained advisory policy; BASE-admission, diagnostic classifiers and oracle judges produce observations. Their refusal/error facts can prevent execution; they do not independently manufacture a final ticket verdict. Human review-risk, diff caps, passkeys and freshness still gate a human Keep independently. Moving those policies would violate the unchanged-safety boundary. The pure core cannot prove that an input observation is true.

The historical legacy adapter's supplied aggregate is an explicit exception to deriving everything again from layers: it is provenance-bound input from the protected checker. Forwarding empty-layer supplied verdicts preserves 3c94150. `POLICY_PROPOSALS.md` records potential tightening without applying it.
