# CORE-1 Graphify prerequisite

## Status
Setup and before-map completed. CORE-1 extraction, after-map and pure-core lint/import verification are PENDING: no extraction brief exists in this checkout, and the owner could not locate one. No refactor or application behavior change was performed.

## Setup
Official safishamsi/graphify redirects to Graphify-Labs/graphify; upstream pyproject and PyPI agree on graphifyy 0.9.92, Apache-2.0. Installed with `uv tool install graphifyy==0.9.92`, without extras. Dependency tree-sitter is 0.25.2. Packaged MIT notice retained as well.

SkillSpector 2.12.0: DO_NOT_INSTALL, 100/100, 88.9% inspected. Findings include agent-config references, command deletion examples, unrestricted-tool wording and an incompletely inspected reference. Static findings are not proof of malicious intent. No graphify skill registration was run; CLI only. Pre-existing older skills left untouched. Scan used --no-llm, a clean environment and OS network denial, with offline vulnerability fallback.

## Before
510 tracked code files, 0 docs/papers/images. Whole AST graph: 2,788 nodes and 10,764 edges. Conservative verdict dependency slice: 36 seed files, 148 total files, 1,174 nodes, 3,982 edges. Exact selection/count definition in counts.json; file and function locations in verdict-path-before.md. Both dynamic injection and AST limitations prevent claiming exhaustive influence coverage.

Before visualization: before.html, self-contained and usable without a server or network. before.png is the real generated graph; before-overview.png is a readable source-cross-checked overview. Graphify path confirms createVerifyOnly() calls scoreV1(). Explain also reveals isV1Report() calls scoreV1(); playbook-checks.ts constructs a separate result, and ticket-loop.ts classifies runtime failures separately.

## Safety and verification
- OS deny network* for Graphify and descendants, outside the Builder sandbox.
- Three real connection attempts (public IPv4, public IPv6, loopback) denied with EPERM.
- Graphify orchestrator socket observations: 0 attempts / 0 successful. Recorder scope is Python connect/connect_ex in that process; no packet capture was performed. OS sandbox supplies the descendant enforcement.
- Extraction input/output LLM tokens: 0 / 0; no provider/key configuration.
- Browser render check: 0 HTTP requests, 0 page errors; screenshots visually inspected. The pinned vis-network 9.1.6 (Apache-2.0 OR MIT) asset was downloaded during setup and embedded locally.
- No MCP/HTTP/watch server, PostgreSQL, API billing, Builder execution or application decision.
- All 510 source files still match source-manifest.json. Only .gitignore and two new documentation files are working-tree changes. git diff --check passes. Full application suite not rerun for a tools/docs-only change.

## Limitations
Partial AST parse: packages/shared/contracts.ts. 75 files produced no symbols, including apps/server/main.ts. Source and lint checks must supplement graph queries; a missing graph path cannot prove core purity. after.html and after counts deliberately do not exist until an actual agreed extraction occurs.

## Files to carry into CORE-1
See docs/CORE_1_GRAPH.md and docs/DESIGN_FACTS.md. Artifacts remain under the requested ignored artifacts/core1/graph directory; scratch tools and code-only export remain in ignored .work/core1. No commit or push performed.
