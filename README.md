# Unfoolable

AI does the work. Nothing fools the check. The repository remains named `command-center`; `./unfool` and `./cc` both open the same local tool.

A local workspace for registered Git projects and frozen-Candidate verification. The primary v1 verifies committed code using protected existing tests and reusable approved project recipes. AI task checks are an optional advisory bonus, not a mandatory planning or landing gate.

## Main screen

Run `./unfool chat` (or `./cc chat`) to open your private screen. Ask for work, review the proposed task, then choose Start. Task rows show recorded progress and check results in plain words. Accept and Reject keep the existing exact-item Touch ID protection; incomplete or flagged work still requires opening every changed file first.

See the proof opens the check summary and highlighted file review. Original engineering records remain under Technical details. Settings offers light/dark appearance and three Hallmark looks; Assay is the default. Original working tools and historical visual experiments remain in Labs. No checker, Builder or approval policy changed in this design.

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

### Jarvis chat (thin foreman)

Run `./cc chat` to open the authenticated chat, or `./cc chat "what's running?"` to submit a message. The browser removes the operator fragment immediately. Use the same data directory and port as the coordinator.

Only drafting uses AI: a fresh read-only pinned Codex session converts your message into a title, repository, request and done criteria. It may ask one question. Review or edit the versioned draft and press **Start**; messages alone never start work. Draft token usage is recorded, including rejected attempts. Status answers and ticket updates come from SQLite events; the fuel line uses the read-only account limits endpoint and shows unknown if unavailable.

Keep, Discard, Recheck, playbook approval and existing permission decisions use exact-item buttons. A changed or already-resolved item rejects the old button. Existing explicit ticket CLI controls remain available. Keep creates only the local `cc/<ticket-id>` branch; chat supplies inspect and manual merge commands. CC never merges or pushes.

The test suite uses four workers because its fixtures launch real protected processes. This avoids oversubscribing process-recording and correction fixtures; their assertions and deadlines are unchanged.

New live approvals require a registered owner passkey and a fresh exact-item confirmation. Until owner enrollment, approval stays unavailable. Existing approved playbooks remain reusable. Tests use isolated TEST stores; test approvals are labelled as fixtures. See [approval boundary](docs/APPROVAL_BOUNDARY.md).

Human decisions: run `./cc chat` on localhost and register your platform passkey. Initial enrollment also asks for macOS biometric confirmation. CLI decision commands open an exact-item browser confirmation and cannot decide alone. See [passkey setup and limits](docs/PASSKEYS.md).

### Independent Test Writer v2

The writer reads the full committed BASE through a bounded read-only capability, never the Candidate, Builder conversation or hidden graders. Secret-file names are excluded explicitly; Git link targets remain inert text. For ordinary tasks it returns one native unittest/Vitest/Node test file. Only that file is added to fresh protected BASE/Candidate exports, with BASE test helpers restored. Admission requires a real BASE assertion failure and two consecutive Candidate passes; setup errors allow one repair using BASE output only. Skips and zero tests never pass.

The fixed Round 5 scoring set confirmed 4/11 correct-labelled changes, with 0/8 wrong changes VERIFIED. This missed the 6/11 bar, so the writer is **advisory only**: visible tests and disagreements never alter the verdict. Existing protected checks still block failures. Builder model, runtime, permission profile and human confirmation gates are unchanged. See `artifacts/test-writer-v2/RESULT.md` for costs, gaps and evidence.
