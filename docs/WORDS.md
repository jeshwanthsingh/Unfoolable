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
| Gaps (example) | Done. The README change wasn’t independently checked. |
| Changed old test | Something's wrong: a test was quietly changed. |
| Other failed check | Something's wrong: a check failed. Look at the changes. |
| Stuck | Stuck. Try again or reject it. |
| Needs you | Needs your OK before continuing. |
| Waiting | Waiting to start. |
| Accepted / rejected | Accepted / Rejected |
| Stopped | Stopped. No change was accepted. |
| Allowance exhausted | Ran out of time. |
| Offline | Can't connect. Start Unfoolable, then try again. |
| Unchecked | This change hasn't been checked yet. |

Working time is measured from the latest recorded start; it freezes when work stops. A summary counts current task states and states its time window. It never guesses what happened while the page was closed.

Buttons keep their names: Ask, Start, Edit, Cancel, Accept, Reject, Look at the changes, Try again, Give it more time, See the proof. Completed actions acknowledge Accepted or Rejected only after the server confirms. Typing never accepts or rejects work. Touch ID still confirms the exact item.

Proof contains: what passed, what failed, what wasn't checked; What the AI says it did (explicitly labelled as written by the AI); What changed; collapsed Technical details. Technical details retain exact hashes, check records, process history and original error text. Main-screen errors explain recovery without apologies or raw technical messages.

No technical system vocabulary on the main screen: candidate, BASE, playbook, verdict, harness, mutation, tripwire, Watchman, worktree, admission, gate, evidence. No uppercase labels, middle-dot metadata separators or arrow-suffixed buttons. Technical terms are allowed in collapsed Technical details.

The screenshot-only comprehension test found two ambiguities: pending tasks may be below the fold, and Accepted does not mean merged. UI-6 shows the real working/waiting count in the slim header, previews three waiting tasks, and leaves the rest behind “more waiting”. Accepted work says “Saved as a separate copy. Your main code is unchanged.”

UI-6 removes AI-title attribution from the list, retaining it in Proof. Gaps name the recorded omission; unknown details are not invented. Give it more time invokes the existing exact-item Continue action and Touch ID. The main note says “Uses a bit more of your Codex allowance. Needs Touch ID.” Exact amounts remain in Proof. Archive/restore only changes a browser-local display preference; it never cancels or deletes a request.

## UI-7 greeting and composer

Local time supplies “Good morning.” / “Good afternoon.” / “Good evening.” Counts come from stored ticket and draft states; queued work is explicitly waiting to start. No AI writes the greeting. Composer placeholder: “Describe a change...” with Ask inside the field. Existing tickets keep their exact original request and title; appended display titles are at most eight words and labelled AI-written in Proof.
