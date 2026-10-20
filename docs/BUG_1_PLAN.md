# BUG-1 plan and verification contract

0. Audit live signing-key use; revoke unused legacy key. Test every timestamp rejected.
1. Bound log input at 20 KiB, strip VT escapes using Node, scan with existing offline Gitleaks/detect-secrets, redact whole detected lines before chat persistence or AI. Store redacted log and literal error signature as data. CLI and Ask share this path.
2. Builder reproduction-only stage: one new native test file, no source edits. Archive BASE fresh; protected native runner executes immutable test and must report the matching project exception/message/frame, no skips/zero/setup failures. No admission means Needs You and no fix session.
3. Fresh Builder fix stage. Locked test re-runs against BASE and frozen Candidate with restored BASE tests. One explicit bug fact wraps existing checker facts; failure/error never improves, missing reproduction never VERIFIED. Existing fact shapes retain identical traces. Artifact/test/input hashes bind the reproduction.
4. Card/Proof/Workshop derive redacted log, reproduced and fixed markers from stored events only; all human decisions unchanged.
5. Five safe seeded cases using pinned real Codex runtime, isolated data and locked checks; report tokens and honest non-reproduction, no false fixed.
6. Full suite, typecheck/build, protected paths, twelve controls, 61-case zero-difference replay, and CLI verify of a new isolated sealed bug ticket; local WIP commits only.

Unsupported runner/log signatures stop honestly without fixing. Logs are never grader prompts. Source repositories and live decisions are not test fixtures.
