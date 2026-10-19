# Unfoolable: hallmark

Mode: Operate. One person asks for work, sees what happened, inspects the proof, then decides. A verifier, not an agent spectacle.

## The idea

An assay office strikes a hallmark into metal after checking it. Here, a recorded check result strikes an original seal into a small circular pewter recess. The mark is the only hero. Nothing moves without a new stored event.

## Composition

One left-aligned column, centered, maximum 720px. Slim name/status/Settings bar; one labelled request box and Ask; newest-first task rows. A 56px well anchors each row, followed by title, one status sentence, at most two decisions and See the proof. No dashboard grid, sidebar, canvas, decorative statistics or rounded shadow cards.

```text
Unfoolable                              Settings
AI does the work. Nothing fools the check.
What should we work on?                     Ask
2 waiting for you today.
[mark] Make cancellation reasons visible
       Done, but one part couldn't be checked.
       Look at the changes   Reject
       See the proof
```

## Tokens

Near-white #FAFBFC surface, pewter #E8EBED mark wells, graphite #2A2F35 text. Proof green #2F7A57, ochre #B5762A, signal red #B8432F are marks, never decoration. Dark: surface #151719, wells #2A3036, text #DCE1E5, lifted mark colors. Measure AA against rendered surfaces; deepen ochre in light mode if needed. Instrument Sans variable regular is the only UI family. 15/17/22/34px scale, generous line-height, tabular counts. Text measures below 80 characters.

Spacing: 8, 16, 24, 32, 48, 64px. Input corners 8px; 56px circular wells with 48px glyphs, a subtle inset shadow and highlight; rows have no background, border or shadow. Focus is a visible graphite/text-colored outline.

## Shapes and motion

Checked: solid shield and tick. Look closer: open ring within a shield. Wrong: broken-notched shield. Working: empty well and a finite arc whose angle changes only on new progress events. Stuck: short dash. Text repeats every meaning; color is redundant.

A new recorded check-result event (not initial load or polling repetition) triggers a 180ms zero-bounce spring press, transform only. A static inset well supplies depth. Optional soft metallic Web Audio click is muted by default, enabled by an explicit setting. Hidden tabs and reduced motion produce a static mark. No frame loop or autonomous spinner.

## Proof and safety

A native modal dialog is a right sheet on desktop and bottom sheet on phone. Escape closes it and focus returns. Plain checklist first, then the AI's own statement labelled as such, then What changed with per-file review, then collapsed Technical details containing every existing check/event/statistic. No check claim without an actual record. Exact-item passkey client and server policy remain unchanged. Diff review still records the current binding for each file. Merely opening Proof never counts as reviewing every file. Stale records never unlock Accept.

Settings holds theme, sound and Look. Labs links retain the original operational and replay surfaces as secondary tools. Three density variants: Assay (balanced, default), Compact (more tasks visible, squared well), Spacious (larger type, softer neutral pewter, circular well). Each preserves all meanings and actions. The brief explicitly authorizes selecting a default and retaining the other two, overriding variant's usual stop/delete workflow.

## Self-review before building

- Initial thought: floating proof card. Rejected: another SaaS card. Use a full-height native sheet and quiet list instead.
- Initial thought: status pill above each title. Rejected: redundant label/eyebrow. The well and sentence do the work.
- Initial thought: brushed texture gradient. Rejected: banned decorative gradient. Material comes from flat pewter and inset well.
- Initial thought: animated queue. Rejected: no event means no movement; no imaginary progress.
- Taste's marketing imagery, serif, bento and entrance prescriptions conflict with this Operate brief. Use only its subject-specific idea and anti-slop review. No photos, mock activity or decorative assets.
- No Linear appearance. The product method here is to remove choices until the next action is clear. The specifically named Linear-method skill was not found; do not claim it was used.

## Verification

Pure presentation tests cover truthful states, unknown counts, action availability and vocabulary. Browser review covers all requested states at 1440/390 in both themes, all density variants, keyboard/focus, pending confirmation, offline recovery, reduced motion and idle frames. Three screenshot review passes precede completion. Existing security and application tests remain authoritative.


## UI-6 before/after plan

Before: the entire page is pewter, primary/secondary buttons have the same outline, marks are small inside square wells, old drafts duplicate real tasks, and six waiting tasks dominate the page.

After: near-white #FAFBFC / deep-neutral #151719 surfaces; pewter confined to circular mark recesses. Larger 48px original seal silhouettes lead each row. One ink-filled primary action per task/draft; secondary controls stay quiet. Instrument Sans remains the only family; 600-weight titles, 400-weight statuses, 13px metadata, 8px spacing units and 48px group spacing. Secondary text measured against every actual surface at >=4.5:1.

A slim header reports only real working/waiting counts. Main list omits AI-title attribution (retained in Proof), names recorded gaps plainly, and moves numerical budget details into Proof. Copy changes do not alter the underlying Continue confirmation or its fixed allowance.

Deduplication is display-only: an exact same request in the same repository links to the existing task; it never merges/deletes records. Archiving is a reversible browser-local preference; old drafts remain stored and can be restored. No server mutation or authorization for archive/restore. Needs-you initially expands three tasks; the rest remain accessible.

Safety boundary: no checker, Builder, queue, verdict, approval, passkey, stale-binding or sandbox behavior changes. The only server change permitted is the read-only light summary projection needed to display a recorded gap and duplicate-task link without fetching full Proofs.

Generic-default review: rejected white rounded cards, extra shadows, decorative accent backgrounds, animated entrances and floating toolbar chrome. The hallmark remains the one hero; rows are separated by spacing. Existing finite event-bound strike is retained. Hover/press/focus use current Motion/CSS, with reduced motion and zero idle animation. No new app dependencies.

Verification per step: baseline screenshots on real unchanged data; failing focused presentation tests; narrow typecheck/build; MCP screenshots after each visual batch. Three review passes, each at 1440/390 light/dark; keyboard, contrast, overflow, duplicate navigation/archive restore, Proof and unchanged Accept/Touch ID checks. Finish with the complete suite, 67-path native probe, twelve negative controls and credential audit. Local WIP commits only.

Skills: frontend-design sets the plan; Jakub's better-* and make-interfaces-feel-better audit hierarchy/interactions; Emil audits finite purposeful motion; web-design-guidelines audits accessibility. Taste and Impeccable stay quarantined by Jesh's explicit choice.


## UI-7: a recognizable seal at reading size

Before: the open inner curve reads like C, the wordmark dominates, and the input is a textarea beside a button. After: simplify each original seal, make the current workload the greeting, and put one Ask control inside a growing input. Keep the near-white/deep-neutral surfaces and Instrument Sans. Use a 720px reading column, 20px semibold task names, 15px statuses, 13px metadata and 40px controls. A faint amber wash identifies requests needing a decision; a finite green acknowledgement requires a real Accept event.

Generic-default review: no hero marketing copy, dashboard statistics, gradients, floating cards or new icon pack. The distinctive object remains the drawn seal, now tested at 24px and 48px. The greeting is local time plus recorded counts, never AI. Only display metadata is backfilled; original requests, ticket state, checks and approvals stay unchanged.

Verification: after each numbered visual batch capture official Playwright MCP screenshots at 1440px and 390px in light/dark, with viewport scale 1, device scale factor 1 and no CSS zoom. Three critique/refinement passes use the same frozen real snapshot. Test presentation behavior, run the full suite, typecheck/build, 67-path real probe and twelve negative controls. No approval is exercised by screenshots.
