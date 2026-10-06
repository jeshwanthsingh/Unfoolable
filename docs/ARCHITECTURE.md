# Current architecture

```text
React UI → loopback Node coordinator → SQLite
                              ↓ registration only
                        read-only Git identity queries
```

Breakout 1 adds only Project registration. GET /api/projects lists stored metadata and configured allowed roots. POST /api/projects validates a name and repository location before inserting one row. Health, Host/Origin guards, fixed static serving and graceful shutdown retain the foundation design. SSE and execution adapters remain absent.

Configured roots default to ~/Projects; COMMAND_CENTER_PROJECT_ROOTS accepts a JSON array of existing absolute or ~/ directory paths. Registration resolves symlinks using realpath, checks canonical scope, asks Git for its working-tree root, checks that root again and records HEAD/branch. Lexical scope helps classify missing paths without exposing outside-path existence; canonical scope is authoritative, including configured-root and OS aliases. Paths are process arguments, not shell text. Git queries disable paging, optional locks, hooks, fsmonitor and lazy fetching; remote protocols are denied. No file tree, README or AGENTS contents are read by the application.

SQLite remains coordinator-owned, with foreign keys, WAL, a busy timeout and transactional migrations. Migration 2 adds projects with an application UUID and unique canonical repo root. A failed validation creates no row; database uniqueness arbitrates concurrent duplicates. Registration timestamps and HEAD/branch are stored observations. Listing never re-runs Git or updates these observations.

The current model omits updated_at because there is no update operation. A committed HEAD is required; unborn repositories receive HEAD_UNAVAILABLE without any automatic commit. Linked working trees are accepted by Git discovery; the application has no worktree-management code. Persistent registration does not imply repository analysis or execution authority.

Single-coordinator lock and repeated-signal shutdown behavior are unchanged. Confirm a lock's owner is dead before manually removing one left by an unclean crash. Node24's built-in SQLite remains a release-candidate API.
