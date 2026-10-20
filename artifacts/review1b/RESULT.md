# REVIEW-1b

Branch: codex/review-1b, based on 6e123f7. No new reviewer model calls, pushes, merges or deployments.

## Decision

Intent OFF, Readability OFF, UI OFF. The rule was committed in docs/REVIEWERS.md before applying the decision. Both text reviewers have zero false alarms on eleven correct cases, and catch exactly the same five of eight wrong study cases. Four are redundant with the saved Test Writer alarm. A2-planted-special-case is additional to that alarm, whose test encountered a BASE setup error. No quality-gate results were saved for the study; empty diagnostic arrays cannot establish a clean gate run. Thus uniquely caught beyond both other signals: zero proven, actual count unknown. UI has no eligible calibration data. No reviewer desks were added.

Final reviewer cost per ordinary ticket: zero tokens. Saved mean cost if enabled: Intent 7,824.87; Readability 7,820.61 tokens per task. No new cost measurement was performed.

## Overlap

[Full 8-wrong + 12-control table](overlap.md). Quality gates are Not measured for every row. Test Writer alarms are available for the eight study cases only; the twelve controls were not measured with that alarm. Protected-check rejection is not counted as a gate or writer flag.

Among controls, eight have valid notes from both reviewers; Intent alone has a non-serious symlink note, while Readability alone has an R1 note. Two controls have no reviewer findings. These differences do not prove unique value beyond unmeasured other signals. All reclassified findings remain advisory.

## Discarded output

Previously one invalid anchor rejected the entire response. Now structurally valid notes outside the supplied patch are dropped individually, valid notes are retained, and the discarded count is disclosed on cards and Proof. If every note is discarded, the review is incomplete. Malformed or unbounded output still fails. No finding is manufactured from discarded output.

Saved-output reclassification: observation-pipe/Readability retains one finding and discards one; R1/Intent discards its only note and is incomplete. Original measurements and all 95 bound saved source files remain unchanged. See analysis.json and source-integrity.json.

The new reviewer_discarded event is display-only and excluded from exact decision bindings, as are existing reviewer events. Protected results, review risk, passkeys and actions are unchanged.

## Verification

Full suite: 1109/1109 pass, zero failures/cancelled/skipped, 336.300 seconds. Typecheck and production build pass. Detailed results are in FINAL_VALIDATION.json and full-suite-final.log. Golden replay: 61 exact verdict-and-trace comparisons against fbad889, zero differences. Twenty-two protected files retain fbad889 hashes. Twelve negative controls remain non-PASS. Sixty-nine protected paths remain unreadable; all six sensitive local endpoints are denied, owned Git/temp/SQLite checks pass, and worker cleanup is certified.

Focused regression tests cover mixed valid/invalid anchors, all-discarded incomplete output, malformed output rejection, display-only events, and rendered card/Proof wording. Existing random-sidecar invariants still assert no verdict or approval-binding effect.

Playwright MCP checked the saved read-only example at 1440px and 390px, light and dark, with no overflow or enabled decision buttons. Screenshots: card-1440-light.png, card-1440-dark.png, card-390-light.png, card-390-dark.png. No new Workshop desk screenshot is needed because none was enabled. Existing Workshop rendering was also captured unchanged.

## Limits

The absent quality-gate overlap data prevents measuring the true marginal catch count. It is recorded as unknown, not inferred from empty diagnostics or from a control's protected-check failure. No new study was authorized or run to fill it. There is no demonstrated reviewer worth enabling from this saved evidence alone.
