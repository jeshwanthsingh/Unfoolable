# Recovery result — 2026-10-24

Base: main `e593384`. Branch: `codex/recover-docs`. Recovery commit: `136ec48`; this report is committed with final evidence. Stash `4378916acb61fe0374baeb64d01580a01d306cc9` remains intact. No push, merge, live-data write or restart.

## Recovery and current facts

Six modify/delete conflicts were resolved by retaining the requested stash versions of the three videos and three accompanying reports. Missing cover/captions were recovered from the stash parent so the validation record has its support files. Recovered Apache-2.0 LICENSE, operations guide and negative-control guide are retained. Three email redactions from the recovered old report are retained; its outcomes are unchanged.

The old root threat draft was merged into the existing SCION threat model at docs/THREAT_MODEL.md, with its original retained in ignored recovery work and in the untouched stash. README and DESIGN link it. Factual updates: 78-target protected-paths-v1 manifest; six sealed, eight older-unsealed, zero broken latest ticket records; registered cores v1/v2; SCION classification/self-check; format-v2 request and Builder identity bindings.

## Verification

- Full suite: **1,310 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo**, 359.621 seconds under caffeinate, Node 24.21.0.
- Typecheck and production build: PASS. Built images and registered core/manifest packaging pass.
- All 399 tracked application/shared/protected-runner/manifest files compared with e593384 are unchanged. Frozen CORE-1 goldens also remain byte-identical.
- Existing 12 controls rerun unchanged: **5 FAIL, 7 INCONCLUSIVE, 0 PASS**. No new ADV-1 verdict-control pack is invented.
- Read-only `cc verify --all`: six sealed, eight older-unsealed, zero broken; exit 2 denotes older unsealed records.
- Grading-time diagnostic attempt 1: Python observer/separate judge PASS; project reporter collection error, retained.
- Diagnostic attempt 2: both actual Python runner lanes PASS, 87 checks each: 76 denied, nine absent, two intentional positive controls. Private API returned 403. No forbidden operation succeeded. Browser/Vitest not measured; signal-zero is a permission test, not destructive signal delivery.

## Privacy and publication decision

Three recovered videos are byte-identical to the stash, H.264/30 fps/58 seconds each. Fresh local Apple Vision OCR: **5,220 frames, 2,775 unique decoded images, 0 findings**. Cover: one image, zero findings. OCR limitations are recorded; this is not a proof against unreadable/non-textual secrets.

Gitleaks 8.30.1 scanned the entire staged publication snapshot using unchanged default rules: 17 raw matches, individually verified as 13 file hashes, three vis-network method names and one explicit fake-key fixture. Zero confirmed secrets; exact-fingerprint baseline rerun has zero remaining findings. Raw redacted findings and triage remain available; no broad ignore rule was added.

The initial review blocked publication because two frozen CORE-1 golden JSON files contain the owner's actual home path (411 occurrences). On 2026-10-24 the owner explicitly approved publishing both files as-is, confirming that the paths contain the public username. That specific blocker is resolved by owner approval; the original bytes remain unchanged. No scan result is presented as blanket personal-data clearance. No Git history rewrite occurred.

See docs/ADV_1_STATUS.md for DONE / PARTIAL / MISSING and docs/NEGATIVE_CONTROLS.md for the complete coverage map. The owner granted one-time permission to merge/fast-forward this recovery to main and push without force. Stash 4378916 must remain intact; the no-merge/no-push rule resumes afterwards.
