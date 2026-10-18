# Unfoolable — Round UI-3

Implemented on codex/unfoolable from cd98243. Main application: http://localhost:3225/. CLI: ./unfool chat; ./cc chat remains supported. No remote, merge or deployment.

## What changed

One pewter column replaces the Workshop as the primary screen. Original embossed shield shapes communicate checked, incomplete, wrong, working and stuck without relying on color. Instrument Sans is self-hosted. Assay is the default; Compact and Spacious remain under Settings > Look. Light and dark are supported.

Proof contains the plain checklist, separately labelled AI note, highlighted per-file changes, and the complete original technical views/response in collapsed Technical details. Settings > Labs retains original working screens and historical directions. Original requests are never rewritten. Therefore literal user-authored titles can contain technical words; UI-authored status/button copy cannot.

## Review and evidence

- final/: 12 controlled states, both themes, desktop 1440 and phone 390; 48 individual screenshots. Includes empty, working, checked, gaps, wrong, stuck, needs-you, proof, long-title, fifty tasks, confirmation and offline.
- final/contact-light.png and contact-dark.png: all 12 phone states together.
- final/three-looks.png: three desktop variants together. Individual desktop and phone variants retained.
- final-flows/main-1440.png, main-768.png, main-390.png, main-320.png: unchanged recorded ticket data, not fabricated task outcomes.
- final-flows/protocol.json: actual official Playwright MCP interaction record. No terminal scraping is used as browser verification.
- final-interactions/: real minute counter advanced under two-second polling; highlighted mobile diff stayed within the page.
- visual-review.md: three review passes, changes and limitations.
- five-second-review.md: fresh screenshot-only read-only comprehension session, and refinements from its feedback.

State matrix records are isolated UI fixtures derived from existing response shapes. They are not claims that those tasks were built or checked. The confirmation screenshot shows the existing local confirmation component, not the macOS Touch ID sheet. The fixture refuses all human decisions. No real Accept, Reject, Retry or playbook approval was performed.

## Safety and tests

The protected checker, sandbox, exact-item human confirmation, stale rejection, and server-side per-file review implementation are unchanged. safety-surface.json records eight critical files byte-identical to cd98243. Existing tests plus 12 new UI tests exercise status truth, keywords, banned effects, exact actions and aliases.

Final source-bound full suite: **947/947**, zero failures/cancellations/skips, 337.656 seconds; tested commit c2c0b23afdba2e877df9db98d87d5104b29dee3a, source unchanged throughout. See full-suite.json; full-suite-reviewed.json records a prior complete 947/947 pass. A prior full run had one unchanged debug-store fixture deadline timeout (946/947); its isolated unchanged rerun passed, followed by a complete 947/947 rerun. The failed run remains in full-suite-timeout.* rather than being hidden.

Typecheck and production build passed (typecheck.log, build.json/log). Existing lazy diff/highlighting and Labs chunk-size warnings remain. after-probe.json: 65 protected paths unreadable in a real Builder, owned worktree git/SQLite/write operations usable. negative-controls.json: all 12 non-PASS (5 FAIL, 7 INCONCLUSIVE), zero false PASS. Tripwire and Watchman regressions are included in the full suite.

Browser checks: exact Accept/Reject/Start confirmation routes; typed “keep it” does not decide; a single opened file cannot unlock Accept; every file must be opened; modal Tab trap, Escape and return focus; reduced motion static; zero requestAnimationFrame callbacks while idle; finite strike only on a new result; no horizontal overflow at 320, 390, 768 or 1440. contrast.json records AA text and non-text checks. Accessible names/roles inspected; actual VoiceOver and a fresh biometric confirmation were not performed this round.

## Design review

Rejected generic floating cards, blurred layers, gradients, dashboard panels and perpetual motion before building. Screenshot review then corrected overwhelming long titles, hidden below-fold summary counts, cold-offline false empty state, polling-reset minute timer, ambiguous Accepted wording, and acceptance incorrectly repainting unchecked work green. Accepted work with gaps remains amber; recorded red warnings remain red. See docs/DESIGN.md and docs/WORDS.md.

## Tools and limitations

All versions, licenses, local instruction hashes and font provenance are in docs/DESIGN_TOOLS.md. Changed-file Gitleaks scan completed with zero findings, network denied and owned cleanup certified (gitleaks-change-scan.json). No npm dependency was added or upgraded. Font: Instrument Sans, OFL 1.1. Official Playwright MCP is Apache-2.0. Two named skills could not be located in their official upstream locations: OpenAI frontend-skill and Tyler Gibbs linear-design-principles. No similarly named substitute was installed. Their absence is explicit rather than claimed as usage.

No new model, billing, API key, AI role, checker or approval mechanism. No production repository was changed. Optional sound is muted initially. Best-effort native tripwire limitations remain the existing accepted policy. Historical views retain their old appearance inside Labs/Technical details.
