# UI-7: from clean to memorable

Branch codex/ui-memorable from 6767f18. Local WIP commit per step; no push, merge or deployment.

Original drawn seals without letters: green checked, amber interrupted ring in a seal, red notched shield, event-driven working arc, grey pause; the re-check mark now uses opposing arrows rather than C. Same checked seal in wordmark and favicon. Native-size sheet: seals-final/seals-24-48.png.

17px base, 20px semibold task names, 15px statuses, metadata at least 13px, 40px Ask button, 720px desktop column. The small wordmark gives way to a 30px desktop / 28px phone greeting from local time and real ticket/draft states. Rounded growing input contains Ask. Safe finished items use quiet actions; attention rows have a faint static amber wash. A 240ms green opacity acknowledgement requires an actual fresh Accept event and is suppressed on mount, hidden tabs and reduced motion.

Seven missing legacy display titles were written by this Codex assistant and stored as separate append-only AI metadata. Original requests, original titles, candidate commits, status and every other ticket-row field are unchanged. Proof labels the new display title as AI-written. No new model calls were needed for the backfill.

## Before / after

comparisons/1440-light.png, comparisons/1440-dark.png, comparisons/390-light.png, comparisons/390-dark.png. These preserve screenshot pixels at 1:1; standalone same-data-before and same-data-after viewport PNGs are also retained. Both UIs read identical post-backfill real data (snapshot.json). No synthetic task states or real decision actions were used. Three visual passes and fixes: visual-review.md.

## Verification

Focused tests: 44/44. Typecheck and production build: PASS. Final full suite: 1,020/1,020 passed, zero failures or skips, 347.838 seconds; source stayed unchanged during the run. The preceding complete run also passed 1,019/1,019 before the added favicon cache regression. Real Builder probe: 67/67 protected targets denied; owned Git status/diff/log, SQLite temp and file writes passed. Twelve negative controls: all non-PASS, oracle core unchanged. Browser: 100% viewport and CSS zoom, device scale 1; no horizontal overflow at 390/1440; secondary contrast at least 6.33:1 light / 7.86:1 dark including the attention tint; no idle animation. Native reduced motion passes. See browser-verification.json and final-audit/.

## Safety and limits

No scoring, sandbox, model/runtime, permission, Touch ID, stale-binding or decision-handler change. No application dependencies added. Taste and Impeccable remain quarantined. Existing approved skills and versions are recorded in docs/DESIGN_TOOLS.md. Offline credential scan: zero unresolved findings; one existing synthetic redaction fixture triaged by exact file/line/rule fingerprint, without changing application policy. No new paid API billing enabled.

Manual VoiceOver, physical-phone and low-end-device frame-rate testing are not claimed. The greeting's time-of-day refreshes on ordinary renders rather than adding an idle timer. The existing live application was never stopped or restarted. Accept/Reject remain for Jesh.
