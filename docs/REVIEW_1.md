# Advisory reviewers

Intent, Readability, and (visual changes only) UI run as independent, fresh, tool-free read-only Codex sessions after grading. Only the original request, diff, quality results and UI screenshots enter their input. No Builder message, summary, grader oracle, truth label, source browsing or external network tool is available. Each has a separate 15,000-token ceiling and a three-minute deadline; errors are advisory and never a successful review.

Findings are at most three per role, anchored to a file and line in the supplied diff, with one plain sentence and serious/note classification. Serious means a concrete requested-behavior failure, safety defect or substantial maintainability defect, not speculative style advice. Notes never enter core facts, freshness hashes, risk colors or passkey binding. They are separate versioned ticket events tied to the Candidate and check sequence; stale notes are not presented as current.

Before measuring: all reviewers are OFF by default. A role may remain ON only if it flags at least two of eight wrong study cases, flags zero of eleven correct cases, has no protocol/cleanup failures, and is measured on both truth classes. Negative-control results are reported separately. Missing screenshots mean UI unavailable, never a clean review. The same frozen 19 cases and 12 controls are used without tuning, retries or grader changes. No test or study writes human approvals against live data.

Per-playbook `skipReviewers: true` skips all roles. The optional field is omitted by default, preserving existing playbook hashes. Editing it uses the existing approval mechanism. Reviewer budgets are displayed separately; their usage never consumes or silently expands Builder/Writer limits.
