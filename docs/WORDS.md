# Words

Unfoolable. AI does the work. Nothing fools the check.

The main screen says what happened and what you can do. Status lines contain at most 12 words. Counts come from recorded results; unknown counts are never invented. User-authored titles and requests remain unchanged; the vocabulary restriction applies to our labels and status sentences, not quotations of the user.

| Situation | Words |
|---|---|
| Empty | Nothing here yet. What should we work on? |
| Working | Working on it for 2 minutes |
| Checking | Checking the change before you decide. |
| Checked with recorded count | Checked. All 172 old tests still pass. |
| Checked without a recorded count | Checked. The recorded tests passed. |
| Gaps | Done, but one part couldn't be checked. |
| Changed old test | Something's wrong: a test was quietly changed. |
| Other failed check | Something's wrong: a check failed. Look at the changes. |
| Stuck | Stuck. Try again or reject it. |
| Needs you | Needs your OK before continuing. |
| Waiting | Waiting to start. |
| Accepted / rejected | Accepted / Rejected |
| Stopped | Stopped. Try again when you're ready. |
| Offline | Can't connect. Start Unfoolable, then try again. |
| Unchecked | This change hasn't been checked yet. |

Working time is measured from the latest recorded start; it freezes when work stops. A summary counts current task states and states its time window. It never guesses what happened while the page was closed.

Buttons keep their names: Ask, Start, Edit, Cancel, Accept, Reject, Look at the changes, Try again, See the proof. Completed actions acknowledge Accepted or Rejected only after the server confirms. Typing never accepts or rejects work. Touch ID still confirms the exact item.

Proof contains: what passed, what failed, what wasn't checked; What the AI says it did (explicitly labelled as written by the AI); What changed; collapsed Technical details. Technical details retain exact hashes, check records, process history and original error text. Main-screen errors explain recovery without apologies or raw technical messages.

No technical system vocabulary on the main screen: candidate, BASE, playbook, verdict, harness, mutation, tripwire, Watchman, worktree, admission, gate, evidence. No uppercase labels, middle-dot metadata separators or arrow-suffixed buttons. Technical terms are allowed in collapsed Technical details.

The screenshot-only comprehension test found two ambiguities: pending tasks may be below the fold, and Accepted does not mean merged. Summary now explicitly says “waiting across all tasks”; accepted work says “Saved separately; not merged into your project.”
