# Step 1 — Whole Projects denial

New ticket clones/worktrees and their temporary files now live under `~/.cc-work/`, expressly approved by Jesh in this session. Existing worktrees are not moved. Native whole-root denials replace enumerated children.

A real pinned Builder session read-tested the original 64 paths plus a disposable repo created after its thread started: 65/65 unreadable; own Git status/diff/log, SQLite and write checks passed. See `after-probe.json`. The native regression reproduces creation after worker READY, not before launch.

The initial denied-ancestor layout prevented SQLite from statting parent metadata; `step-1-native-result.json` records that rejected design. No broader read grant was used to work around it. This is a named-path boundary, not a home-wide allowlist.
