# Advisory reviewers

Intent, Readability, and (visual changes only) UI run as independent, fresh, tool-free read-only Codex sessions after grading. Only the original request, diff, quality results and UI screenshots enter their input. No Builder message, summary, grader oracle, truth label, source browsing or external network tool is available. Each has a separate 15,000-token ceiling and a three-minute deadline; errors are advisory and never a successful review.

Findings are at most three per role, anchored to a file and line in the supplied diff, with one plain sentence and serious/note classification. Serious means a concrete requested-behavior failure, safety defect or substantial maintainability defect, not speculative style advice. Notes never enter core facts, freshness hashes, risk colors or passkey binding. They are separate versioned ticket events tied to the Candidate and check sequence; stale notes are not presented as current.

Before measuring: all reviewers are OFF by default. A role may remain ON only if it flags at least two of eight wrong study cases, flags zero of eleven correct cases, has no protocol/cleanup failures, and is measured on both truth classes. Negative-control results are reported separately. Missing screenshots mean UI unavailable, never a clean review. The same frozen 19 cases and 12 controls are used without tuning, retries or grader changes. No test or study writes human approvals against live data.

Per-playbook `skipReviewers: true` skips all roles. The optional field is omitted by default, preserving existing playbook hashes. Editing it uses the existing approval mechanism. Reviewer budgets are displayed separately; their usage never consumes or silently expands Builder/Writer limits.

## Frozen measurement outcome

Both Intent and Readability flagged 5/8 known-wrong study edits and 0/11 known-correct edits, and 8/12 controls each. Each had one rejected unanchored response on a negative control; no retry or prompt tuning was used. Under the registered no-error requirement, both remain OFF. Three wrong unchanged BASE cases had empty patches, so no file/line finding could honestly be produced from the allowed inputs.

UI had zero eligible visual-file patches in this corpus (frontend stores/clients are not visual components). All 31 UI rows are explicitly SKIPPED, not successful reviews. A separate real inline-PNG transport smoke succeeded, but is not calibration and cannot enable UI. No new screenshot producer was added to the protected grader; absent trusted screenshots always means unavailable.

Total study use: 485,010 reported Codex tokens (including the rejected responses): Intent 242,571, Readability 242,439. Means across 31 cases: 7,824.9 and 7,820.6 respectively. The separate UI transport smoke used 7,538 tokens. Existing ChatGPT entitlement only; no API keys/billing configured. Reviewer usage stays separate from Builder and Writer budgets.

All roles remain OFF, so no reviewer desks, characters or activity have been added to the Workshop. This deliberately follows the conditional desk rule; original art and event-driven scene are unchanged. Example card screenshots are labelled read-only study replays, not live approvals.

The existing ticket confirmation hashed the complete ticket view and chat binding used the latest event. A narrow display projection now strips only the newly introduced reviewer fields/events from those inputs. Every pre-existing field/event remains, and changes to checks still stale confirmations. Tests cover the real fake-authenticator HTTP path in isolated TEST data and the exact chat binding; passkey verification/consumption code itself is unchanged.
