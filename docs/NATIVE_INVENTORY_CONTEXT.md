# Runner inventory and BASE symbol context

The authoritative existing-test inventory comes from a separate frozen BASE export inside the existing protected runner. unittest uses native TestLoader collection without running test bodies. Vitest 4.0.18 uses its JSON reporter, including parameterized Unicode titles, nested names and skips. This deliberately executes the BASE suite to obtain all native records rather than parse source names. Inventory identities are unittest IDs or a JSON pair of relative file path and native Vitest fullName. Candidate-only, missing, duplicate, skipped and zero-collected tests retain the existing failure/gap rules. BASE collection setup errors stop verification; they cannot become PASS. The collection observation is retained and hashed with verification evidence.

Only callers requesting an inventory launch collection; read-only runner metadata callers do not start a suite. Collection stays deadline-bounded and uses the existing ownership, environment, network, signal and filesystem protections. The trusted Vitest scratch directory supplies its own package scope and exact prevalidated dependency link; ancestor read permissions are unchanged.

## Tree-sitter context

Run `./scripts/setup-tree-sitter` once. It installs pinned tools only in `.work/tools/tree-sitter`, not globally or in registered projects. Rebuild it with the same command if missing. The coordinator parses immutable Git BASE blobs, never imports project code. Large files (over 12 KB or the remaining context allowance) contribute relevant function/class/method definitions and referenced imports; each excerpt is labelled with original BASE line ranges and selection metadata. Python, JavaScript, TypeScript and TSX are supported. Small files keep their existing full-file behavior. Parse errors, missing tools and over-budget definitions are omitted explicitly through `omittedBaseFiles`; no synthetic source is invented.

The pack still limits source/request bytes to 32 KB, at most six files, and the writer's shared 40,000-token allowance is unchanged. No writer prompt, admission, scoring, or advisory-promotion policy was changed.

The approach is inspired by [Aider's repo map](https://aider.chat/docs/repomap.html): use parsed symbols and budgeted relevant excerpts rather than whole large files. No Aider implementation was copied or installed; its upstream [license](https://github.com/Aider-AI/aider/blob/main/LICENSE.txt) is Apache-2.0.

| Installed tool | Version | License |
|---|---|---|
| tree-sitter Python bindings | 0.25.2 | MIT |
| tree-sitter-python | 0.25.0 | MIT |
| tree-sitter-javascript | 0.25.0 | MIT |
| tree-sitter-typescript | 0.23.2 | MIT |

0.26.0 was tried first and crashed on the deterministic 500-definition fixture; 0.25.2 passes that regression. Requirements are pinned and installed license files are recorded in the artifact directory.

Optional Pynguin trial is not part of these two fixes and was not run. No model calls, benchmark grading slots, or new holdout measurements were consumed by this round.
