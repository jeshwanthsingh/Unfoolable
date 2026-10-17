# Native inventory + tree-sitter context — complete

Branch: `codex/native-inventory-context`, from `1c5f1ab`. Step 1 commit: `774d81f`. Step 2 is committed with this report.

## Changes

- Removed regex-derived BASE test names. Protected native unittest collection and Vitest JSON reporting now provide exact identities, including dynamic Unicode, nested names and skips. Vitest identity binds relative file path and full native name. Loader errors use explicit native records, never test-name heuristics.
- Collection runs on a separate frozen BASE archive, under existing protected execution and cleanup. Its observation is retained and hashed. Vitest has a private trusted package scope and exact dependency link, without broader ancestor reads.
- Tree-sitter selects bounded relevant BASE definitions/imports from large Python/JS/TS/TSX files. Full small files remain unchanged. Excerpts include original line ranges and actual parser versions. Parse errors or over-budget definitions are omitted honestly.
- Real research-router CLI proof: 15,714 bytes of CLI excerpts in a 31,942-byte context pack. See `cli-context.json` for BASE and ranges.

## Verification

- Full fresh `npm test`: **870/870**, 0 fail, 0 skip, **310.55 seconds** (`full-suite-resumed.log`).
- Focused inventory/context/budget checks: **19/19**.
- `npm run typecheck`: PASS. `npm run build`: PASS.
- Twelve negative controls: **5 FAIL, 7 INCONCLUSIVE, 0 PASS** (`negative-controls-resumed.log`).
- An earlier interrupted run reported 868/870 with deadline/cleanup failures. Both passed in isolation (2/2) and in the fresh full suite. Logs are retained; exact original cause was not established. No deadlines, cleanup requirements or test assertions were weakened.
- Basic credential-pattern scan and diff whitespace check performed; see scan JSON.

## Dependencies and scope

Installed only in ignored `.work/tools/tree-sitter`: tree-sitter **0.25.2**, tree-sitter-python **0.25.0**, tree-sitter-javascript **0.25.0**, tree-sitter-typescript **0.23.2**. All MIT; exact installed license files and hashes are retained. Reproduce with `./scripts/setup-tree-sitter`. Parser 0.26.0 crashed on the large-file regression and was replaced with pinned 0.25.2.

Inspired by Aider's Apache-2.0 repo-map approach; no Aider code was copied or installed. No npm dependencies added. Writer prompts, admission, scoring, shared 40k token allowance, advisory policy and Builder runtime/model are unchanged. Historical holdout results were not rerun or rewritten. No paid APIs, production-repository changes, push, merge or deployment.

Optional Pynguin was not run. AST relevance remains heuristic; definitions too large for the bounded pack are omitted. No improved confirmation rate is claimed without a new authorized measurement.

Saved typecheck logs normalize trailing blank lines only; their results are unchanged.
