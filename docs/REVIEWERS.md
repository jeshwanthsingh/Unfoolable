# Reviewer decision rule

Recorded before applying REVIEW-1b decisions. Use saved REVIEW-1 sessions only.

A reviewer may be ON only with zero false alarms on correct changes AND at least one wrong case caught by that reviewer and by no other measured signal. Unknown or unmeasured quality-gate/Test Writer results do not establish unique value. If qualifying reviewers overlap heavily, keep only the cheaper or more useful one. UI remains OFF without data.

## Saved-evidence decision

Intent and Readability each caught the same five of eight wrong study cases, with zero false alarms in eleven correct cases. Four of the five also had a saved Test Writer alarm. A2-planted-special-case is the sole additional catch relative to that alarm. No quality-gate results were supplied or saved for these study packets; their qualityGates arrays are empty. Therefore unique catches beyond both other signals are unproven, not zero measured catches. Both reviewers remain OFF. UI remains OFF. No Workshop desks are added.

The controls test robustness, not independent reviewer value: their protected-check failures must not be relabelled as quality-gate or Test Writer flags. Those two signals were not measured on the saved controls. See artifacts/review1b/overlap.md for each case and missing measurements.

## Invalid output

Drop only structurally valid findings whose file/line is outside the supplied patch. Keep valid findings in the same response. Show the number discarded and why. If all findings were dropped, show Review incomplete, never a clean review. Malformed or unbounded responses remain errors. Discarded findings never count as catches. Preserve original study records and derive a separate local reclassification without model calls.

## Cost

All defaults OFF: zero reviewer tokens per ordinary ticket. Saved Intent mean: 7,824.87 tokens; Readability: 7,820.61 tokens (31 cases each). These measured means do not establish marginal benefit against unmeasured gates.

## SIGN-1 local-tool completion

The eight wrong patches were measured with existing offline quality gates, without AI. Pyright catches A2-planted-special-case, the only formerly possible unique reviewer catch; it also catches the half-fix and edge-case plants. The other four reviewer-caught cases already have Test Writer alarms. Proven unique reviewer catches: zero. All reviewers remain OFF; no on-demand allowance button or reviewer desk is enabled under the conditional rule. See artifacts/sign1/overlap.md and quality-overlap.json.

Precision note: the additional Pyright flags are test-file import/type diagnostics, not semantic proof of the SDK bug. Under the case-overlap rule they are a pre-existing signal to inspect that change. No gate is claimed to have proved the requested behavior.
