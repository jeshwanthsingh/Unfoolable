# Screenshot review — OBS-0

Scope: full preview review, React + existing Pixi art, plain CSS. Three passes used official Playwright MCP at 1440 and 390, real 100% browser sizing, light/dark in the final matrix. This is a design preview, not an integrated product change.

| Category | Evidence | Result |
|---|---|---|
| Typography | pass-1 and pass-2 captures; final state set | Local Instrument Sans loaded; no remote fonts; technical data remains collapsed |
| Surfaces | same-data room / list / Proof | One room hero; restrained rows; one selected Proof pass |
| Motion | replay recording, idle and reduced-motion attributes | Finite event-sourced motion, .24s spring with zero bounce, no render loop when settled |
| Icons | real existing Hallmark component | Original tick, magnifier and state glyphs reused; no icon library added |
| Performance | MCP idle-request and canvas data checks | No new requests during observed idle interval; no idle rAF loop in preview renderer |

## Review and refinements

| Severity | Location | Before | After | Why |
|---|---|---|---|---|
| High | Phone room, pass 1 | Cropping hid the stamp desk | Fit all three zones, labels in a separate touch rail | Safety objects and owner destination must stay visible |
| Medium | Phone Proof, pass 1 | Resizing captured a sheet partway through its entrance | Fresh phone viewport and settled capture; swipeable Vaul sheet | Review the actual resting composition, not a transient frame |
| Medium | Room safety labels | Old Workshop component carries a 71-path constant | Preview uses latest tracked 74-path probe and its date; actual drawn bars/drawer wall/fuel gauge | A label must name a real depicted object and a dated source |
| High | Recorded Proof | Current patch count and technical result could appear before the historical check | Hide later patch information; technical check comes only from the selected event prefix | Never project future proof backwards in time |
| Medium | Needs-you copy | Low-level presenter returned “Done.” | Reused existing reviewSentence plain copy | Waiting for a decision must not look accepted |
| Low | Room frames | New texture object during every finite walk frame | Cache all Builder frames | Avoid unnecessary per-frame allocation |

## Considered and rejected

- A red alarm animation for an illustrative tripwire view: no matching production event, so the alarm remains absent.
- A fabricated green test counter or self-test badge: test counts must be actual report fields; the 12 controls are system tests, not task proof.
- A working Accept button: this round stops at mockups; real passkey and changed-file review stay exclusively in the unchanged live app.
- Ambient typing and a forever work spinner: no recorded work means stillness.

## Known review limits

No physical iPhone or new Touch ID ceremony was used. The phone sheet was browser-verified at 390px. Three missing recorded states are reported honestly rather than illustrated with fake ticket data. The preview has not been approved for main-screen integration. Production tests/security probes were not rerun for a docs-only prototype; instead every existing apps/packages/scripts/tests file was hash-compared unchanged.
