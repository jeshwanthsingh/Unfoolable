# Budget measurement and policy

Read-only live ticket event sample, latest Retry window per ticket, deduplicated cumulative usage by attempt, excluding Test Writer IDs. Only two tickets reported usable Builder usage: 80224 and 94070. Median 87147; nearest-rank p90 94070. Small sample, not a stable population estimate. Writer totals were 12554 and 13313.

New tickets: Builder 120000 (p90 × 1.25 = 117587.5, rounded up to 10000), Test Writer independently 40000. Previously both were summed against 100000. Existing recorded limits are retained; no silent retroactive increase. Unknown reported usage remains unknown. Existing writer session hard cap stays 40000.

Continue: Touch ID bound to exact current ticket/evidence, once per ticket. Explicit fixed increment: +50000 Builder tokens, +20000 aggregate Writer tokens, +40 commands, +5 minutes. Spent usage is retained for Continue and rechecks. A frozen Candidate is only rechecked; never rebuilt by Continue. Without a frozen Candidate, cleanup is verified before a fresh Builder attempt. Keep/Accept always remains a separate explicit decision.

Active minutes are cumulative across Continue/rechecks, using real recorded active-state intervals; time waiting for a human is excluded. Continue starts only the remaining allowance, rather than resetting the full timer.
