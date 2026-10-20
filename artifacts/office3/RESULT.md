# OFFICE-3 — cinematic pixel Workshop

## Verdict
PASS for the implemented display slice and safety regression checks, with the rendering/device limits below. Source commit: d7eb186 (codex/office-v3), based on 738c972. Local WIP commits only; no push, merge, deployment, new billing or approval action.

## What changed
Full-window pixel room with one compact translucent HUD and F/Escape immersive controls. Real local time selects warm morning, neutral/warm noon, orange evening and deep blue-violet night. Separate 480×288 six-band light map multiplies the scene; unshaded lamps, screens, tube LEDs and clock sit above it, with restrained bloom. The cool glass lab is the brightest night space. Day shafts and dust, larger characters, original couch/cats, subtle plants and ambient waiting poses add life without inventing work.

Only real roles are shown: Builder, Grader, Test Writer and your stamp station. No reviewer, new AI role, workflow or backend event was added. Fine-grained activity is derived from existing recorded tool/check events; missing Test Writer detail stays still rather than being fabricated.

Phone: still illustration with safe-area Controls button and tappable objects; no heavy canvas. Reduced-motion desktop also uses the still illustration.

## Media
| Deliverable | File | Verified metadata |
| --- | --- | --- |
| Landscape trailer | workshop-16x9.webm | 1920×1080, 60fps stream, 38.240 seconds |
| Vertical trailer | workshop-9x16.webm | 1080×1920, 60fps stream, 38.218 seconds |
| Day/night, light/dark, desktop/phone | final/screens/ | 1440px and 390px, 100% browser zoom |
| Original approved preview | preview/ | Day, night and ten-second preview retained |

Recorded ticket: c9f83568-2d33-4e5f-9ef1-b836c4f49cf2, “Add local setup guidance to README”. Its actual outcome was PASSED WITH GAPS; the trailer preserves the amber result and says “Checked with gaps”. It does not invent acceptance or a green success.

Replay lasts 38 seconds: opening title, ordered actual events with labelled compressed gaps, package handoff, recorded result strike, then end card. No check result means no result stamp and an explicit no-result ending. Camera eases toward the active station at about 1.0–1.25×, bounded by the room; portrait reframes more tightly. Review actions are disabled in replay.

Recorder requests 60fps and downloads a WebM plus JSON sidecar. Final share files add embedded duration by FFmpeg packet-copy remux; workshop-16x9.json and workshop-9x16.json prove identical video stream hashes. No re-encoding or invented/interpolated frames.

## Real-state objects
| Object | Actual data source / meaning |
| --- | --- |
| Barred window | Existing Builder permission profile in build-runtime.ts; configured internet restriction |
| Locked drawer wall | Fresh real Builder probe: 69 protected paths, 0 readable, dated 2026-10-20; probe-attestation.json |
| Tripwire lines | Selected ticket needs_you/TRIPWIRE or agent_event/tripwire; no alarm is not sensor-health proof |
| Fuel gauge | Stored budget.reportedCodexTokens / budget.limits.maxCodexTokens; unknown when absent; replay labels stored totals |
| Red STOP lever | Reveals/focuses the existing main-screen Stop all control; never automatically executes it |
| Lab lock | Existing separate restricted verification process; configuration fact, not a fabricated running state |
| Package at your desk | Existing exact-ticket proof/review flow; replay cannot open an actionable review |
| Clock and window | Browser’s real local Date in production; captures explicitly freeze noon or 23:00 for comparison |
| Test machine | Recorded check_progress integers only; missing counts stay unlit/unknown |

Each safety object is tappable and also reachable through keyboard/phone Explore room. Every inspector gives one plain explanation and its source. Drawer data is a dated build-time attestation, not continuously refreshed monitoring. Pet/plant/blink motion is decorative and never alters recorded state.

## Verification
- Full suite: **1,074/1,074 PASS**, 0 failures/skips/cancellations, **323.251 seconds** wall time. Native outside-sandbox run under caffeinate; source unchanged during run. See full-suite.json and full-suite.log.
- Focused Workshop tests: **26/26 PASS**.
- Fresh standalone typecheck and production build: PASS.
- **256/256 protected files unchanged**, plus exact main decision-handler body hashes unchanged; full manifest in protected-code-hashes.json.
- Fresh real Builder + exact-profile probe: **0/69 readable**, all owned Git/status/diff/log/temp/SQLite checks pass, all six protected endpoints denied, cleanup certified. See after-probe.json and probe-attestation.json.
- **12/12 negative controls non-PASS: 5 FAIL, 7 INCONCLUSIVE, 0 PASS**. Core hashes unchanged. See negative-controls.json.
- Offline Gitleaks: zero unresolved findings; exact unchanged synthetic redaction fixture triaged for this audit only. Application scan rules unchanged.
- MCP: all seven safety disclosures; actual selected-ticket review binding; replay review disabled; F/Escape; no phone overflow or HUD overlap; real reduced-motion context has no canvas.
- One shared SSE; zero extra HTTP requests in idle/replay samples. Visible sample **60.0fps**, about **0.565ms paint**; earlier recording sample **58.7fps**, about **0.89ms paint**. Controlled hidden input produced **zero frames**.

## Skills, art and tools
21 project-local Pixi skills installed from pinned official commit 83760c6f53462ca9cecd68055041f5a8c94758ce, MIT. Zero recorded findings, but partial scan is not a safety guarantee. Skipped application/assets/create for flagged hidden-instruction/network/automatic-command findings; scene-text remains explicitly forbidden. Scene-sprite remains out after automatic approval review rejected its incomplete-inspection finding. Exact decisions in skill-decisions.json; versions/licenses in docs/DESIGN_TOOLS.md.

PixiJS 8.22.0 and official pixi-filters 6.1.5 (MIT), OSV response has no published vulnerabilities. The exact filter-module subset is vendored with license/hash provenance to preserve frozen package manifests. No new npm dependency or runtime/model change. Original art CC0-1.0; ENDESGA 32 palette uses Lospec’s free-use permission and attribution. Three official game reference scenes were viewed for mood only; none of their code/art is used in the app.

## Review / remaining limits
Three-plus screenshot review passes and corrections are recorded in visual-review.md. Current image quality is original small pixel art; it does not claim the production art detail of Eastward or Graveyard Keeper.

- Local Chrome measurements are not a universal/physical-iPhone 60fps guarantee. Phone is intentionally static.
- Hidden handler was tested with controlled visibility input; MCP focus emulation did not prove a natural OS tab-hide transition.
- Three Pixi bound-texture/sampler cleanup warnings appear on some scene switches. No page error or failed recording was observed; warnings retained, not hidden by a dependency upgrade.
- Build retains optional large-chunk warnings and notes the Pixi dynamic import is redundant inside the already lazy-loaded room chunk.
- The Mac’s existing Stop all control has no separate confirmation dialog. The lever reveals that exact control; it does not introduce or bypass a decision path.
- No new real task or human approval was executed for the movie; it is clearly labelled Replay.

## Open
Use the existing Unfoolable launch command (`./cc chat`), then select Workshop, or open http://localhost:3225/?view=workshop in your connected local screen. Main Hallmark list remains unchanged.
