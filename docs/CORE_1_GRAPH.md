# CORE-1: map before extracting

This is an additional prerequisite, not authorization to invent CORE-1's refactor. No CORE-1 extraction brief was present at source commit d8c0752. The owner could not locate it. Application behavior and safety files remain unchanged.

## Before step 2

Use the official Graphify CLI pinned to `graphifyy==0.9.92` (Apache-2.0). The old safishamsi URL redirects to Graphify-Labs. Install with `uv tool install graphifyy==0.9.92`; do not install extras. SkillSpector 2.12.0 rated the packaged Codex skill DO_NOT_INSTALL (100/100, partial inspection). Do not run `graphify install`; CLI only. Older user-installed 0.5.0 skills were discovered and left untouched.

Export tracked code only into ignored `.work/core1/source`; never index live data, credentials, documents, media, vendored code or dependency trees. Run `graphify extract ... --code-only --no-cluster --max-workers 1 --out artifacts/core1/graph/before` with a scrubbed environment and an OS `(deny network*)` rule. Do not start HTTP/MCP/watch, configure providers, use PostgreSQL or enable billing.

Completed: `artifacts/core1/graph/before.html`, full graph JSON, source manifest, function/file inventory and network proof. Visualization uses a pre-downloaded pinned local vis-network script, not a CDN at viewing time. Artifacts are ignored by the existing repository policy; retain them locally until explicitly selected for a commit.

## After the intended extraction — pending

1. Define the one pure core file and its shell callers in CORE-1's actual brief.
2. Regenerate on the refactored commit, using the identical input/filter/count procedure. Save `after.html`, a diagram and before/after file, function and edge counts. Do not present an unchanged graph as an after-map.
3. Use `graphify explain <core-id> --all` and directed `graphify path` queries to check the resolved import/call closure. Cross-check source and the lint rule: no database, filesystem, process, clock or network imports/effects. Missing graph paths alone cannot prove purity.
4. Review all extraction warnings, indirect/dynamic imports and injection points. Graphify is a navigation aid, not a security boundary or a complete dependency proof.
5. Update DESIGN_FACTS with the new actual flow; preserve existing verdict semantics and run the agreed regression checks before claiming the extraction complete.

## Count definition

The before inventory uses production result-token modules as seeds, plus the AST-resolved outgoing import/call closure within server/shared/oracle code. It deliberately includes producers, validators and observers. Full graph: 510 scanned files, 2,788 nodes, 10,764 edges. Conservative verdict slice: 36 seeds, 148 files, 1,174 nodes, 3,982 edges. Counts are not a claim that every dynamic influence was resolved. Repeat the same definition after extraction.
