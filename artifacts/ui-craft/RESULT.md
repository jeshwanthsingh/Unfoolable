# UI-2: three directions, choice pending

Branch: `codex/ui-craft`, based on `74b07ed`. All commits local. No push, merge, deployment or winner selected. Original operational UI remains at `/`. The existing server on 3225 was confirmed to serve the exact final frontend build. Both read-only development fixture servers and the isolated development browser were cleaned up; the live server was untouched.

## Compare

- [Desktop comparison](compare-desktop.png)
- [Phone comparison](compare-phone.png)

| Direction | Pitch | Pros | Cons | Final evidence |
|---|---|---|---|---|
| A · Instrument | A graphite-and-brass precision Vault. | Clear evidence object; distinctive mechanical identity. | More symbolic; detailed labels need disclosure on phone. | [Desktop](final/instrument-main-1440.png), [phone](round-5/instrument-390.png), [20s replay](instrument-replay-20s.webm) |
| B · Glass Studio | A calm, layered decision sheet. | Readable intent/verdict; clear focus on the decision. | Less sense of a physical workshop. | [Desktop](final/glass-main-1440.png), [phone](round-5/glass-390.png), [20s replay](glass-replay-20s.webm) |
| C · Night Workshop | A warm, original 3D room for recorded work. | Spatial progression and a grounded worker marker. | Larger desktop WebGL chunk; more visual maintenance. Phone deliberately uses no 3D. | [Desktop](final/night-main-1440.png), [phone](round-5/night-390.png), [20s replay](night-replay-20s.webm) |

## Critique and process

[The fifteen-point critique](CRITIQUE.md) gives screenshot evidence per finding. [Visual review](visual-review.md) records three refinement batches, before/after captures and the independent reviewer’s five resolved findings. A final compatibility recapture uses the supported Three.js shadow setting. This is an aesthetic proposal, not an “Apple-level” certification.

## Verification

- Exact final source: **931 tests passed**, zero failures/cancellations/skips, 331.834 seconds wall time.
- Standalone strict typecheck and production build: passed.
- Real Builder probe: **65/65 denied**, Git status/diff/log, SQLite temp and worktree writes still work.
- Twelve protected negative controls: **5 FAIL, 7 INCONCLUSIVE, 0 PASS**.
- All three: 1440px, 768px and 390px; main, Vault, real historical stop, needs-you, empty running filter, accessible disclosures and keyboard focus.
- All three: idle animation frames **0**, reduced-motion active animations **0**, phone canvas **0**. Hidden lifecycle is explicitly simulated, not native background-tab proof.
- Each video is exactly **20.000 seconds**; same real ticket, same event hash in replay-source.json.
- Fresh final navigation: zero JavaScript errors. Original Workshop/chat retained. Historical Keep/Discard disabled; exact-item live review and Touch ID unchanged.
- No server/shared-policy/runtime scripts changed; no paid API or new product AI roles.
- Offline credential scan: see gitleaks-change-scan.json; no findings.

## Skills and libraries

Five requested skills installed into `~/.codex/skills`, with exact commits, hashes and licenses in [skills.json](skills.json): Anthropic frontend-design/webapp-testing and Impeccable (Apache-2.0), Taste and ibelick baseline-ui reviewer (MIT). Impeccable 4.6.0; other identities pinned by source commit. Its context launcher was unavailable; documented direct-context fallback used. The official `openai/skills` tree at 49f948f has no `frontend-skill`; no unrelated substitute installed.

New application libraries: React Three Fiber **9.8.2**, Three **0.186.1**, and @types/three **0.186.0**, all MIT. Existing React/Motion reused. Original geometry/SVG only, no copied Apple/Munder assets or external fonts. Full license/version record: libraries.json.

## Honest limits

Browser evidence uses a read-only local fixture backed by captured real ticket APIs, not fabricated activity. All gallery activity is historical and labelled. Current live tickets are AMBER; red-state evidence is the ticket’s actual recorded harness error, not an invented RED current risk. No Fixer event exists in this history, so none is added. Keep/Discard in history cannot authorize anything; Open live review returns to the existing secure UI.

Night’s lazy chunk is about 916 kB minified and build warns above 500 kB. React Three Fiber emits an upstream Three.Clock deprecation warning; rendering and idle checks pass. No full screen-reader session, Safari certification, native hidden-tab proof or human aesthetic approval is claimed. Choose A, B or C before production integration.
