# UI-7 visual review

Baseline: 6767f18. Branch: codex/ui-memorable. Official Playwright MCP 0.0.83, isolated browser, no personal browser profile. CSS zoom 1, visualViewport.scale 1 and deviceScaleFactor 1. Raw images are 1440x1080 and 390x844; final comparison sheets preserve each original pixel at 1:1. No scaled-down screenshot was used to judge type or glyph recognition.

## Pass 1 — hierarchy and geometry

Captured steps 1–7, then pass1 in light/dark at both widths. The amber nested circles read like C; use an interrupted ring inside an irregular drawn seal. Introduced a 30px workload greeting, retained 20px wordmark, and set 20px task names / 15px statuses / 13px metadata. The old input border still won specificity over the new rounded composer; fixed the duplicate border with a scoped selector. No handler changed.

## Pass 2 — actual size, not a thumbnail

Reviewed all four pass2-final images and the actual component seal sheet at 24px and 48px. Refresh/re-check still looked like C, so replaced it with opposing arrows inside its hexagonal seal. Desktop showed the allowance note beside its button because max-width constrained its flex basis: made it a full, non-shrinking flex row. The attention wash looked like one slab: separated row washes with small gaps and corners. Updated plain-title hover and screen-reader names to match the visible title.

## Pass 3 — final reading and interaction audit

Reviewed pass3 at desktop/phone in light/dark and seals-final. Final-audit tests actual 100% zoom, secondary contrast with the attention tint included, no overflow, 17px base / 20px titles / 15px statuses, 40px Ask button, 720px desktop column, input growth without submission, keyboard focus, archive/restore without server mutation, complete waiting-list access and an unreviewed Proof whose Accept remains locked. Native reduced motion checked in a separate supported MCP browser context. Final before/after images both read the exact same post-backfill recorded real data.

## Skills audit

Frontend-design: one calm greeting and one subject-specific seal, no decorative dashboard metrics or new asset pack. Jakub better-ui / make-interfaces-feel-better: one input boundary, optical mark proportions, full-row helper placement, existing 100/150ms pointer press feedback. Emil: only the existing fresh Accept event can start a 240ms opacity acknowledgement; no initial-mount, clock, history, hidden-tab or reduced-motion flash. Static attention wash adds no animation. Web-design-guidelines: native controls and labels, focus-within replacement, semantic status region, no zoom restriction, content-visibility and bounded lists preserved. User-specified sentence case and ASCII placeholder take precedence over guideline typography defaults.

## What remains deliberately simple

No new navigation, art, libraries, backend states or animation loops. The 24px seal sheet is a design specimen, not a production task state. No real Start, Continue, Accept, Reject or Touch ID was exercised by review. Physical phone, VoiceOver and low-end-device frame rate are unverified; browser layout and accessible labels are verified. Skills marked unsafe remain quarantined.

## Cache follow-up

The existing static SVG policy is immutable. A focused failing test proved the old favicon URL did not change with the new seal. The URL now includes the SVG SHA256 prefix; the test passes and the built browser page was rechecked in all four views. This changes no pixels, handler, server policy or permission. The first full suite passed 1,019/1,019; final full-suite evidence includes the extra cache regression.
