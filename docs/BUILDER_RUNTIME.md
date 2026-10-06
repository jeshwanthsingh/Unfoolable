# Bounded one-Slice Builder

An explicit Start Build admits one current accepted Slice. The gates check the accepted Contract and Plan/Evaluation pair, exact Slice membership, canonical allowed repository identity, clean source, accepted committed HEAD, no globally active/reconciliation attempt, and certified `codex-cli 0.160.0`. There is no automatic retry or next Slice. A current Candidate blocks another start.

## Isolation and execution

The coordinator creates a detached worktree at the accepted base. This is **source isolation, not a security sandbox**. Source working files, index, HEAD and branch remain unchanged; Git necessarily gains worktree administration and candidate objects. Creation uses `--no-checkout`, then neutralizes filters in the linked worktree's effective configuration before populating its files. Hooks, fsmonitor, lazy fetching and executable filters are disabled in coordinator Git operations.

The separately configured native Codex sandbox permits writes to the attempt worktree and disables tool network access. Native `command/exec` probes confirmed inside writes succeed, outside sibling writes and an owned loopback connection fail with EPERM. Classic workspace-write permits broader filesystem reads; this is **not read confinement or a microVM**. Named-profile acceptance did not prove enforcement and is not used. Never expose sensitive repositories on the assumption that this is hostile-code containment.

The app-server has isolated CODEX_HOME with an authentication pointer to existing ChatGPT entitlement, no copied keys, and a sanitized environment. Tool HOME/TMPDIR are inside `.cc-runtime`; Python bytecode is disabled. Skills/plugins, browser/desktop tools, external MCP, memory, multi-agent tools, web search, and unrelated features are disabled. Shell execution and apply_patch are the builder capabilities. Project-local guidance remains available. Unsupported server requests receive typed denial or an unsupported response and trigger shutdown, never permission widening.

## Ownership, fencing and stop

SQLite owns attempt state. Every provider event/result is fenced by attempt UUID, monotonically increasing Mission generation, transport UUID, thread and turn, and current accepted input. Process snapshots remain durable during stale-input cleanup independently of product-event currentness. Provider process IDs are opaque terminal handles, not OS PIDs.

The current macOS implementation uses the already-installed Python 3 helper and Darwin kernel birth time, executable, process group and session. It does not record arguments or environment. Normal completion, unsupported permission, failure, the 15-minute timeout, and server shutdown all interrupt the turn, enumerate/terminate exact thread terminals, reconcile birth-fenced owned processes and inspect for remaining owned execution before capture. Interrupt acknowledgment alone proves nothing. A completed turn may reject interruption; empty exact terminals and independently verified process cleanup are still required.

An unknown survivor, reused PID, missing inventory after possible launch, or unavailable identity fails closed as RECONCILE_REQUIRED and blocks new starts. Unknown processes are never promoted into trusted kill records. Arbitrary detached descendants that escape observation are not certified by this native topology; stronger containment belongs to a future external execution boundary. No polished cancellation or manual recovery UI exists.

Startup invalidates old transports and reconciles recorded ownership only. Old attempts never resume, replay approvals, create a Candidate automatically, or become success from stored permission/completion. Confirmed prelaunch CREATED state is distinct from a launched state with missing process records. Dead coordinator locks are reclaimed under an exclusive recovery marker; living/reused/ambiguous owners fail closed.

## Events and output

REST commands plus one-second bounded polling are sufficient for one globally active worker and the existing hook architecture. SSE was considered; it would add connection/shutdown handling without changing authority. SQLite stores monotonically sequenced events, latest-attempt cursor replay, and coordinator lifecycle transitions. A completed view drains full replay pages too. UI deduplicates and generation-filters sequences. Disconnects do not alter durable state.

Bounds: 1 MiB protocol frame; 2 MiB sanitized protocol artifact; 1,000 events per attempt and 4 KiB per event; 200 commands; 256 process identities; 6,000-character summary; 1,000 changed paths; 4 MiB diff; 128 KiB UI diff preview; 64 MiB candidate object pack. Truncation is visible. Raw output is untrusted, redacted and never interpreted as permission or verification.

## Candidate boundary

Only coordinator-verified cleanup and current inputs permit capture. A temporary index includes tracked edits, new nonignored files and deletions. Workspace HEAD must remain the base. A complete owned `candidate.pack` survives pruning of source objects. Tree identity plus SHA-256 diff identity, bounded inventory and immutable SQLite row represent the Candidate; there is no user-visible commit or mutation endpoint. Symlinks/submodules, sensitive paths/content, and ignored files outside `.cc-runtime` fail capture in this first version.

`mission-builder-v1` supplies original intent, relevant accepted requirements, scope/non-goals/constraints, one Slice and relevant Evaluation Claims. Builder development commands and exit codes are evidence only. The strongest phase is CANDIDATE_READY. Evaluation Claims remain unexecuted, and Verify awaits a future authoritative evaluator.
