# Free quality gates

Tools live only in ignored `.work/quality-tools/`, outside Builder workspaces. Checks never install packages or download rules/databases. Every tool runs with the existing tracked-process sandbox and all network denied. The native protected tests remain the authority; lint/security tools are additional diagnostics.

| Tool | Installed version | License |
|---|---|---|
| ruff | 0.17.1 | MIT |
| pyright | 1.1.414 | MIT |
| bandit | 1.9.4 | Apache-2.0 |
| detect-secrets | 1.5.0 | Apache-2.0 |
| oxlint | 1.88.0 | MIT |
| @ast-grep/cli | 0.51.0 | MIT |
| eslint | 10.13.0 | MIT |
| typescript-eslint | 8.71.2 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| opengrep | 1.31.0 | LGPL-2.1 |
| gitleaks | 8.30.1 | MIT |
| osv-scanner | 2.7.0 | Apache-2.0 |

Exact official binary URLs, hashes and offline database hashes: `artifacts/quality-gates/TOOLS.json`. Python tools use the isolated `python/` virtual environment, JavaScript tools the isolated `js/` prefix, release binaries `bin/`. Opengrep's extraction cache is `cache/`; OSV databases use both the scanner and SCALIBR cache layouts in `osv-db/`. Databases were downloaded before execution. No repository package manifests or Builder runtime were changed.

A ticket automatically proposes language-appropriate gates into its playbook. Approving the exact proposal requires the existing passkey flow. The tools/local-rule policy hash is part of that proposal; a changed policy clears approval. Already approved historical playbooks are retained. Existing dependency paths are reused; Candidate dependencies are never installed by a gate.

BASE runs first. Native diagnostic exit statuses are distinguished from setup failures. Existing diagnostics never block; only new findings on changed lines fail quality gates. BASE setup failure means not applicable; Candidate execution failure means ERROR. A missing/empty supported dependency inventory does not masquerade as a clean vulnerability scan. ESLint/tsc reuse BASE configuration, and the security scanners use trusted local rules with selected suppression switches disabled. Analyzer-specific suppressions and a deliberately small Opengrep rule set remain limitations; these tools do not replace protected tests. detect-secrets retains its native hashed baseline in protected check scratch; secret values are redacted from recorded findings.

Test-tampering uses local ast-grep rules, not a source-name parser. It compares changed exported test files and flags ordinary skips, assert True, removed assertions and changed expect calls in red. It is a review signal, not an exhaustive proof against all dynamic test manipulation. Restored BASE tests remain authoritative. The independent writer warning and mutation/coverage evidence are unchanged.

The review card groups Locked checks / Quality gates / Test-tampering / Independent test warning / Mutation & coverage. A quality pass cannot override an unavailable protected check or authorize Keep. The actual verdict and explicit gaps remain visible.

Round B used a disposable research-router clone because the real checkout was dirty. The tools passed applicable checks, but that new project identity has no approved project recipe. Its ticket remains NOT CHECKED / Needs You. No recipe approval was copied, no Keep/Discard was performed, and the source working tree was preserved. This is an integration limitation to resolve explicitly rather than bypassing a protected gate.
