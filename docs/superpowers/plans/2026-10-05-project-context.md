# Breakout 3 — bounded repository observations

Implement only immutable Mission context snapshots; retain DRAFT and original intent.

1. Add shared payload, canonical hashing and bounded path derivation. Verify deterministic order, truncation and working-tree parsing with unit tests.
2. Reuse hardened Git process execution, revalidate canonical registered roots, disable external filter helpers, observe state twice. Verify clean/dirty/detached/linked trees, symlinks and deterministic changed-state rejection.
3. Add migration 4 and explicit snapshot persistence with append-only constraints. Verify exact Breakout 2 upgrade, atomic failure, isolation, repeated capture and restart.
4. Add Mission-detail context component. Verify fresh production capture, dirty state, recapture and persistence at desktop and 390px.
5. Inspect full diff, credential scan, run all tests/typecheck/build and commit once locally. No paid services, source analysis, project execution or later features.

Limits: 32 MiB per Git output, 4-second Git timeout, 250,000 tracked/changed entries; 40 structural groups, 40 important paths, 40 manifest paths, 40 test-like paths and 60 displayed changes. One capture at a time per coordinator. Exceeding resource bounds fails closed; summaries record total and truncation.

Review focus: status can invoke clean filters, unusual NUL-delimited filenames, symlink topology changes, unchanged dirty-status bytes do not establish content identity, persistence must follow final consistency check.
