# CORE-1 completed

Source: local commit 14a6857 plus final factual documentation/artifacts. No push, merge, deployment, historical verdict change or golden-record rewrite.

- Pure core: `packages/shared/verdict-core.ts`, 135 lines. All aggregate rules and legacy adapter behavior are explicit core paths. Supplied native verdicts carry protected-verifier provenance; Builder text is not a source.
- Old 3c94150 logic vs new core: 15 reconstructible events, zero differences. Four earlier events lack original facts and are listed, never invented. Original golden archive hash is unchanged. Event 586 keeps its historical PASSED WITH GAPS label and existing current-policy annotation.
- Explain b15600b3: latest check is event 664, stored PASSED WITH GAPS. Event 592 is earlier, stored NOT CHECKED, and its regression test returns NOT CHECKED. Both CLI and Proof identify the event and expose core trace.
- Full suite: 1,095 pass, 0 fail/skip/cancel, 332.506 seconds under caffeinate. Includes 80,000 property combinations and pinned TypeScript authority lint.
- Typecheck and production build pass. Existing bundle-size / ineffective Pixi dynamic-import warnings remain.
- Real Builder probe: all 69 protected targets denied, all six local sensitive endpoints denied, owned Git/temp/SQLite writes work, cleanup certified.
- All 12 negative controls non-PASS; exact results in negative-controls-final-summary.json.
- Real npm/pip attempts unsuccessful, no package artifacts, no successful observed connections or package bytes; direct non-loopback attempt denied. Error wording no longer decides the test. Instrumentation is not kernel packet capture; unchanged sandbox enforces denial. NordVPN/DNS causality is unknown; neither changed here.
- Dependency closure: 148 files / 3,982 edges -> 151 / 4,086. Aggregate decision authorities: 8 files / 8 functions -> 1 file / 1 function. Definition and exclusions: graph/rule-authorities.json.
- Graphify 0.9.92 Apache-2.0, CLI only, code-only, network denied; zero model calls. Skill remains uninstalled (DO_NOT_INSTALL). Local HTML render: zero HTTP requests/page errors. Core has no external imports/calls in graph; authority lint provides independent validation.

See FINAL_VALIDATION.json, docs/CORE_1_AUDIT.md, docs/CORE_1_COMPLETENESS.md, docs/INVARIANTS.md and docs/DESIGN_FACTS.md. POLICY_PROPOSALS.md proposes (does not apply) treating empty supplied evidence as ERROR. Remaining limitations: graph incompleteness, unretained historical inputs, trusted observation/provenance metadata rather than signatures, and deliberately preserved legacy aggregate compatibility.

Credential scan: changed source/tests/docs have no findings. Artifact scan has three copies of one generic-key false positive: a JavaScript method descriptor in the hash-verified vis-network asset, embedded unchanged in before/after HTML. No scanner policy was relaxed; see credential-scan-final.json.
