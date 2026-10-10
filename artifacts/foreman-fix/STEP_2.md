# Step2 — bounded identity recording

The entire helper invocation now shares a one-second recording budget (the existing caller limit remains three seconds). It retries complete kernel identity; it returns absence only after ESRCH. Persistent live/permission uncertainty still throws. One-PID lookups and the directly launched worker root use a50ms retry cap: a synchronous call cannot block the coordinator from reaping its own exited child. Descendants share the one-second budget. Missing live identity remains an error in every case. No PID-only ownership or signal fallback was added.

Fresh kernel parent/group/session membership is revalidated after retries so an unrelated reused PID cannot be accepted from the earlier ps inventory. Existing PID+birth+executable+group/session comparisons and signal checks remain unchanged. Model, Codex version, sandbox profiles, network and Builder deadlines remain unchanged.

The exact chat-path regression now reaches ready_for_review, retains real PID+start-time records, and leaves source untouched. Startup/supervisor tests19/19 pass. Evidence: `.work/foreman-fix/startup-green.txt`.

Final regression refinement: the original one-second root wait made two unchanged correction fixtures exceed their settling bound, even in isolation. The50ms root cap restored both without changing any test deadline or assertion. The chat-path regression and safety tests10/10 pass; both correction cases2/2 pass. The legacy mock now returns PID+birth+parent/group/session/executable, not a PID alone.
