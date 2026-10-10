# Step2 — bounded identity recording

The entire helper invocation now shares a one-second recording budget (the existing caller limit remains three seconds). It retries complete kernel identity; it returns absence only after ESRCH. Persistent live/permission uncertainty still throws. The same policy applies to one-PID lookups and tree inventories. No PID-only ownership or signal fallback was added.

Fresh kernel parent/group/session membership is revalidated after retries so an unrelated reused PID cannot be accepted from the earlier ps inventory. Existing PID+birth+executable+group/session comparisons and signal checks remain unchanged. Model, Codex version, sandbox profiles, network and Builder deadlines remain unchanged.

The exact chat-path regression now reaches ready_for_review, retains real PID+start-time records, and leaves source untouched. Startup/supervisor tests19/19 pass. Evidence: `.work/foreman-fix/startup-green.txt`.
