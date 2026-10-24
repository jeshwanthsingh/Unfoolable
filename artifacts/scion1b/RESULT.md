# SCION-1b — fixes before merging

Local branch: `codex/scion-1b`, from `cfe7c03`. Six local WIP steps. No merge,
push, deploy, live approval or live database replacement.

## Fixes

1. Proof was fixed to the viewport and could cover emergency controls. Desktop
   now reserves the measured sticky header. Phone has the same Settings/Stop
   handlers inside the modal, above the inert page. Real browser click/hit tests
   pass in light/dark at 1440×900 and 390×844. The visible phone heading is also
   checked for occlusion.
2. The default order is header, greeting, Ask, tasks (existing Needs you priority),
   optional room, Night Shift/self-check. The first task fits at 1440×900.
3. The journey ignored real `state_changed: building/fixing` when a provider
   `agent_started` callback was missing. It now consumes both. An earlier stage
   with no source is explicitly unknown, never inferred complete or shown skipped.
4. 74 → 76 added the archived core and registry. 76 → 71 accidentally omitted six
   release-specific probes, offset by discovering playground. All six are back.
   The frozen union is 77, plus explicit Projects-parent coverage = 78 under
   `protected-paths-v1`. Every attempt saves its manifest binding before release;
   complete reports bind exact version/hash/count. CI rejects removals,
   replacements and silent version reuse. Eight endpoint and two signing-helper
   checks remain separately counted. See docs/PROTECTED_PATH_MANIFEST.md.
5. The canonical checkout's real completed backup restored 214,391 files in
   **286.303 seconds (4m46s)**. Every file/link hash, all 58 DB tables, one passkey,
   1,564 events, chain head, SQLite integrity and foreign keys matched. This is a
   restore-only measurement; fresh snapshot creation/compression is excluded.
   Weekly fresh-snapshot + full restore gets **25 minutes**, still idle/AC-only
   and interruptible. Incomplete/sampled/skipped work is never called a full pass.
   The UI names the full check, date and time. Full restore proof is JSON beside
   this report. Raw private logs and restored data remain ignored.

## Verification

- Full suite: **1,303 / 1,303**, zero failures/skips; 367.071 seconds.
- Typecheck/build: pass, including loading the packaged manifest in compiled code.
- Golden replay: **61 comparisons, zero differences**, frozen files unchanged.
- Negative controls: **12 non-PASS — 5 FAIL, 7 INCONCLUSIVE**, zero PASS.
- Real Builder plus exact-profile probe: **78 unreadable**, all eight protected
  endpoints denied, both signing helpers unusable; git/SQLite/worktree checks pass.
- `cc verify --all` on both real-data copies, including the full restore:
  **6 sealed, 8 older/unsealed, 0 broken**. Exit 2 honestly denotes older records.
- **231** server/shared/protected files byte-identical to `cfe7c03`. The only server
  edits are the two scoped self-check files; core, sandbox, approvals, signing,
  decision and grader code are unchanged. Hashes are in protected-hashes.json.
- Browser layout/click regression: four viewport/theme combinations pass. MCP
  screenshots: 100% zoom, no horizontal overflow, Accept locked before file review.
- Both isolated preview jobs safely stopped with certified ownership cleanup.

## Screenshots

The screenshots are labelled isolated fixtures, with real protected-check and
completed probe/restore observations; no production approval was performed.

| Size / theme | Main | Proof open |
| --- | --- | --- |
| Desktop light | [Main](screenshots/1440-light-main.png) | [Proof](screenshots/1440-light-proof.png) |
| Desktop dark | [Main](screenshots/1440-dark-main.png) | [Proof](screenshots/1440-dark-proof.png) |
| Phone light | [Main](screenshots/390-light-main.png) | [Proof](screenshots/390-light-proof.png) |
| Phone dark | [Main](screenshots/390-dark-main.png) | [Proof](screenshots/390-dark-proof.png) |

## Limits kept visible

The initial generic-maintenance measurement trial stopped without a completed
result. It is not counted as a restore. The successful measurement used the
existing protected runner, with certified process cleanup and the canonical
backup helper unchanged. The fresh weekly scheduled cycle was not run against
live data. The 25-minute allowance includes fresh backup creation; the reported
4m46s measurement does not.
