# Round UI-1 — Interactive Workshop + Vault

## Built

Event-only XState ticket, lock and approval projections; a warm brass/dark Pixi Workshop with Kenney CC0 crates; an SVG/Motion Vault; git-diff-view/Shiki file review; compact phone ticket list; read-only recorded replay. No new AI roles or backend product concepts. Protected verification, Builder, permission profiles, passkeys and exact-file review authority remain unchanged.

Step 0: new test files / added cases are AMBER, unless another independent red flag applies. Edits/deletions of existing test bodies/expectations remain RED. Native ast-grep compares frozen Git objects, including insertions with no deleted lines. Missing/unsupported evidence stays conservatively RED. CI/playbook/lockfile and size-cap red flags remain independent.

## Verification

- Full suite: **923/923 PASS**, 0 fail, 0 skipped; 323.669 seconds.
- Strict application typecheck and production build: PASS.
- Real Builder + exact kernel profile: **65 paths denied**, owned Git status/diff/log, SQLite/temp and writes PASS.
- Existing 12 negative controls: **5 FAIL / 7 INCONCLUSIVE / 0 PASS**, oracle core unchanged.
- Playwright production-build fixture: 1440px, 768px, 390px; real canvas station click; highlighted exact-file diff; Keep remains locked; reduced motion; no horizontal overflow.
- Idle measurement: **0 requestAnimationFrame callbacks** after settling. Pixi's stationary-pointer and system-scheduler loops had initially kept running; those are stopped now. Native pointer clicks still work.
- Native background-tab visibility was not emitted by this headless Chrome session (`document.hidden` stayed false). Explicit simulated visibility event: replay paused, 0 frames while hidden. This is a labelled native-visibility proof limitation.
- Credential scan: 0 findings, offline protected Gitleaks; no new paid API/billing.

## Historical replay

The read-only fixture uses ticket b15600b3's actual 135 persisted events, with 19 meaningful submitted/state/check-result/decision replay stops. Build → check → review plus historical interrupted/error/recheck transitions are visible. It had no Fixer attempt; none is fabricated. Locks open only on recorded results. Coverage/mutation remains advisory and grey, not a fabricated pass. Every replay is labelled historical and cannot authorize decisions.

The fixture rejects decisions and keeps test-only file-view receipts separate from live data. Current real chat was captured for the screenshots. No Keep/Discard or real file-view action was made. The live ticket is still ready_for_review / PASSED WITH GAPS, unchanged Candidate, AMBER for additive tests.

## Artifacts

- desktop-1440.png, vault-1440.png
- mobile-390.png, mobile-vault-390.png
- tablet-768.png, highlighted-diff.png, highlighted-diff-390.png
- recorded-replay.webm (short native screen capture)
- browser-proof.json, phone-diff-proof.json, render-lifecycle.json, visibility-proof.json
- full-suite.log / full-suite.json, after-probe.json, negative-controls.json
- source-integrity.json, gitleaks-change-scan.json

## Libraries and limitations

Exact versions/licenses: ../../docs/WORKSHOP.md. New runtime UI libraries are MIT; Kenney art is CC0. Reused native AST tool: 0.51.0 (MIT). No illustration marketplace or paid font/service.

The lazy diff/highlighter chunk is about 1.27 MB minified; Vite warns about chunk size. It loads only when a file is opened. Pixi is not imported on phone/tablet widths below 1000px. skipLibCheck is required for upstream library declaration conflicts; application strictness and exact optional properties remain enabled.

## Open

The existing local server is on http://localhost:3225. Use the private operator launcher: `./cc chat` from the repository. This opens the Workshop with existing passkey protection. Never push/merge/deploy: local branch codex/workshop only.
