# Night Shift

Open Unfoolable with `unfool` or `./cc chat`. In Settings, choose Night Shift’s start, morning cutoff and shared token allowance. Default: 1–7 AM, 300,000 tokens. The Mac must stay plugged in.

For each draft, choose **Do tonight** and confirm that exact request with Touch ID. Each confirmation is separate. It binds the request, repository revision, approved test instructions, normal task budgets and morning cutoff. The two-minute passkey response is consumed now; a narrow one-use Start authorization lasts only until the chosen cutoff. Changing the draft or its checks invalidates it.

The Tonight list shows approved work. Drafts are not queued merely because they exist. The three NIGHT-1 drafts were prepared without queueing or starting them.

Tasks run one at a time in the normal protected workflow. Checks and the bounded correction loop are unchanged. There is no automatic Accept. Results stay for your review.

AC loss, cutoff, sleep/pause, STOP ALL, a tripwire, exhausted allowance or uncertain cleanup stops the shift. Restarted mid-work tasks become interrupted; Retry needs fresh Touch ID. A stopped shift does not restart itself. A new schedule/consent is needed for remaining drafts. Only account rate limits receive bounded automatic backoff; those retries preserve the original allowance.

A morning report lists results, actual start/end times and reported tokens. Notifications on this Mac are optional and off by default. Workshop’s **Replay last night** plays the recorded tickets in order.

Limits: this round proves the scheduler with isolated data; the first real overnight run still awaits your individual approvals. Physical unplug/sleep/power-loss behavior was simulated, not performed on your active Mac. A gap over 15 seconds is treated conservatively as interruption, including a long coordinator pause. Cutoff/power monitoring runs once per second; kernel cleanup takes additional time and is recorded. Reported token totals can arrive in provider updates, so reservations and per-task limits supplement the total stop. Historical BUG-1 stderr identifies the failing ancestry check, but did not save the offending PID/parent row. Native notification delivery still depends on macOS notification permissions.

If the Night supervisor itself cannot start safely, it stops once rather than looping. Inspect its recorded reason, restart the coordinator, then confirm a fresh queue entry. It does not silently reuse a stopped consent.
