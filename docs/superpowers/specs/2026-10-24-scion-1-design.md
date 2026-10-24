# SCION-1 design

Base: published main. Local commits only. No push, merge or deployment.

## Purpose and boundary

Make review easier to understand, catch explicit project-rule violations, and expose stale protection checks. Add nothing without an in-scope attacker or a documented friction. Create docs/THREAT_MODEL.md from DESIGN.md's existing boundaries: the Builder and repository contents are untrusted; the owner, host OS, protected installation and approved checks are trusted. Host compromise and complete native in-process forgery prevention remain out of scope.

| Addition | Threat or observed friction |
| --- | --- |
| AST change labels and deterministic summary | Builder descriptions are not trustworthy; review text and raw diffs were hard to understand. |
| Raise-only risk rules | Sensitive or disguised edits must not look safer because the Builder calls them documentation. |
| Approved project rules | Untrusted code can violate a project's explicit architectural constraints while old tests pass. |
| Weekly self-check | Dated protection labels and unnoticed environment failures need fresh, honest evidence. |
| Request/Builder seal binding | A result must not be transplanted to a different request or attributed to a different Builder. |

## Approach

Extend the existing shell and approved playbook format. Reuse pinned Tree-sitter, protected Opengrep/ast-grep, the coordinator, event log, backup helper and signer. Keep scoreVerdict and released core bytes unchanged. No new AI roles, source-control service, generic rules engine or background repair agent.

Alternatives rejected: a separate scheduler/service adds another ownership boundary; passing classification into scoring changes authority unnecessarily. Classification and review color remain separate from the verdict. Explicit protected project-rule failures use the existing failed-check facts path.

## Change classification and review

Read frozen BASE and Candidate blobs, not Builder text or the mutable checkout. Parse complete files with the existing pinned Tree-sitter tools, then associate changed ranges with syntax nodes. Classify every hunk as documentation/comment, string literal, tests, logic, configuration/build, or dependencies. Mixed or ambiguous syntax is logic; parsing errors, unsupported languages and missing parser dependencies never produce a reassuring label. Recognize executable examples/embedded code in documentation conservatively. Record content hashes, classifier version, ranges and function names. No candidate code is imported or executed for classification.

The Proof summary uses those records only. It says text or syntax changed; it never treats a string-only change as behaviorally harmless. Preserve the complete diff and mandatory opening of every changed file.

Existing reviewRisk establishes the floor. Optional approved path/kind rules can only increase risk, never decrease it. A documentation-only classification adds no risk itself, but never removes existing flags. Show the resulting plain-English reason on the card and Proof pass. Editing rules invalidates playbook approval through the existing exact-item Touch ID flow.

## Project rules

Store bounded, declarative ast-grep/Opengrep rules with the playbook; no shell commands, downloads or remote rules. Hash their contents into the approved definition and check evidence. Run on frozen BASE and Candidate exports using the existing protected local tools, with network denied and deadlines. Only new changed-line findings count as failures. BASE findings are pre-existing issues, never blamed on the Candidate. Tool/configuration failure is ERROR or explicitly not applicable, never a clean pass. An unapproved rule never runs as an authoritative check. Old definitions retain their original hashes when optional fields are absent.

## Weekly self-check

Use the existing coordinator, with no new daemon. A check is due seven days after the last completed attempt; a fresh install is due at the next idle AC-power opportunity. Wait for an idle coordinator and AC power; run one maintenance job at a time. New work, power loss or STOP cancels it with certified owned cleanup, leaving an interrupted result. A failed check records failure and never auto-fixes or silently loops.

Run the real protected-path probe, every registered negative control, verification of all seals, and a fresh backup/restore comparison into an isolated directory. Require complete result inventories and zero broken seals. Older unsealed records remain older, not failures or fabricated seals. Restore never overwrites live data. Persist start, step result, interruption and completion as typed append-only events, with bounded artifact references. The main-screen status and drawer count/date read the latest appropriate stored result, not build-time constants. Missing or interrupted evidence stays unknown/stale. No fake per-ticket cheat count.

## Seal format v2

New attestations bind the exact stored request SHA-256 and the trusted Builder identity captured by the kernel: configured/reported model identifier, model version if reported, and certified CLI version. Never parse the Builder's prose for identity; an unavailable provider version is explicitly unknown rather than invented. Bind the selected attempt and frozen Candidate. Rechecks retain the Builder identity associated with that Candidate.

Verification dispatches by the recorded attestation format and core identity. Existing envelopes, public-key history and v1 core bytes remain valid and unchanged. Tests cover request/identity tampering, version confusion, old v1 seals, new v2 seals and unknown-format rejection. Classification alone has no signing or decision authority.

## Verification and sequence

1. Threat/design facts and baseline hashes/replay/old-seal verification.
2. Classifier: tricky strings/comments, mixed hunks, executable documentation, renames, parse errors, unknown languages; no repository-code execution.
3. Raise-only risk/playbook rules: property tests prove no decrease; existing approval binding still rejects edited definitions.
4. Proof/card summary: real bound facts, every-file review, stale actions and Touch ID unchanged; desktop/phone screenshots.
5. Project rules: planted new violation fails, old BASE finding is disclosed, tool errors cannot pass; golden replay stays identical.
6. Weekly self-check: injected clock/power/idle runner tests, overlap/interruption/restart tests, then real protected diagnostics; screenshot from stored results.
7. Seal v2 and final validation: full suite alone under caffeinate, typecheck/build, golden replay, all controls, path probe and verify-all on a protected copy of real data. Old records and golden files are never edited.

Local WIP commit after each implementation step. Stop on a golden difference or a negative-control PASS. Preserve earlier unfinished work in its original checkout. No production restart or real human approval is performed merely to obtain a screenshot.
