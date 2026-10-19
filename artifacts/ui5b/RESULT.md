# Round UI-5b — finish Alive and skill safety

## Changes

Builder and Test Writer budgets are separate: 120,000 Builder tokens and 40,000 Writer tokens for new tickets. Only two prior tickets supplied usable Builder measurements: 80,224 and 94,070, median 87,147, nearest-rank p90 94,070. P90 plus 25% headroom, rounded to 10,000, gives 120,000. This is a small sample, not a reliable population estimate. Existing tickets retain their recorded limits.

Budget stops offer Continue with fresh exact-ticket Touch ID, once: +50,000 Builder tokens, +20,000 aggregate Writer tokens, +40 commands and +5 active minutes. Spent costs remain charged. Frozen work is rechecked without rebuilding. Accept/Reject remain separate. Tests prove the fixed increment, one use, stale-item protection and unchanged Candidate. The live proof did not need a top-up.

An uncaught repository-identity Git error in the chat projection timer was reproduced in a child process. It now produces a plain recoverable project-access notice; failed identity reads never fabricate a no-remote identity or approval. Three new regressions cover missing repository, timer survival/recovery, and an unexpected Git config failure.

## Skill safety

NVIDIA SkillSpector 2.12.0 (Apache-2.0), official commit 95a52d89fa16f608f0b18ccee76b0918ea4b7eef, installed only under ignored .work/skill-tools. All 147 unique discovered skill folders scanned with --no-llm, scrubbed credentials and enforced network denial. OSV used offline fallback; live CVE lookup and semantic LLM review were not performed. No keys or new paid API billing.

66 SAFE / 60 CAUTION / 21 DO_NOT_INSTALL; zero scanner errors. All 21 flagged folders disabled, original files retained. Installed Codex CLI catalog confirmed 12 loaded flagged entries disabled; nine remaining entries are inactive caches with disable overrides. Restart Codex desktop to refresh its currently loaded skill catalog. These static warnings are not proof of malice or safety. Complete per-skill score, findings, exact paths and versions: SKILLS.md, skillspector.json, skill-inventory.json and scanner-packages.json. Quarantine proof: quarantine-protocol.json.

`./cc skill add /absolute/local/skill-folder` snapshots and scans content before installation. High-risk content requires a fresh Touch ID decision bound to the immutable bundle and report. Symlinks, mutated content, incomplete or LLM scans and conflicting installed names are refused. No new app dependencies. The helper's real native scanner test uses isolated TEST data, never live approvals.

## Real run

Actual Ask: add “Run research doctor to check your local setup.” immediately after the Setup heading in research-router README.md; documentation only. The user completed Touch ID for Start, consumed by the server. Ticket f538ccdb-1ae4-400c-b37b-368c8258a2d8 reached ready_for_review, PASSED WITH GAPS. All 172 protected existing tests passed. No fix attempt or budget extension. 26,049 Builder tokens / 12,622 Writer tokens; active duration 250.893 seconds. Only README.md changed (one added line). Source HEAD remains BASE. Accept/Reject untouched.

The Writer abstained because its fixed context pack omitted README.md, so it could not independently prove the insertion. Python-specific and dependency checks did not apply. Those omissions are explicit, not counted as passes. No authoring or promotion policy was changed to make this run green.

## Recordings

real-task-1440.webm (30 seconds) and real-task-390.webm (29.2 seconds): edited excerpts from the actual run, not replay. Waiting time omitted; raw videos retained in ignored .work/ui5b/videos. One Ask was submitted on desktop. The phone film begins with that scaled desktop Ask excerpt, then the phone camera shows the same real task. Exact cuts: video-cuts.json. Both cameras captured the real result hallmark, then Proof; screenshots in live/1440 and live/390. Frames and screenshots were manually inspected. The amber hallmark means gaps, not verified completion.

## Verification

Typecheck and production build passed. The build retains existing large-chunk warnings. Actual 67-path Builder probe: zero protected targets readable; owned Git status/diff/log, SQLite temp and writes worked. All 12 negative controls non-PASS: 5 FAIL, 7 INCONCLUSIVE. Protected core unchanged.

The first full suite finished 1000/1001: the native Watchman fixture saw 12 denials instead of its exact expected 11. An isolated rerun passed unchanged. A timing race during interruption/cleanup is suspected, not proven; original logs retained in full-suite-first.* and watchman-recheck.json. No assertion or source was changed to mask it. Final full-suite rerun: 1,001/1,001 passed, zero failed/skipped/cancelled, 354.173 seconds under caffeinate -dims. Same source SHA256 as the first run; no assertion or source changes. See full-suite.json. The offline Gitleaks tracked/staged audit found zero unresolved secrets (one existing synthetic test fixture, excluded by its exact fingerprint for this audit only).

## Limits

- Two historical cost samples are too few for a stable budget estimate; remeasure after more use. No silent increase.
- Static skill scores lack semantic LLM review and live OSV data. SAFE is scanner advice only.
- Restart Codex desktop to refresh loaded skills. Disabled files are retained for deliberate review.
- Independent Writer remains advisory. The documentation task is PASSED WITH GAPS, not VERIFIED.
- Older pending drafts remain visible; no historical item was cancelled or accepted to tidy the recording.
- Builder model/runtime, sandbox, protected-check policies and billing settings unchanged. No push, merge or deployment.
