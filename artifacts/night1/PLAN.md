# NIGHT-1 plan

Base: d1ea19f. Local branch codex/night-1; no merge/push/deploy.

0. Reliability: failing exit-race and Pyright-import regressions; strict death proof only; 100 chat-server starts including retries.
1. Queue: persist individually passkey-authorized draft bindings and immutable expiry; reject changed bindings and repeated dispatch.
2. Shift: serial existing ticket loop; AC/window/aggregate budget/backoff/STOP/tripwire/restart/sleep guards; owned caffeinate only during shift.
3. Review only: existing checker and seals, no Keep authority.
4. Morning: event-derived report and optional local notification.
5. Workshop: actual shift sign, night lighting, last-night replay.
6. Deterministic isolated simulations exercise stop/recovery edges.
7. Three real drafts remain unqueued; user confirms separately.
8. Full suite, protected paths, controls, frozen golden comparison; update invariants/design facts.

No changes to scoring, sandbox, Builder model or runtime. Night authorization is a narrow, single-use delayed-Start capability; it grants no Keep/Retry/permission authority.
