# OFFICE-3: first preview, awaiting review

Branch codex/office-v3 from 738c972. This is the requested preview gate, not OFFICE-3 completion.

## Delivered
- preview/day.png: noon review clock, actual recorded README ticket.
- preview/night.png: 23:00 review clock, same recorded ticket.
- preview/ten-second-preview.webm: 10 seconds of the real ticket replay; native Playwright MCP capture trimmed without changing event order. 1440×1080, 25fps preview, not the final 1080p/vertical 60fps deliverables.
- preview/day-390.png and night-390.png: phone review; controls visibly overlap the stage.
- art-bible.md: palette, permission, rendering contract, original-art provenance, reference principles and shot list.
- skill-decisions.json: 21 project-local installs, five exclusions.

## Checks actually run
- Workshop behavior + lighting tests: 19 passed, 0 failed/skipped/cancelled.
- npm run typecheck: passed within production build.
- npm run build: passed; existing optional large-chunk warning remains.
- 256 protected file hashes: unchanged.
- MCP captures at 1440 and 390, 100% zoom, no horizontal overflow. No additional HTTP requests during the sampled replay interval.

Full suite, 69-path probe and 12 negative controls have NOT yet been rerun for this preview. They remain mandatory before final OFFICE-3 completion. No fresh 60fps claim is made.

## Honest visual review
The larger figures, couch/cat, full-window composition and real-clock day/night grading are present. The night view is too muted: the room grade currently dims the additive lights as well. The mobile HUD overlaps the illustration, and the still phone illustration does not yet share the full room grade. These are known preview defects.

Automatic approval review rejected further UI refinement because of the user's stop-for-review gate. No rejected refinement edits were applied. This WIP preserves exactly the first captures for review.

## Not built yet
Interactive safety objects with real provenance; new pet movement; final camera/trailer/payoff; dual-aspect 60fps recording and duration metadata; three full final review passes. Production decisions, checks, permissions and sandbox remain untouched.

## Review requested
Review day, night and clip before any more OFFICE-3 implementation.
