# UI-6 visual review

Mode: full. Scope: Unfoolable main screen, drafts, task rows, Proof and settings at 1440 and 390 CSS pixels, light/dark. React and existing plain CSS; original SVG marks, Instrument Sans and Motion retained. No component/style/animation library added. Safety and plain language outrank individual skill recipes.

## Plan review

Kept the hallmark as the one visual idea. Rejected glossy cards, tinted dashboard panels, decorative color, accent gradients, entrance animation and a navigation redesign. Spacing, contrast, silhouette and one clear action carry the hierarchy. Taste/Impeccable remain quarantined by Jesh’s explicit decision; they were not loaded. The requested make-interfaces-feel-better skill was scanned before loading (0/100, CAUTION, offline/static only).

## Three screenshot review passes

1. `pass1/`: brighter surfaces, larger marks, filled primary actions and slim header. Reviewed all four viewport/theme combinations. Main problem: the old README draft still displaced actual work. Inspection found the stored Start request includes an appended Done means envelope. Added a failing regression, corrected exact matching, and folded only similar wording conservatively. Different constraints retain every original draft action; no data merged/deleted.
2. `pass2/`: reviewed all four combinations after that refinement. Marks and waiting work now appear sooner; error drafts are folded, three waiting rows previewed. Measured native contrast and inspected focus. Live data changed during review (README accepted; another ticket checking), so comparisons moved to an authenticated, loopback-only read-only snapshot harness. Original b968ade UI was built using git archive; both UIs receive identical recorded bytes. No production decision endpoints exist on this harness.
3. `same-data-before/`, `same-data-after/`, `audit-complete/`, `reduced/`: final four-way comparison, native contrast, archive persistence/restore, complete waiting list, keyboard-visible focus, native modal background lock and still-disabled Accept on a genuinely unreviewed item. Final review also removed the leftover generic pewter hover outside mark wells, made release faster than press (100ms release vs 150ms press), and kept archive announcements in a stable live region. A previously human-reviewed item correctly had Accept available; the audit was corrected to choose an unreviewed one, not to change the product. MCP has no browser_run_code tool in this installed release; native reduced motion was verified using its supported context configuration instead.

## Findings and changes

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| Medium | unfoolable.css surfaces | Whole page pewter | Near-white / deep neutral, pewter only in mark recesses | Contrast and material hierarchy |
| Medium | draft / task / Proof actions | Identical outlines | One filled primary, quiet secondaries | A decision should be immediately identifiable |
| Medium | Hallmark.tsx | Small shield/dash in square | 48px distinct seal, ring, notch and pause glyphs | State is distinguishable without color |
| Medium | main list / Proof | Repeated AI title metadata, vague gaps | Attribution in Proof; recorded gap named plainly | Keep the main decision understandable |
| Medium | main budget stop | Token/command detail dominates | Ran out of time; Give it more time; Touch ID note | Same protected action, less implementation language |
| Medium | draft display | Duplicate-looking full request | Exact duplicate link; conservative similar-request disclosure | Reduce clutter without silently erasing differing requests |
| Medium | DraftList / Tasks | All old requests and waiting rows expanded | Folded old drafts, reversible local archive, three waiting rows | Calm first screen, all content accessible |
| Low | header / typography | Large repeated summary / mixed weights | Slim factual status, 600 titles, 400 statuses, 13px metadata | Visual rhythm |
| Low | controls | Unguarded press shift | Pointer-only 0.96 press (150ms), release (100ms), custom curve; keyboard still | Purposeful interruptible feedback |

## Coverage

| Category | Inspected | Result |
|---|---|---|
| Typography | Computed styles, 1440/390 screenshots, long real titles | Instrument Sans retained; titles 600; metadata 13px; no overflow |
| Surfaces | Both themes; main, cards and Proof | Minimum measured secondary contrast 6.7757:1 light / 8.5464:1 dark |
| Animation | CSS diff, retained 180ms event strike, browser idle/native reduced-motion checks | Only transform/opacity; no keyboard press motion; no idle running animations; reduced mode transition 0s |
| Icons | Original SVGs, actual stopped/closer/working/accepted states, existing distinct-state tests | Larger silhouettes, non-color labels; no new asset pack |
| Performance | Existing stream tests, 500-ticket tests, browser idle inspection | No new polling or eager Proof loads; waiting list initially bounded |

Considered and rejected: fuzzy automatic deduplication (different constraints must survive); cloud-synced archiving (requires new domain/API behavior outside this brief); continuously spinning working mark (would invent progress); heavier material/shadows (would recreate the generic card layout).

## Verification boundaries

Archive/restore is a browser-local view preference; SQLite drafts remain unchanged. It survives reload in that browser and can be restored, but does not sync across browsers/devices. Earlier means an error draft or more than 24 hours old. Exact duplicate means same repository plus the exact request, optionally including the existing Start envelope; casing/internal whitespace remain significant. Similar means the same long first sentence; it is a suggestion, never authoritative deduplication.

All original approval/Start/Continue handlers, acceptance predicate, diff-review handler and event-strike effect were verified byte-for-byte unchanged (`safety-scope.json`). No decision was made by these audits. Manual VoiceOver and a physical phone were not tested; 390px refers to Chromium emulation. No instrumented mid-range-device frame-rate benchmark was run. Optional sound/strike code remains unchanged.

Verdict: no remaining actionable accessibility or interaction blocker in the inspected scope. Aesthetic quality remains a human judgment; this report does not claim an objective world-class score. Full-suite results are recorded separately.
