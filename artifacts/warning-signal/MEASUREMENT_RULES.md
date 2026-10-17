# Round A.1 measurement freeze

Source baseline: 9a699cb. Branch codex/warning-signal. User-authorized rerun uses separate ledgers; original Round A STARTED/results files remain immutable.

- Old set: same frozen 11 CORRECT and 8 WRONG cases, in existing recorded order.
- Fresh historical set: same six CORRECT fixes and six planted WRONG half-fixes. Five cases share the clinic-calendar domain. These are previously observed historical cases, not a new independent holdout.
- Execute each set once in this round, old then fresh. The fresh STARTED reservation is one-shot. Do not tune or patch the harness before or after a fresh-case failure. Record blockers and continue.
- Existing writer prompts/model/runtime, 40k allowance, admission, policy and study scoring calculation remain unchanged. Actual policy stays ADVISORY. Study confirmation means counterfactual VERIFIED using the existing scoreV1 with writer advisoryOnly=false; no application verdict or decision is rewritten.
- Red warning means a genuine independent Candidate assertion failure after meaningful BASE assertion failure (all three BASE failures for statistical concurrency). Setup errors, unrun checks and collection errors are not red warnings. Warnings never affect scoring. Retain summary and actual runner failure output, including warning from a mutation retry even if an earlier admitted check is retained.
- Rates use ALL truth-labelled cases as denominator. Also report blocked/no-writer cases so lack of a warning is never mistaken for a successful check.
- Cost: actual reported tokens only; report average across all cases and across started writers. Any missing usage makes that mean unavailable, never guessed.
- Any WRONG case marked VERIFIED stops the measurement as a false accept. No grader assertion, recipe, frozen BASE or Candidate may be changed.
