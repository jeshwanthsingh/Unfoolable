# Live approval boundary

New live playbook approval writes require an exact-item, one-use passkey receipt after sealed owner enrollment. An operator key proves local access, not human presence; scripts and browser automation can use it. CC refuses unauthenticated approval in the API and at the persistence sink, before reserving a chat card. Existing approved playbooks remain usable; their immutable files and histories are preserved. Initial owner enrollment requires macOS biometrics; subsequent decisions require signed WebAuthn user verification. Without a registered owner key, new live approvals remain unavailable. See PASSKEYS.md.

Data stores have an write-once application LIVE/TEST marker. Node tests may only open TEST stores beneath their temporary root; LIVE stores, symlink aliases and legacy stores containing an operator key are refused before database access. Test approvals are permitted only in isolated Node-test stores and labelled actor=test-fixture, source=node:test, dataMode=TEST. Client-supplied human/source labels cannot grant live approval. Test subprocesses use synthetic data only.

Historical research-router approval happened at 2026-10-10T13:48:14.147Z (06:48:14 PDT): the assistant’s real-run script submitted the chat-card API action after the user explicitly approved that exact hash in chat. It was not a unit test or a manual browser click. The old ledger omitted actor/channel; this conclusion comes from the saved run script/log, not invented ledger fields.

This prevents accidental live approvals through CC and tests. It is not a security boundary against a malicious process with the same local-user filesystem permissions. The marker is not kernel-immutable.
