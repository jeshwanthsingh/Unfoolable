# Round B — free quality gates

Status: PARTIAL. Tools, gates, tampering signals and proof are implemented. The real ticket is blocked by the existing required project-recipe gate, not falsely declared passed.

Branch: `codex/quality-gates` from `f491311`. WIP commits per step; no push, merge or deployment. No Builder model/runtime, writer prompts, scoring, or admission changes.

## What changed

- Step 0 separates bounded display previews from real runner-evidence truncation. Genuine truncated runner output still fails closed. Native regression: 11/11. H4/H5 historical cases were not rerun.
- Free tools are installed only in ignored `.work/quality-tools/`. Exact versions, licenses, official URLs, binary hashes and offline database hashes are in TOOLS.json and docs/QUALITY_GATES.md. No application dependency was added.
- Language-appropriate checks compare BASE with Candidate; only new findings on changed lines count. Existing warnings never block. BASE setup failure is not applicable; Candidate execution failure is ERROR. Git-quoted unsupported paths fail closed; Unicode paths are supported through native Git options.
- Native ast-grep reports flag new ordinary skips, assert True, removed assertions and changed expectations. Review flags are red and do not replace restored BASE tests.
- Gate policies are proposed in playbooks, bound to the tool/rule hash, and require existing Touch ID approval. Changes clear approval. Both ticket/chat cards group Locked checks / Quality gates / Test-tampering / Independent test warning / Mutation & coverage.
- Fixed an integration bug observed in the real run: passing project/quality commands can no longer overwrite native NOT CHECKED. An unavailable protected verifier still blocks Keep.

## Planted-problem proof

| Problem | Actual detector | Result |
|---|---|---|
| New unused import/variable | Ruff, oxlint, configured ESLint/typescript-eslint | Caught |
| New wrong return/value type | Pyright, tsc --noEmit | Caught |
| Fake hardcoded GitHub-shaped secret | Gitleaks, detect-secrets | Caught; values redacted |
| New eval pattern | Bandit, local Opengrep rules | Caught |
| Added skip | Native ast-grep | Red review flag |
| Deleted assertion / changed expect | Native ast-grep | Red review flag |
| Existing BASE warnings | Native comparison | Ignored, not blocking |
| Vulnerable registry dependency | OSV with predownloaded database | Caught offline |
| Actual outbound socket attempt | Existing quality sandbox | Permission denied; cleanup certified |

Evidence: python-plants.json, js-plants.json, eslint-plant.json, network-denial.json, focused-final.log. The initial OSV synthetic lockfile omitted a registry resolution and was classified LOCAL; the corrected registry fixture and a no-supported-packages guard prevent an empty scan masquerading as clean. OSV 2.7 uses the SCALIBR cache layout; both cache environment names/layouts were initialized before checks. No network is allowed during checks.

## Real research-router ticket

Ticket `b15600b3-6803-4ae8-b6ac-d6d8948b78bc`. Source HEAD `f7f198123955f6113cb583020d06bb47dc89817f`. Candidate `b9512392f9285cb039fb00695df0efcd760d668b`. The real checkout was dirty, so the run used a disposable committed-HEAD clone; its origin remote was removed. Source files were not changed by CC.

Request: Improve research source add --help: describe --title as "Override the source title". Keep parsing and source registration behavior unchanged. Add a unittest checking that phrase in the source add help output.

One Builder attempt, zero fixes. Protected existing tests: **172 PASS**, layer 1 PASS. Six applicable quality gates PASS, no test-tampering flags; OSV not applicable because this BASE has no supported dependency lockfile. Old BASE findings (Ruff 45, Pyright 2, Bandit 14, detect-secrets 9) did not block.

Initial gate/tampering overhead **32.04 s**; explicit same-Candidate Recheck **26.72 s**. Submit-to-first-review **129.73 s**, including the approval wait. These are one-ticket measurements, not a general benchmark.

Playbook approval was a real LIVE WebAuthn/passkey decision at `2026-10-17T19:28:36.358Z`. The original CLI confirmation request expired, but the separate UI approval was valid and recorded. The subsequent Recheck confirmation was consumed. No Keep/Discard, recipe approval, or new build was performed by Recheck.

Final state: **Needs You / NOT CHECKED**. The cloned project identity has no approved reusable project recipe (layer 2 ERROR). Writer was not started; the missing protected layer cannot be upgraded by quality gates. Keep remains blocked. No approval was copied to the clone to bypass this requirement. REAL_TICKET.json and REAL_PROTECTED_LAYERS.json retain the evidence.

## Verification

- Full suite: **888/888**, zero failures/skips, 321.16 s. This run preceded the final pathname-only hardening; all relevant final code then passed **18/18** focused tests including actual native tools, tampering, recheck and warning behavior.
- First full attempt: 885/886; one pre-existing correction-loop fixture exceeded its 15-second settlement deadline while separate probes also ran. Exact test passed in isolation, and the later full run passed unchanged. The failed log is retained; no assertion or timeout was weakened.
- Final strict typecheck and production build: PASS after final hardening. Changed-file Gitleaks scan: 0 findings with network denied; basic credential-pattern scan: 0 matches.
- Real 65-path probe: 0 protected reads; owned Git status/diff/log, SQLite/temp and writes PASS.
- Twelve original negative controls: 5 FAIL, 7 INCONCLUSIVE, 0 PASS.
- Tripwire, Watchman, budgets, permission and passkey regressions remain green in the full suite.
- Actual React review component inspected with isolated Playwright at 1440px and 390px; red alerts precede Keep, all five groups visible, no horizontal overflow. Screenshots are explicit synthetic review fixtures, not fabricated production activity.

## Limits

This is additional static feedback, not an exhaustive security proof. Opengrep currently has a deliberately small local eval rule set; AST rules cover ordinary supported forms, not every dynamic manipulation. Analyzer configuration/dependency incompatibility is an explicit not-applicable result, never a clean pass. The real clone's mandatory recipe is missing, so this round does not claim a fully verified real ticket. There was no historical remeasurement, hidden-grader change, paid API, new AI role, or sandbox weakening.
