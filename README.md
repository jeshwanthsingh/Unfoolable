# Command Center

A local workspace for registered Git projects and frozen-Candidate verification. The primary v1 verifies committed code using protected existing tests and reusable approved project recipes. AI task checks are an optional advisory bonus, not a mandatory planning or landing gate.

## Verification v1

1. Run BASE versions of existing unittest/Vitest tests against the exported Candidate. Candidate-edited tests are non-authoritative diagnostics.
2. Run all admitted, approved recipes for the associated project. Admit each recipe once on known-bad/known-good versions and reuse its immutable identity.
3. Optionally request up to two AI task-check authoring attempts. Only fully admitted checks execute. Unadmitted claims remain NOT CHECKED.

VERIFIED means mandatory layers and every admitted task check passed. PASSED WITH GAPS means mandatory checks passed with disclosed coverage gaps. Both permit an explicit local Land decision. FAILED, ERROR, stale evidence, missing recipes and uncertain cleanup block Land. Zero collected never passes; skipped and excluded tests are named.

Land creates a new local `cc/verify-<id>` branch containing the frozen tree as one commit on BASE. It does not check out, merge, push or alter the working tree/index. Changed source state, branch conflicts and modified evidence fail closed.

See [Verification v1](docs/VERIFICATION_V1.md) for recipe administration, assurance limits and scope rules.

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

The coordinator and browser UI bind to loopback. Configuration: `COMMAND_CENTER_DATA_DIR`, `COMMAND_CENTER_PORT` and `COMMAND_CENTER_PROJECT_ROOTS`. Existing Host/Origin protections apply to every mutation. Runtime databases, browser evidence, oracle assertions and auth material remain ignored by Git.

## Experimental Mission orchestration

Registered Projects, Missions, read-only context, Spec preparation and the isolated Builder remain available as experimental functionality. Automatic analysis/planning/per-task oracle preparation is not the v1 entry point. Its existing permission, cancellation, restart reconciliation, bounded correction and local Land safety controls remain intact. No new orchestration behavior is claimed.

Builder remains pinned to codex-cli 0.160.0 / gpt-6.1-sol with the existing ChatGPT entitlement. No new paid API billing or dependencies are configured. In-process native-test/observation forgery and unobserved deliberate process detachment remain residual risks; this is not VM containment. No Receipt is implemented.

### Ticket loop v1

`./cc ticket new "request" --repo /absolute/repo` records the committed BASE and queues one plain-Codex build. Each build/fix uses a fresh session in a private clone/worktree. Protected checks run after freeze; two fixes maximum, with the second starting from clean BASE. Unsupported checks remain **NOT CHECKED**, never passing. `ready_for_review` requires an explicit `./cc ticket keep ID` or `discard ID`; Keep creates `cc/ID` on BASE without checkout, merge or push. `list`, `show ID --open`, `retry ID` and `stats` are available. Set `COMMAND_CENTER_PORT` and `COMMAND_CENTER_DATA_DIR` consistently for server and CLI.

Ticket API commands require a local operator capability stored mode 0600 in the data directory. `show --open` passes it in a fragment, removed immediately by the UI. It is never logged. Restart interrupts unfinished tickets; only explicit Retry resumes them. The existing Mission workflow remains experimental.

### Project playbooks v1

New tickets require an approved project playbook before building. Missing playbooks are proposed from committed metadata by read-only inspection and stop at **Needs You**. `./cc playbook show /repo`, `approve /repo`, and `edit /repo` manage the proposal; edit prepares a local JSON draft and prints the explicit apply command. Editing invalidates approval. Setup/test argv, safe environment, runner, timeout, known BASE failures and flaky names live in protected CC data, not the repository. Approval resumes matching waiting tickets.

Checks run in fresh BASE and Candidate archives. BASE must pass or match explicitly approved named failures. Candidate-edited tests are replaced by BASE tests; zero collection never passes, and skips/known failures are named gaps. Flaky annotations never waive a failure. Playbook results are regression evidence, not proof of new intent. Setup has no network installation entitlement; protected exports, fixed runtime binaries, loopback-only fixtures and existing process-cleanup rules apply.
