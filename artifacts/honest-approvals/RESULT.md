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
Fresh user Touch ID Recheck completed on frozen source. Ticket b15600b3-6803-4ae8-b6ac-d6d8948b78bc is ready_for_review, PASSED WITH GAPS, with no recorded failures. Candidate b9512392f9285cb039fb00695df0efcd760d668b and Builder attempt count 1 are unchanged. No Keep/Discard decision was recorded.

Risk is RED because a test file changed: 9 added/deleted lines across research_router/cli.py and tests/test_source_add.py. Neither file has been marked viewed; Keep is intentionally locked until the user opens both. Discard remains available through the existing passkey flow.

Six quality gates passed with no new findings. OSV is not applicable because BASE has no supported dependency lockfile. The remaining gaps explicitly state that the Test Writer is advisory and regression guards do not independently prove the new intent. TICKET.json contains the exact protected-test counts and recipe applicability results.

A legacy approval migration directory bug was fixed and regression-tested, then a fresh real passkey approval was persisted. Earlier in-development rechecks failed closed when the protected evaluator changed; the successful final run used the unchanged frozen implementation throughout.

## Limits
Opening each diff records access, not proof of reading or understanding. Local-only copies with the same root history deliberately share repo identity, as requested. No sandbox, protected-check or passkey bypass was added. No paid API, push, merge or deployment was enabled.
