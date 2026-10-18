# Cleanup — complete

Main was fast-forwarded to `2a6e939`, then advanced through local WIP commits for each cleanup step. Annotated tag `v0.1.0` remains exactly on `2a6e939`. History was not squashed or rewritten. No push, merge commit, branch deletion, deployment or billing configuration. Application/Builder/runtime sources are unchanged (`installation-status.json`).

## Non-ancestor branches

- `codex/glass-main`
- `codex/verification-v1-scoping`

All other existing branches are ancestors of main. No branches were deleted.

## Backup proof

- Official checksum-verified Litestream 0.5.17, Apache-2.0. Per-user launchd replication uses a local file destination only; no network socket was listed.
- Friendly path `~/UnfoolableBackups` resolves to `~/.config/unfoolable/backups`, retaining the existing Builder deny boundary. Mode 0700 directory, 0600 archives. Both backup-path probes were denied.
- Complete checkpoint: 448,957,945 bytes compressed; 151,279 files/links, seven source roots. A later checkpoint may contain additional ordinary files; the first is the one restored for this proof.
- Actual restore: 42 application tables, one passkey registration, 755 ticket events. Every recorded file/link and logical table matched. SQLite integrity passed; foreign-key errors 0.
- Independent comparison: public passkey/confirmation rows identical; all four approved playbook files byte-identical. 101,724 captured files/links belonged to oracle/check/proof stores.
- Continuous replication separately proven: a WAL write after the daemon started was restored (2/2 rows). Only the owned fixture was stopped, with PID/kernel-birth cleanup certification.
- File snapshots wait for idle and run on a five-minute schedule. Unchanged application state reuses the previous checkpoint; that no-copy path passed its actual check. SQLite continues replicating independently. Three complete archives retained; seven-day SQLite snapshot retention.
- The temporary full restore was removed only after proof, retaining live data and private archives. Restore CLI refuses an existing destination and never activates the restored app.

A physical Touch ID assertion against a restored server was **not** performed. The stored public credential survived; the authenticator private key intentionally stays in the Mac/Keychain. Local same-disk backups do not cover device/disk loss, and a newer raw SQLite replica may require the last complete file checkpoint for consistent recovery. See `docs/BACKUPS.md`.

## Verification

- Fresh full suite: **977/977**, 0 failures/cancellations/skips, 323.391 seconds. Tested source commit `a92961b6ee715e2e73698710438dc19f77951c5e`, source hash unchanged during run.
- Backup helper regression suite: **7/7**, isolated data. New helper regressions failed before their fixes.
- Typecheck and production build passed; existing optional-screen chunk warnings remain.
- Original 65-path probe plus two backup targets: **67 denied**, owned Git status/diff/log, SQLite/temp and writes passed; cleanup certified.
- Twelve unchanged negative controls: **5 FAIL, 7 INCONCLUSIVE, 0 PASS**.
- Full tracked-text Gitleaks audit: one existing synthetic access-key fixture in a redaction unit test, explicitly triaged by exact audit-only fingerprint; no unresolved finding. Production detection policy unchanged. No sensitive runtime filenames tracked.
- An earlier977-pass suite crossed the idle-copy optimization edit; its source-binding guard rejected it. It is retained under `.work/cleanup/full-suite-before-idle-optimization.log`, not used as final evidence. The final run above is independent and source-bound.

## Presentable handoff

README: one screenshot, plain start instructions, six safety bullets, observed cheating/false-accept/confirmation numbers and honest limits. Root DESIGN.md: factual headings and notes only. HANDOFF.md: live paths, startup/tests, pending real review, backup operations, open limits and three proposed next rounds. No later round was implemented.
