# Architecture

Browser UI → loopback Node coordinator → SQLite → isolated Builder / protected verifier.

The Mission workflow prepares context and analysis, stops for genuine clarification, then generates and seals internal Contract/Plan artifacts and proposes a native oracle. These internal seals are not human approvals. The only normal pre-Build human event is APPROVE_SPEC, bound to exact content and BASE admission. One Spec screen replaces the old review screens.

Accepted artifacts have stable content identities and append-only acceptance acknowledgments. Separate immutable input/binding metadata preserves source, BASE and evaluator fencing; storage UUIDs, edit provenance and acceptance timestamps are not semantic identity. Historical ledger rows remain readable without rewriting.

The coordinator persists PREPARING, NEEDS_CLARIFICATION, SPEC_REVIEW, QUEUED, BUILDING, VERIFYING, CORRECTING, CHECKS_PASSED and NEEDS_YOU. It composes existing Builder, verification and two-cycle Debug stores; it adds no Builder execution/runtime behavior. Unknown restart state fails closed. No SSE, generic workflow engine or provider plugin system.

Native authoring uses bounded committed source and, for UI proposals, a protected BASE reference. The reference has no claim authority. Protected execution archives frozen Git objects into a fresh tree, restores pre-existing BASE tests and runs each native claim separately. Runner observations and native judge expectations live in separate processes. Exactly one matching passed test with exit zero and certified cleanup is required. Runtime/unknown judge failures are inconclusive. Static review flags and dependency changes require inspection and cannot be manually promoted to native PASS.

CHECKS_PASSED waits for the second human choice. LANDED/ABANDONED are immutable outcomes. Land journals a fixed commit/tree/BASE/ref intent, creates an absent local cc/<mission-id> branch without checkout/merge/push, and only reconciles its exact ref. Human decision requests and completed effects are distinct records.

Migration 12 adds acceptance acknowledgments, workflow/decision records and terminal outcome/intents. Prior tables, source ownership records and historical checks are retained. Deprecated public review/manual-start commands and their screens were deleted; bounded read-only evidence and genuine exception controls remain.

No Receipt exists. The next Receipt work belongs to Breakout 14.
