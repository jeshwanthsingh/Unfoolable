# Unfoolable visual review

## Before building

The approved Hallmark plan replaced the incumbent dashboard rather than decorating it. Rejected floating shadow cards, status pills, brushed-gradient texture and an animated queue. See docs/DESIGN.md for the pre-build review.

## Pass 1: actual MCP screenshots

Viewed pass-1/light-1440.png, light-390.png and dark-390.png. Long task titles overwhelmed the phone and spacing between summary and rows felt accidental. Added two-line desktop / three-line phone previews with the complete original title in Proof, reduced empty announcement spacing, simplified the open-ring mark. Found a correctness issue while reading the screen: older pending work was omitted from the summary. Summary now counts every currently pending decision, independently of today's decisions.

## Pass 2: all requested states

Viewed both complete 12-state phone contact sheets and full desktop/phone Proof, checked, wrong and pending-confirmation screenshots. Found that cold-offline looked like an empty account. Removed the empty assertion while offline and added explicit recovery text. Corrected the isolated working fixture's historical start event; the real UI had correctly displayed its old elapsed time. Fixed initial-history suppression so the first genuinely new result can strike, while repeated polls and history stay still.

The pending-confirmation screenshot is the real existing confirmation component with a complete synthetic fixture request. It is not a captured operating-system Touch ID sheet and no biometric decision was made. The fixture refuses every human decision.

## Source audit coverage

Vercel guidelines: native form labels, native dialog, skip link, focus indicator, finite transform-only motion. Jakub interface review: main entry point plus Proof, settings and original Labs expanded. Accessibility: native modal trap/Escape/return focus; visible words duplicate all mark meanings. Ibelick baseline: no new UI framework, existing Motion reused, no gradients or shadow-card list. Emil: 180ms zero-bounce strike only on a new stored check result; reduced/hidden skip it; no frame loop.

## What intentionally remains simple

No old-test total is fabricated: the current detail API does not expose a complete total, so the main screen says recorded tests passed. Proof preserves the complete stored response and original technical views. Sound starts muted. Assay is the default balanced density; Compact favors more work per screen, Spacious favors larger type and separation.

## Reserved for later

No new checker, agent role, approval mechanism, task state, progress estimate or phone authentication transport. No art pack, fake events in production, or external font service.

## Pass 3: interaction and comprehension

Actual MCP checks passed at 1440, 768, 390 and 320px: no page or modal horizontal overflow; native modal traps Tab, Escape closes it, and focus returns to Look at the changes. One opened file did not unlock Accept; every file opened did. Clicking Accept, Reject or draft Start requested the existing exact passkey operation; the isolated server refused it and no decision endpoint ran. Typing “keep it” remained a chat message. New stored result struck once and settled; idle requested zero animation frames; reduced-motion preference produced a static mark.

The screenshot-only read-only session correctly distinguished incomplete checks, stale checks and accepted work. It found two ambiguities: the summary counted a pending row below the fold, and Accepted might mean merged. Changed the wording to “waiting; scroll to see all” and “Saved separately; not merged into your project.” Raw user-authored task titles remain intact in Proof.

Code review found a minute timer being reset by frequent polling; it now depends on whether work exists rather than the changing response array. Optional audio errors cannot interrupt the result, and the audio context closes promptly. Existing project and verification deep links remain usable; secondary views are lazily loaded.

Measured AA ratios: light body 11.267, secondary 5.675, error text 4.518; all mark/well pairs exceed 3. Dark body 12.728, secondary 7.602, error 7.871. Contrast is documented in contrast.json. Visible text and different outlines duplicate color meanings. Accessible names/roles were inspected via MCP snapshots; an actual VoiceOver session was not performed.

Final interaction check: the real displayed counter advanced from 2 minutes to 3 minutes while the app continued two-second polling. Per-file highlighted review at 390px did not overflow the page or dialog. Technical AI wording stays in the original note under Technical details; an appropriate nontechnical first paragraph can be shown above it. No checker or approval implementation changed.

A final state audit also kept accepted work with unchecked parts amber and kept recorded warnings red after acceptance. A failed check in Needs you stays visibly wrong; refreshing does not hide red flags. Cancelled tasks do not offer actions the existing server forbids. Accept is shown only for a fresh recorded passing/gaps result plus server permission and completed per-file review. These presentation checks do not change the protected checker, server decision policy or Touch ID implementation.
