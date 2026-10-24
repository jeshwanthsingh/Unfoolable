# SCION-1 result

Local branch: `codex/scion-1`, based on published main `8b518c3`. No merge, push, deployment or live coordinator restart. The original dirty checkout was preserved.

## What changed

1. Frozen Git hunks receive deterministic Tree-sitter syntax labels. Unknown languages, invalid syntax and unavailable content remain logic/unknown. Literal changes are explicitly not a promise of unchanged behavior.
2. Optional approved playbook risk rules only raise the existing risk. No old approval hash changes merely because the new fields are absent. Editing rules requires the existing Touch ID approval again.
3. Both Proof views show the measured change summary and plain risk reason, bound to the exact BASE/Candidate commits. Missing or stale classification never claims unchanged logic.
4. Approved local Opengrep patterns run on separate protected exports with network denied. BASE findings make that rule pre-existing/not applicable. A new multiline match must overlap a changed line. A target outside the approved export is an error, not a clean result.
5. Weekly self-checks run only idle/on AC, reserve dispatch, interrupt for new work/power/STOP, and retain append-only observations. Ownership is durable before command release and uses a protected journal during backup. Unknown probe data stays unknown. STOP ALL still attempts all ticket cleanup even if maintenance cleanup is uncertain.
6. New v2 seals bind the request hash and trusted runtime Builder identity. Unreported model versions and missing historical identity stay unknown. Old envelopes, keys and core versions retain their verification path.
7. Browser verification reproduced the old dotted-bundle 404 that caused a blank page. The narrow filename fix retains suffix, containment and traversal checks.

## Proof

| Check | Result |
|---|---|
| Final full suite | 1295/1295 passed, 0 failures, 0 skipped (355.5 seconds under caffeinate) |
| Typecheck and production build | PASS; 9 Workshop images and 2 core sources packaged |
| Golden replay | 61 comparisons, 0 differences; frozen hashes preserved |
| Verdict cores and registry | Byte hashes unchanged |
| Negative controls | 12/12 non-PASS: 5 FAIL, 7 INCONCLUSIVE |
| Real Builder protected-path probe | 71 targets denied; git status/diff/log, SQLite and owned writes work |
| Copied real-data seals | 6 sealed, 8 older unsealed, 0 broken |
| Risk monotonicity | 5,000 randomized combinations |
| Read-only review | No remaining major blockers |
| Official Playwright MCP | Main/Proof, 1440/390, light/dark, 100% zoom; see observations |

The latest full run includes the chat-server 50-session ownership stress test. Raw local logs remain under `.work/scion1/`; aggregate values and core hashes are in [safety.json](safety.json).

## Screenshots

All screenshots are visibly labelled isolated fixtures. The code change was planted by the harness; its protected BASE/Candidate suite and classification actually ran. The maintenance card demonstrates a failed restore honestly, never a fabricated pass. No live decision was made.

- [Desktop light main](mcp-screenshots/1440-light-main.png), [Proof](mcp-screenshots/1440-light-proof.png)
- [Desktop dark main](mcp-screenshots/1440-dark-main.png), [Proof](mcp-screenshots/1440-dark-proof.png)
- [Phone light main](mcp-screenshots/390-light-main.png), [Proof](mcp-screenshots/390-light-proof.png)
- [Phone dark main](mcp-screenshots/390-dark-main.png), [Proof](mcp-screenshots/390-dark-proof.png)

## Limit that remains

The full-size live backup/restore was **not proved** in this round. The alternate worktree first refused legacy Candidate locations outside its existing approved backup root. Using the byte-identical canonical helper preserved that boundary, but the full-size trial exceeded five minutes and was interrupted with certified cleanup. No live database was restored or reset, no backup access rule was widened, and no timeout was silently raised. The isolated fresh-snapshot/restore tests pass; that is not a claim that this full-size restore passed.

The weekly mechanism records such a failure and shows needs attention. Activation on the canonical checkout and a completed full-size restore remain operational validation work.
