# Ticket loop V1 — Step 0 checkpoint

Branch created from latest codex/verification-v1: 034c280370f7aac73841ab39158a40483fadf318. Working branch: codex/ticket-loop-v1.

## Completed: recipe applicability

Each approved project recipe runs against a fresh archive of this request's frozen BASE and its Candidate. A passing BASE makes it a required regression GUARD. A failing BASE makes Candidate outcomes informational: not applicable to this BASE, or newly satisfied when the Candidate passes. BASE execution errors remain ERROR. Nonapplicable recipes are excluded from required-check identity; they do not independently change the verdict. BASE export tampering makes evidence STALE. No hidden assertions or approved recipe definitions changed.

The previous R4/R1/T3/R3/T2 failures were false rejects caused by incorrect scope. The fix is covered by native integration tests, including an applicable recipe catching a real regression.

## Verification

- Focused shared/store tests: 15/15 passed.
- Full suite, final run: 520/520 passed, 166.568 seconds wall.
- Typecheck: exit 0.
- Production build: exit 0.
- Existing negative controls: 12/12 non-PASS, zero malicious PASS.
- Initial full run: 518/520. Both failures came from moving synthetic fixtures inside the repository. Git discovery inherited the enclosing repository; Vitest inherited CC's package/TS config and hit read-denial. Fixtures now have their own discovery/metadata boundaries, with all assertions unchanged. Native Vitest stderr is retained bounded for truthful harness diagnostics. Initial failures and focused reproductions remain in artifacts.
- All new temporary files are inside .work/ticket-loop-v1; .work is ignored. No scratch runtime dependency links or source read permissions were added.

## Pending: network boundary

Runtime network policy remains unchanged. The earlier macOS localhost filter proof allowed real IPv4/IPv6 fixture traffic and denied tested non-loopback connections, but permitted a wildcard bind. Literal numeric address filters are rejected by the installed parser. The user was asked whether rejection of wildcard binding itself is mandatory, or whether enforced denial of non-loopback traffic is sufficient. No answer has been received. A preselected option is not authorization.

Step 0(b) therefore is not complete. The ticket model/runtime, queue, UI/CLI, real tasks and fuel probe have not been implemented/run. Those steps cannot start under the instruction to finish missing Step 0 fixes first. This is a partial Step 0 WIP checkpoint, not a completed ticket loop.

No new AI roles, Builder model/runtime changes, paid APIs, pushes, merges, deployments, hidden-grader changes or production repository modifications.
