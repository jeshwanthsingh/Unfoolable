# UI-5 Alive — verification checkpoint

Branch: codex/alive, from main 6277614. Implementation tested at 217e8ba. Local only; no push, merge or deployment.

Implemented: bounded real-event activity, Build/Check/Proof track, observed old-test counts, 20-second quiet fallback, finite event-gated moments and full-screen Watch it work. Existing passkey decisions and sandbox/checker policies remain in force. No new app dependencies.

Verification: 989/989 tests pass, zero skipped; typecheck/build pass; 67 protected read targets denied with own Git/SQLite/write checks working; 12 negative controls non-PASS (5 FAIL, 7 INCONCLUSIVE); offline Gitleaks audit has zero unresolved findings (one existing synthetic fixture triaged).

Three official Playwright MCP review passes at 1440/390, plus final scroll/focus checks. Reduced motion is instant and idle measurements show zero animation frames/requests. Native font 404 fixed for the exact installed font. New-test results cannot inflate the old-test display count. See visual-review.md for findings, corrections and measurement limits.

First real run: a659a71a, author-option help. Builder finished, 172/172 old tests reported passing, then the existing token budget stopped the ticket at 107383/100000. State needs_you, NOT CHECKED. No result strike or overall pass is claimed for it. Its stopped recordings are retained.

A separate README-only task is drafted, waiting for human Touch ID Start. Same model, runtime, sandbox and token limit. The new live Ask-to-result recording is not complete at this checkpoint. Historical replay clips are labelled as historical reviews, not new runs.

All Accept/Reject decisions remain untouched. Raw browser recordings and private tool glue stay in ignored .work/ui5. No billing or paid API was enabled.
