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
