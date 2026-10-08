# Two Human Decisions Implementation Plan

> **For agentic workers:** Use the supplied ownership boundaries; implement inline and independent identity, landing and UI tasks in parallel.

**Goal:** One acceptance-check decision before automatic execution and one Land/Abandon decision afterward.
**Architecture:** Existing protected author/Builder/verifier/Debug stores remain execution authorities. A small persisted Mission workflow coordinates automatic preparation and transitions; a merged Spec view exposes the one approval. Stable content IDs retain separate immutable binding/history records. Terminal outcomes perform only explicit local Git ref creation or abandonment.
**Tech Stack:** Node24, strict TypeScript, SQLite, React; no dependencies.
**Spec:** User Breakout12 request in this thread.

## Global Constraints
- Base3a06d90, codex/breakout-12. No model/runtime or Builder changes.
- No Receipt; moved to Breakout14. No weakening oracle/admission.
- Two-cycle correction budget unchanged. Exceptions fail closed to Needs You.
- Land one commit on BASE at cc/<mission-id>, no checkout/merge/push.

## Review Focus
- Identical acceptance/retry must not start duplicate workers or change Recipe identity.
- Dirty/moved source after Spec acceptance blocks automatic Build and never resets user work.
- Restart at any transition must not silently approve/replay unknown effects.
- Historical/mismatched PASS cannot authorize landing; branch conflicts never overwrite refs.
- Oracle rejections/skips/empty reports remain non-PASS and automatic flow stops.

## Steps and verification
- [ ] Content identity: hash-derived Evaluation/Recipe IDs; deduplicate identical review content while keeping input/evaluator/BASE fencing. Test actual Therapy2 B11 reacceptance records, changed-content negative tests and old integrity regressions.
- [ ] Terminal outcomes: migration/outcome ledger; current protected PASS required; Git pack/tree import, commit-tree and atomic absent-ref update. Test dirty worktree unchanged, one-parent exacttree, repeat/conflict/race/restart and abandon.
- [ ] Automatic workflow: creation -> context/analysis/questions -> generated Contract -> generated single-Slice Plan/oracle -> Spec review; approval -> Build -> verify -> bounded Debug -> checks passed. Persist phase/errors and interaction timestamps. Deterministic state-machine tests including dirty/HEAD changes and failed oracle.
- [ ] Merged UI: delete separate Contract/Plan review and manual normal build/verify controls; show goal/non-goals and exact native summaries/assurance/red results; Land/Abandon only after current PASS. Browser verification and keyboard/error checks.
- [ ] Fast lane: one observed reproducible defect maps to one CHANGE claim and native GUARD cases from existing tests; same admission, no extra gate. Run research-router proof.
- [ ] Evidence: real A/B with timestamped decision ledger, fixed identities, natural correction only if it occurs. Full permitted suite, typecheck/build, unchanged negative corpus, secrets scan, deletion counts and local commit. Do not begin another breakout.
