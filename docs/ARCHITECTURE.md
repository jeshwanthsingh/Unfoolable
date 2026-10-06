# Current architecture

```text
React UI → loopback Node coordinator → SQLite
                              ↓ registration only
                        read-only Git identity queries
```

Breakout 1 adds only Project registration. GET /api/projects lists stored metadata and configured allowed roots. POST /api/projects validates a name and repository location before inserting one row. Health, Host/Origin guards, fixed static serving and graceful shutdown retain the foundation design. SSE and execution adapters remain absent.

Configured roots default to ~/Projects; COMMAND_CENTER_PROJECT_ROOTS accepts a JSON array of existing absolute or ~/ directory paths. Registration resolves symlinks using realpath, checks canonical scope, asks Git for its working-tree root, checks that root again and records HEAD/branch. Lexical scope helps classify missing paths without exposing outside-path existence; canonical scope is authoritative, including configured-root and OS aliases. Paths are process arguments, not shell text. Git queries disable paging, optional locks, hooks, fsmonitor and lazy fetching; remote protocols are denied. No file tree, README or AGENTS contents are read by registration handlers.

SQLite remains coordinator-owned, with foreign keys, WAL, a busy timeout and transactional migrations. Migration 2 adds projects with an application UUID and unique canonical repo root. A failed validation creates no row; database uniqueness arbitrates concurrent duplicates. Registration timestamps and HEAD/branch are stored observations. Listing never re-runs Git or updates these observations.

The current model omits updated_at because there is no update operation. A committed HEAD is required; unborn repositories receive HEAD_UNAVAILABLE without any automatic commit. Linked working trees are accepted by Git discovery; the application has no worktree-management code. Persistent registration does not imply repository analysis or execution authority.

Single-coordinator lock and repeated-signal shutdown behavior are unchanged. Confirm a lock's owner is dead before manually removing one left by an unclean crash. Node24's built-in SQLite remains a release-candidate API.

Breakout 2 adds a project-scoped Mission boundary: GET/POST /api/projects/:projectId/missions and GET /api/missions/:missionId. The shared Mission shape is validated at the server/client boundary; a dedicated persistence module uses prepared SQLite statements only. The existing bounded JSON parser and Host/Origin guards are reused. Mission operations do not invoke Git, resolve paths or read repository files.

Migration 3 adds missions (id, project_id, original_intent, phase, created_at) and a project/creation-order index. Phase is constrained to DRAFT. The Project foreign key uses ON DELETE RESTRICT, since no deletion capability exists. One synchronous insert is atomic; no optimistic permanent UI state is created. Identical intent is not unique. Lists order by created_at descending and id ascending. The raw string is retained exactly; trim is used only to detect empty input. A Mission is an objective recorded by the user, not an execution attempt.

Breakout 3 adds Project → Mission → append-only ProjectContextSnapshot. Shared typed facts, bounded Git observation, canonicalization, persistence and Mission-detail UI are separate small modules. The authoritative path comes from a Mission → Project SQL lookup, not a capture body. The API exposes only GET/POST /api/missions/:missionId/context-snapshots; GET returns latest/count without repository access.

Migration 4 adds one snapshot table, index and immutable update/delete triggers. Observations must pass the before/after consistency check and shared payload validation before a single insert. Repeated captures get new UUIDs; payload hashes may repeat for identical facts. No Project/Mission fields change. Roots are revalidated, Git output is bounded, external filter helpers are disabled and overlapping captures are rejected.

This is a sensor boundary, not reasoning. Context capture does not collect source contents; Git may inspect worktree bytes internally for status. Endpoint consistency and hashes do not establish dirty-byte stability, semantic correctness or security. Capture retains only bounded path summaries, counts, truncation and fingerprints. Future targeted inspection, agents and execution adapters remain unimplemented.

Breakout 3.5 changes presentation only. The frontend combines existing Project/Mission reads for the workbench; shared context request logic feeds both the Mission journey and context disclosures. An optional browser preference remembers the last viewed Mission ID, validated against actual records. There is no new backend endpoint, schema, attention model, lifecycle state or execution adapter.

Breakout 4 separates observed Project Context from interpretive Mission Analysis. A server-side compiler selects at most three root/relevant guidance files, two root/relevant manifests, path/content matches and nearby tests from normal Git blobs at the snapshot’s committed HEAD. Secret-like/generated/binary/symlink entries are excluded; Git replacement refs are disabled. Orientation counts cover eligible committed entries, not a full repository census. Evidence IDs preserve relative paths, original line ranges and content hashes. Canonical packet SHA-256 identifies the evidence input, not repository security. Dirty worktree content is not included.

The special-purpose Codex analyzer receives only the packet in a neutral temporary directory, with the verified ChatGPT login, read-only sandbox, no advertised tools, no inherited desktop bridge/API-key environment, user config/rules ignored and structured schema output. Runtime model metadata removes shell/patch/collaboration capability; plugin/browser/image/search features are disabled. Installed version and model metadata are pinned to 0.160.0; upgrades fail closed pending re-verification. No auth files are copied or global configuration changed. The owned process group has a 90-second limit and is terminated on cancellation/timeout. Final JSON and completed-turn events must validate before result activation.

Migration 5 adds mission_analyses, clarification_questions and clarification_answers. Existing Mission/snapshot tables remain intact. Analyses bind Mission, snapshot, base HEAD, packet hash, prompt version and tool version. PREPARING is evidence/preflight; RUNNING starts on actual analysis process spawn. Terminal records/questions reject update/delete/replacement. Publishing validated results/questions is one transaction; failed/interrupted attempts publish no questions. Startup interrupts unfinished work without resuming it. One current answer per immutable question can be explicitly updated.

Public Mission phase is a projection of durable current successful analysis/answers: DRAFT without success; NEEDS_CLARIFICATION for unanswered required questions; CLARIFIED otherwise, including zero questions. No redundant mutable phase column or Mission-table rebuild is needed. Needs You uses only current unanswered required rows, never model claims. A newer context sets a stale-analysis warning without rebinding old evidence or discarding answers. Reruns create new records.

Only GET /api/missions/:id/analysis, POST /api/missions/:id/analyses, GET /api/clarifications and PUT /api/clarifications/:id/answer are added. Write requests accept only their fixed minimal bodies and existing Host/Origin/bounded-JSON protections apply. UI polling is limited to an active analysis; there is no SSE or general agent runtime.
