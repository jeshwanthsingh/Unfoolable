# Round A.1 — red warning signal

Branch: `codex/warning-signal`, from `9a699cb`. Step 3 WIP: `c5419b1`. Step 4 is committed with this report.

## Result

Useful as an additional review alarm on the old cases, but not a dependable general detector: it flagged 75% of old wrong cases and 16.7% of the historical wrong cases, with no red alarms on truth-labelled correct cases. Silence is not evidence of correctness. The writer remains advisory; warnings never change a verdict or Keep availability.

## Old set — 11 correct / 8 wrong

| Metric | Result |
|---|---|
| Correct study-confirmed | 2/11 (18.2%) |
| False accepts | 0/8 |
| Red warnings on WRONG | 6/8 (75.0%) |
| Red warnings on CORRECT | 0/11 |
| Mean writer tokens / case | 13,335.79 |
| Mean tokens / started writer | 14,076.67 (18 writers) |
| Total reported tokens | 253,380 |

Both warning misses were BASE setup failures: R4 unchanged BASE and A2 planted special case. They never reached a valid candidate assertion. R1-correct and R3-correct also had unadmitted writer check errors; other gaps and abstentions are in the case CSV and warning-summary JSON. The approved career-ops scope could not test the tracker intent and launched no writer.

## Historical set — six correct fixes / six wrong half-fixes

| Metric | Result |
|---|---|
| Correct study-confirmed | 1/6 (16.7%) |
| False accepts observed | 0/6 (2 wrong artifacts blocked) |
| Red warnings on WRONG | 1/6 (16.7%) |
| Red warnings on CORRECT | 0/6 |
| Mean writer tokens / artifact | 7,611.92 |
| Mean tokens / started writer | 11,417.88 (8 writers) |
| Total reported tokens | 91,343 |
| Harness-blocked artifacts | 4/12: H4 and H5, both variants |

Only H3-correct was confirmed; H3-wrong raised the red warning. H1, H2 and H6, both variants, abstained because the bounded BASE context omitted necessary component setup, APIs or booking-page source. H4/H5 native reports indicated PASS and certified cleanup, but the wrapper truncation flag caused fail-closed ERROR before writer launch. Those artifacts are blocked, not passing or code failures. No output cap or harness rule was changed; no historical case was rerun.

Five of six tasks share the clinic-calendar domain, so this set is strongly correlated. These are the existing historical cases, not a newly independent holdout. All denominator cases are retained; low warning rates partly reflect missing executable checks and blocked artifacts.

## Method and safety

Study confirmation is the existing counterfactual scoreV1 calculation with admitted writer advisoryOnly=false. The real application stays ADVISORY, and actual outcomes/decisions were not rewritten. Prompts, model/runtime, admission and scoring are unchanged. No source/context/harness tuning occurred between or after measurements. Each case ran once in the separately reserved round. Original Round A ledgers, BASEs, Candidates and graders were preserved.

Ownership-helper diagnostics appeared during H1-wrong and H6-correct. Both cases completed without intervention; the diagnostics remain in fresh-run.log. No ownership requirement was skipped and no unidentified process was signalled.

The warning is a visible red role=alert above Keep on ticket and current chat review cards. It shows the existing assertion summary plus expandable native failure output, never AI-written new review prose. Setup/collection errors are not red alarms. Stale cards do not borrow warnings from current evidence.

## Verification

- Full frozen suite: 873/873, 0 failures/skips, 315.03 seconds.
- Focused warning/authoring/chat tests: 42/42.
- Typecheck and production build: PASS.
- Twelve negative controls: 5 FAIL, 7 INCONCLUSIVE, 0 PASS.
- Real 65-path Builder probe: no protected path readable; owned Git status/diff/log, SQLite/temp and file writes pass. Tripwire and Watchman regressions pass in the full suite.
- Actual review component inspected at 1440px and 390px; warning precedes Keep with no horizontal overflow.
- No new dependencies, paid APIs, source-repository changes, real human decisions, push, merge or deployment.

Raw provider/test inputs stay in protected study data. Committed results, CSVs and summaries contain the audit metrics; per-case view snapshots remain local.
