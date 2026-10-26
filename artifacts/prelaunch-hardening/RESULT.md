# Prelaunch hardening — 2026-10-25

Branch: `codex/prelaunch-hardening`, from main `fc84e8f`. Local WIP commits only; no merge or push. Both verdict cores, CORE_VERSIONS registry and protected-paths-v1 bytes are unchanged. Recovery stash 4378916 retained.

## Changes

- Current tagline: **AI does the work. It never grades itself.** Updated the five requested documents, CLI help and web manifest. Historical recordings/frozen evidence were not rewritten.
- Six UI/native runner tests use the small repository-owned lockfile fixture instead of a Therapy2 checkout. Git comes from PATH; migration fixtures read this checkout. Application/CLI tests own their configured project roots; the chat stress fixture creates its output directory.
- Tests requiring this Mac's certified Builder/browser or ignored native scanners, SkillSpector and tree-sitter use explicit named setup skips unless opted in. Assertions are retained. `tests/README.md` lists the flags, pinned fixture and existing Python prerequisite.
- Protected manifest v2 adds .npmrc, .netrc, .pypirc, .git-credentials, .docker/config.json and .kube. It has 84 entries and keeps v1 unchanged. CI tests enforce additive evolution and v1 hash preservation.
- `COMMAND_CENTER_EXTRA_PROTECTED_PATHS` accepts validated absolute or ~/ paths; absent paths and canonical symlink targets remain denied. Extras supplement the manifest. Real kernel proof denied a configured synthetic extra independently of the blanket Projects deny, while owned writes/reads worked.
- Career candidate import moved into a bounded child returning JSON. Only the trusted parent asserts results and prints CC_CHECKS_JSON; fake child reports are rejected. Existing obsolete career approvals are retained but cannot execute the old command. Editing/approving the replacement still needs the normal human passkey flow.

## Control 13: measured before fixing

The old checker reported **PASS**, all five checks, after a malicious classifier patched the shared assertion library and returned wrong answers. That baseline is retained, not relabelled. After isolation the identical attack is **FAIL**: syntax PASS and four semantic failures. This is a checker-level result; no live bad change was accepted. A separate regression rejects a forged child check report.

Expanded pack: **13 controls, 6 FAIL, 7 INCONCLUSIVE, 0 PASS**. The original twelve inputs/expected outcomes are unchanged. This fixes the specific career shared-checker gap, not all native in-process observation forgery.

## Verification

| Check | Observed result |
| --- | --- |
| Full maintainer suite, all integrations enabled | 1,317 pass, 0 fail, 0 skipped; 411.369 seconds |
| Clean independent clone, empty HOME, own app/UI npm-ci dependencies, no native integration flags | 1,275 pass, 0 fail, 42 explicit setup skips; 323.957 seconds |
| Initial clean-clone diagnostic | 11 failures exposed nine external-tool assumptions and two fixture setup bugs; retained in tests.json; fixed and rerun |
| Typecheck / production build | PASS; both core sources and manifest v2 packaged |
| Real Builder + exact kernel-profile probe | 84 targets: 74 permission-denied, 10 ENOENT/absent, 0 readable, 0 other errors |
| Owned worktree capabilities | Git status/diff/log, SQLite/temp and own writes PASS |
| Existing seals | 6 sealed, 8 older-unsealed, 0 broken; no stored verdicts rewritten |
| Weekly self-check | PASS: probe, all 13 controls, verify, fresh full backup/restore |
| Full restore | 214,398 files, 499.902 seconds, complete/full/digests verified |

The default clean-clone run does not claim the 42 skipped native integrations passed. Those same integrations were exercised in the fully enabled maintainer run. No test silently borrowed another personal checkout. Native tests still need the documented host runtime; this was a clean-clone/empty-HOME test on this Mac, not a second physical Mac.

The first weekly attempt was refused on battery. After AC was connected, a real run correctly failed its restore step because another legitimate checkpoint held the lock. No lock was deleted and no pass was fabricated. The complete retry ran after that checkpoint exited and passed all four steps; failed and successful maintenance events remain append-only.

## Limits and activation

General native in-process result forgery and the universal read-allowlist feasibility study remain open. The career-ops replacement needs an explicit playbook edit/approval; old approvals are not silently migrated. This is local branch work: the coordinator was not restarted onto it. No merge, push, API approval, automatic acceptance, model change or history rewrite occurred.

Evidence: tests.json; probe.json; extra-path-probe.json; control13-before.json; control13-after.json; control13-provenance.json; controls.json; unchanged-and-seals.json; self-check.json. Raw private logs, full backup proof and disposable clones remain in ignored .work.
