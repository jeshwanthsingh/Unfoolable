# OFFICE-1: optional Workshop

Base 83a3779, local branch codex/office-v1. Display only. The simple list remains the default. No server, shared-domain, permission, scoring, grader or decision edits.

## Plan and checks

1. Event projection: four desk definitions, exact ticket/event identity, no invented worker activity. Test tripwire freeze, STOP dimming, stamps, duplicate/foreign events, finite replay, Builder always outside inspection glass.
2. Optional Workshop tab: consume the existing main-screen SSE hook; fetch selected history only on selection or a real revision change. Replace the old four-second poll. Prove one stream and zero idle requests.
3. Scene: original geometric characters/workbenches, Kenney CC0 crate, glass inspection room, stamp desk. Finite 250ms zero-bounce spatial transitions only for new recorded state/result/decision events. Reduced motion and phone use the static diagram. Hidden/idle rendering stops.
4. Replay: selected real ticket history, compressed to 45 seconds; clear recorded/read-only label, no decisions, no live requests from replay playback. Capture real-history replay, light/dark 1440/390, inspect and refine.
5. Verification: full tests, strict typecheck/build, protected-path probe, 12 negative controls; compare all server/shared/scripts/dependency files by SHA256 against BASE. Local WIP commit per step, never push.

## Visual plan

One room is the hero. Graphite #262E31 and warm wood #9B7950 in dark mode; near-white #FAFBFC and pale wood #D6BD91 in light mode. Brass #B8975B marks fixtures; green/amber/red mean recorded check results only. Existing Instrument Sans (OFL), system fallbacks; no new fonts. Builder bench left, glass inspection right, Test Writer at the upper side desk, human stamp below. The Builder can approach the inspection handoff outside the glass; the Grader stays inside. Labels and keyboard buttons remain HTML, with an accessible static diagram at reduced motion and 390px.

Self-review: avoid the old five identical station-card dashboard and a game/office clone. Use a single architectural room, purposeful door/inspection-tray geometry and quiet desk labels. No ambient walking, bouncing, fictional reviewer, fake test counter or fake stamp. The Writer only has completion evidence today, so its character remains still; a recorded result can acknowledge its work.

Tools retained: PixiJS 8.22.0 (MIT), Motion 14.3.0 (MIT), React 19.3.0 (MIT), Kenney Prototype Pack 2.3 crate (CC0, license in public/workshop). Characters/room are original primitives. Existing approved frontend-design, Emil animate/review/performance and webapp-testing skills; official Playwright MCP 0.0.83 (Apache-2.0), SDK 1.32.1 (MIT). No new dependencies or copied Munder/LimeZu/TV-show material.

## First visual review

1440/390 light/dark screenshots exposed labels covering Writer/owner characters and a desktop room tall enough to hide the result. Labels moved clear, metadata raised to 13px, Workshop-only header space reduced and room width capped at 940px. The simple list's dimensions stay unchanged. Phone/reduced diagram now mirrors the actual result stamp; a human reject stamp uses a cross, never an acceptance tick. Initial history and live/replay mode changes snap; only later real events animate. First idle audit: one SSE, zero requests and zero animation frames for 20 seconds.

## Motion review

| Before | After | Why |
| --- | --- | --- |
| First historical load could look like new travel | Initial/selection/replay-mode history snaps | Loading old data is not a new work event |
| Label overlays covered two characters | Labels moved away; 13px metadata | Keep original figures and states readable |
| Static phone diagram omitted result marks | Recorded check mark drawn instantly | Reduced motion keeps information, removes travel |
| Human reject used a generic tick | Reject uses a cross | A human decision must not look like a check pass |

Motion purpose: spatial consistency and state indication. Existing 250ms, zero-bounce spring; no CSS layout-property animations, keyboard entrance, ambient loop or idle ticker. Active movement uses Pixi/WebGL geometry, interrupted from the current pose. Reduced motion uses SVG/HTML; hidden tabs cancel the owned frame. Review decision: approve for bounded desktop replay; physical device feel is not a hardware benchmark.

## Responsive/idle proof

Official MCP first/refined passes at 1440 and 390, light/dark, were captured and manually inspected. Native reduced-motion contexts at both widths use the static SVG/HTML diagram with no Pixi canvas. Each idle audit observed one SSE and zero new requests, renders or animation frames over 20 seconds. Replay uses the cached selected history, with zero requests during its full 45 seconds. No review or decision control is enabled by playback. Existing Stop all remains available outside the scene.
