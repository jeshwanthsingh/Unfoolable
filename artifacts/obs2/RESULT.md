# OBS-2 result

Implemented locally on `codex/observatory-room`, based on `d3c5d56`. No merge, push, production restart or deployment. No ticket created and no human decision taken.

The real main list now has a collapsible pixel room, phone active-room framing, four sourced pins, twelve explorable objects, linked Proof highlights, XState journey, and a plain recorded-event list. The unchanged single SSE stream drives refresh; there is no polling. New read bursts merge with exact distinct-file counts and at least 350ms beats. Initial saved history snaps to the current state. Alarms and STOP bypass old queued work.

Replay uses a frozen real ticket log. Every scrub position recomputes the exact stored event prefix, including fuel and stage visitation. Replay never feeds decision eligibility. Opening Proof returns the room to live. Offline/hidden freezes rendering and playback; reduced motion uses still pictures. Lighting uses browser local time; replay uses recorded time in the browser timezone. Decorative finite blinking is allowed only idle and visible.

## Evidence

See [screenshots and video](INDEX.md), [three review passes](REVIEW.md), [event map](../../docs/OBS_2_EVENT_MAP.md), and [exact validation](validation.json).

- Full suite: **1,223 passed, 0 failed, 0 skipped**, 324.426 seconds. Source `9acf2d3`; the later diagnostic-only reset `348a964` passed 24 focused tests, typecheck, production build and the final browser audit.
- Build: passed, all 9 Workshop images present. No dependencies added.
- Safety freeze: **281 implementation files plus 2 manifests unchanged**, four exact decision callbacks unchanged. Grader, core, scoring, permissions, sealing and authentication were untouched.
- Golden comparison: **61 comparisons, zero differences**. Four historical events still lack original facts; no stored records/golden labels changed.
- Real protected probe: **74 paths denied, 8 endpoints denied, signer denied**; own git status/diff/log, SQLite temp/write and worktree writes passed.
- All **12 negative controls non-PASS**. No stop-rule violation.
- Browser: **0 idle requests in 16.5 seconds**, approximately **59.9 fps** active RAF cadence; **0 hidden/offline frames**, **0 reduced-motion animation frames**. Exact forward/backward seeks, four pins, Alt labels, collapse, reconnection and bidirectional highlights passed. Zero decision requests.
- Credential scan: no leaks in the changed source and curated textual evidence.

The 20-second video is an unsped excerpt of the retained 25.76-second recording, captured at 25fps. It shows a real past ticket replay and backward/forward scrubbing. Renderer timing is measured separately.

## Known limits

Physical iPhone/Safari background behavior and manual VoiceOver were not tested. Browser visibility was exercised by a controlled visibility-change test. Missing fuel, individual test identities and absent Test Writer progress remain unknown or omitted. The 74-path count is a dated system probe, not a secret count or continuous per-task proof. No new display/backend events were needed. Published screenshots use an isolated read-only copy of real data; the running production app was not replaced.
