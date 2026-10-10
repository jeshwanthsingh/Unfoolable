# Live approval boundary

New live playbook approval writes are paused. An operator key proves local access, not human presence; scripts and browser automation can use it. CC therefore refuses live approval in the store and API, before reserving a chat approval card. Existing approved playbooks remain usable; their immutable files and histories are preserved. A future human-presence method must be chosen before enabling new live approvals. No biometric gate is claimed here.

Data stores have an immutable LIVE/TEST marker. Node tests may only open TEST stores beneath their temporary root; LIVE stores, symlink aliases and legacy stores containing an operator key are refused before database access. Test approvals are permitted only in isolated Node-test stores and labelled actor=test-fixture, source=node:test, dataMode=TEST. Client-supplied human/source labels cannot grant live approval. Test subprocesses use synthetic data only.

Historical research-router approval happened at2026-10-10T13:48:14.147Z (06:48:14 PDT): the assistant’s real-run script submitted the chat-card API action after the user explicitly approved that exact hash in chat. It was not a unit test or a manual browser click. The old ledger omitted actor/channel; this conclusion comes from the saved run script/log, not invented ledger fields.
