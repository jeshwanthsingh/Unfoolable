# OBS-0 — approval preview, stopped here

Branch: codex/observatory-mockup, based on c890988 (Workshop repair). The approved reference was supplied in the chat after its file could not be found. Its structure was retained; its simulated events, fake tests, fake fuel, external fonts and substitute art were not reused.

## What to review

Open the isolated preview at http://localhost:3260/ . The private screen was opened with `node docs/mockups/observatory/open.mjs`; that command does not print the capability. See INDEX.md for 28 state captures (1440/390, light/dark), phone Proof views and the 20.000-second real-event replay (1440x1100, 25fps).

The room uses the tracked original CC0 Workshop textures, existing Hallmarks, recorded event interpreters and the Shiki diff component. XState receives only event-derived journey facts. The queue deduplicates sequence ids, merges explicit recorded read bursts with exact counts, and holds each replay beat at least 350ms. Room animation stops when settled or hidden. Replay cannot authorize any decision. Four optional synthesized event tones start off.

Settings uses pinned Radix Dialog; phone Proof uses pinned Vaul. Both exist only in the preview manifest, not the application dependency graph. Public OSV scan of all 26 resolved packages returned zero known vulnerabilities. Versions and licenses are in DEPENDENCIES.md and docs/DESIGN_TOOLS.md.

## Truth and missing sources

- Latest tracked probe: artifacts/rules1/protected-probe.json, 74 protected paths unreadable, recorded 2026-10-20. These are paths, not 74 different secrets; not a per-ticket measurement.
- No matching protected FAILED check in these 12 production ticket histories. The wrong-result view is explicitly unavailable; no red ticket is invented.
- No production tripwire alarm in these histories. The alarm view says no recorded alarm and stays still.
- No Night Shift run/report. The morning view says no report exists; the two unstarted drafts remain unqueued.
- Fuel is recorded Builder usage against the recorded task limit. Missing usage/limit remains unknown; writer tokens are not mixed in. This is not account allowance.
- Seals are labelled recorded and bound through the existing interpreter to their exact check. This preview does not produce or cryptographically re-verify seals.
- Historical Proof never includes a later patch or later check result. Current task rows remain the current list, clearly separate from the labelled room replay.
- No global planted-cheat count appears as per-task proof.

## Verification

- 9/9 presentation/event-truth unit tests; no failures/skips.
- Strict preview TypeScript check and root `npm run typecheck` pass.
- Separate preview build passes (large-chunk warning remains from reused component dependencies).
- Official Playwright MCP: 28 state captures, zero horizontal overflow, one room canvas, all decision buttons disabled. The actual saved patch opens in the existing highlighted diff viewer and Accept remains disabled. Phone sheet opens/closes; Settings returns keyboard focus; object/fact focus highlighting works; reduced motion settles immediately. Observed idle: zero new requests; observed mutating requests: zero.
- Final video frame inspection shows the Builder at the glass during recorded checking and later recorded seal/review events.
- All 644 existing files under apps/packages/scripts/tests hash-identical to the starting checkout. Root production manifests/config unchanged. No main UI entry point, backend, scoring, sandbox, permission, approval or decision change.
- Credential scan of the staged preview source diff: no leaks. Artifact scan flagged 13 source-file SHA256 digests next to filenames containing key/auth/passkey. Each was recomputed against the corresponding source file: 13 confirmed false positives, zero credentials. See artifact-scan-review.json.
- Production full suite/protected probe/negative controls were not rerun: this is a separate docs-only prototype, and every existing implementation and test file is unchanged. No new tasks or passkey decisions were needed.

## Remaining review limits

No physical iPhone was used; 390px browser verification is not device certification. Shared-layout and swipe interactions are prototype behavior, not integrated into the working app. Live burst timing was demonstrated by recorded replay, not by launching another Builder. Missing red/alarm/morning sources need actual recorded examples before those moments can be visually signed off. The production UI is unchanged; integration waits for Jesh’s approval.
