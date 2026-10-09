# Command Center

A local engineering workspace for registered Git projects and durable Missions. A Mission records raw intent, prepares read-only project evidence and protected acceptance checks, then runs one isolated coding slice after approval.

## Two decisions

1. **Approve acceptance checks** in the single Spec review: goal, non-goals, each native test, assertion summary, assurance tag and real red-on-base result.
2. **Land or Abandon** after current protected checks pass. Checks Passed is not a completed Mission.

Context capture, analysis, generated Contract/Plan preparation, Build, verification and eligible bounded correction are automatic. Clarifying questions, out-of-profile permissions, source admission failures and Needs You escalations remain explicit exceptions. Default: one vertical slice; no separate slice or Contract/Plan review.

## Development

Use Node 24 and the existing dependencies:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm start
```

The coordinator and browser UI bind to loopback. Configuration: COMMAND_CENTER_DATA_DIR, COMMAND_CENTER_PORT and COMMAND_CENTER_PROJECT_ROOTS. Existing Host/Origin protections apply to every mutation. Runtime databases, browser evidence, oracle proposals and auth pointers are ignored by Git.

## Protected checks

A separate Codex operation proposes native checks outside the Candidate. Every CHANGE must produce a real assertion failure on BASE; every GUARD must pass BASE. Node-judge runtime errors, skips and empty collection are inconclusive. The Builder cannot read the oracle or coordinator source/runtime. Candidate execution uses Git archives, restored BASE tests, scrubbed environments and separate observation/judge processes. Candidate-authored tests are diagnostics only.

Current native interface shapes are ResearchRouter CLI/unittest and Therapy2 component browser/Vitest; this is not a universal runner system. Single reproducible-bug analysis can select a fast lane with one CHANGE reproduction and an existing-test GUARD; it still needs the same BASE admission.

Accepted identities are content-addressed within immutable Mission/input/Spec/evaluator bindings. Reaccepting identical content reuses Evaluation and Recipe identity, without resetting an unresolved inspection or starting another worker. Binding changes still invalidate currentness.

## Landing

Land imports the frozen tree and creates exactly one local commit on BASE at cc/<mission-id>. It does not checkout, merge, push or change the user's staged/untracked files. Branch collisions and source identity changes fail closed. Durable intent reconciles only the exact recorded ref after interruption. Final Mission states are LANDED and ABANDONED.

Builder remains codex-cli 0.160.0 / gpt-6.1-sol using the existing ChatGPT entitlement. No new paid API billing or runtime dependencies are configured. Deliberate in-process observation forgery and unobserved process detachment remain documented residual risks; this is not VM containment.

See docs/ARCHITECTURE.md and artifacts/breakout-12/RESULT.md for the implementation and actual evidence. Receipt is deferred to Breakout 14; no Receipt is implemented.

## Verify-only

Use **Verify a Candidate** to supply a local repo, committed BASE and Candidate refs, and original intent. Review and approve the authored acceptance checks before protected Candidate execution. No analysis, plan or Builder is invoked. Unsupported checks are HUMAN / NOT CHECKED; passing the rest is PARTIAL, not full acceptance. See [Verify-only](docs/VERIFY_ONLY.md) and [pilot failures](docs/PILOT_FAILURES.md).
