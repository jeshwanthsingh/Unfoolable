# Round C0 — Honest approvals

Branch: codex/honest-approvals; base: 149096a. Local work only.

## Implemented
- Repository-bound playbooks: sorted root commits + origin URL, with the explicitly approved no-remote identity for local-only repositories. Exact playbook hash still required. Legacy path-only approvals need fresh Touch ID. Existing admitted recipes reuse their immutable evidence only across matching identities.
- GREEN / AMBER / RED review reasons; RED for changed tests, playbook/CI/lockfiles, warnings/findings, or excessive/unmeasurable diffs.
- Server-enforced per-file views before AMBER/RED Keep. View records are protected and bound to Candidate, check evidence, playbook and risk. New evidence invalidates old views. GREEN Keep and Discard retain the existing passkey flow.
- Default cap: 400 added/deleted lines or 15 files; overrides alter the approved playbook hash.
- Actual dirty-checkout clean-clone usage posts one event-derived chat line.
- Failed rechecks retain the original playbook/gate scope.

## Validation
- Frozen full suite: 907/907 passed, 0 skipped, 314.34 seconds.
- Strict typecheck and production build passed. Zero new dependencies.
- Real Builder probe: 0/65 protected paths readable; owned Git status/diff/log, SQLite/temp, and writes passed.
- Desktop 1440px and mobile 390px: RED reason visible, warning before disabled Keep, no horizontal overflow; synthetic review fixture explicitly labeled.
- Offline changed-file Gitleaks scan: 0 findings.
- Final negative-control results are saved beside this report.

## Live ticket
Candidate b9512392f9285cb039fb00695df0efcd760d668b is unchanged. No Builder or Keep/Discard was requested. A legacy migration directory bug was fixed and regression-tested; a fresh real passkey approval was subsequently persisted. The earlier recheck failed closed because evaluator source changed while C0 was being implemented. A final frozen-source recheck needs a fresh Touch ID confirmation; TICKET.json records the current state, not an inferred success.

## Limits
Opening each diff records access, not proof of reading or understanding. Local-only copies with the same root history deliberately share repo identity, as requested. No sandbox, protected-check or passkey bypass was added. No paid API, push, merge or deployment was enabled.
