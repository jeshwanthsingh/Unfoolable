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

## Accepted network boundary

The user accepted enforced denial of all non-loopback OUTBOUND traffic; rejecting wildcard binding itself is not required. Checker runners now use the existing loopback exception, while judges retain network denial and Builder permissions remain unchanged. HOST and BIND_ADDRESS default to 127.0.0.1 as a cheap advisory fixture mitigation; they are not an enforcement boundary.

The extra time-boxed en0 inbound check is recorded in step-0-network.json. No sandbox network filter was broadened beyond the existing localhost exception. If inbound succeeds, residual risk is labelled: wildcard bind allowed; inbound exposure limited to test duration. All fixture processes are owned and stopped afterward.

Step 0 can proceed to the ticket loop. No hidden grader, model/runtime, billing, push, merge or deployment changes.

The extra en0 connection succeeded. Residual risk: **wildcard bind allowed; inbound exposure limited to test duration.** Both outside-bound connection attempts were permission-denied, loopback served, and the owned test process exited 0 after 0.88 seconds. HOST/BIND_ADDRESS mitigation is advisory only.
