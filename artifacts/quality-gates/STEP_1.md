# Step 1

Tools installed in ignored .work/quality-tools, not in Builder sandbox. Versions/licenses and official download hashes in TOOLS.json. Python/npm OSV databases are predownloaded; Opengrep uses only checked-in local rules. Every invocation is run through the existing owned-process runner with all network denied. BASE diagnostic reports are compared with Candidate reports; only newly introduced findings on changed lines count. BASE setup failures are not applicable; Candidate setup failures are ERROR, never PASS. detect-secrets stores its native hashed baseline in protected check scratch. Export whitelists are preserved.

Disposable native probe: Ruff caught unused import, Pyright caught return-type mismatch, Bandit and Opengrep caught eval. Gitleaks/detect-secrets/OSV ran successfully on clean inputs. Additional planted secret/tampering/type-tool proofs follow in Step 4. Historical cases not rerun.
