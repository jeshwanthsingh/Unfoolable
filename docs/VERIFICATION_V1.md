# Verification v1

The primary workflow verifies a frozen local Candidate; it does not require analysis, planning or per-task oracle approval. The older Mission/Builder orchestration is experimental. Its permission, cancellation, recovery and local Land safeguards remain available; it is not the default v1 entry point.

Checks run in order:

1. **Protected existing tests.** Export the frozen Candidate, restore BASE test files, select BASE test paths, then run the native unittest or Vitest suite in the protected verifier. Candidate-added or edited tests run separately and cannot grant authority. Zero collected, skipped and excluded tests are named. The credential-dependent SDK broker test stays explicitly excluded and is never counted as passing.
2. **Project recipes.** Approved reusable checks live in the local oracle store. Every recipe must fail its known-bad version and pass its known-good version before approval. Stored definitions and admission evidence are content-addressed and checked again on every use. A missing or changed recipe blocks Land. All approved recipes for the project run; checks are not selected to suit the current task.
3. **Advisory task checks.** Optional, unchecked by default. When requested, the author has at most two attempts with full BASE/correct/wrong admission. Unadmitted obligations are NOT CHECKED. Admitted checks execute, and their failure/error blocks success. No Candidate failure gets an automatic authoring retry.

VERIFIED requires meaningful passing checks in the first two layers and every admitted task check, without undisclosed gaps. PASSED WITH GAPS means mandatory checks passed but coverage is incomplete; gaps are listed. Both may be landed by an explicit user decision. FAILED and ERROR cannot be landed. Cancellation, changed evidence, altered recipes or uncertain cleanup fail closed.

Land creates one local `cc/verify-<id>` branch containing the frozen tree as one commit on BASE. It does not check out, merge, push or change the user's working tree. Source HEAD must still match BASE and the source must be clean. A resumed Land intent is checked against exact evidence, branch, tree and BASE parent.

## Once-per-project seed admission

Use the pinned Node 24 runtime:

```
node scripts/seed-project-recipes.ts <application-data-directory> <approved-seed.json> ...
```

This is a local administrative approval action. Definitions are admitted against known versions before becoming reusable. Repeating an unchanged approved seed reuses its identity and evidence. Failed admission does not produce an approved recipe. Recipes are listed through `GET /api/projects/:id/verification-recipes` with names and summaries; private assertion code is not exposed by that endpoint.

## Boundaries

Native existing tests import Candidate product code in their own process. They retain IN-PROCESS assurance: frozen tests, exact inventory and the review tripwire constrain ordinary test gaming but do not prove immunity to deliberate in-memory framework tampering. Project-recipe judges remain in a separate process and never import Candidate code. Deliberate observation-channel forgery remains the previously documented residual risk. No sandbox or signal exception has been broadened; browser reads are limited to the tooling's specific dependency package directories.

Verification scopes are explicit: Therapy2 uses frontend and Aegis uses sdk/python. Changes outside the selected scope block verification/Land; an unchecked backend/core change cannot ride along in the landed commit.
