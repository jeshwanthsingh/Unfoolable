# Observatory design system

## Plan before visuals

Subject: a personal protected checker. The room is the single hero; below it, quiet task rows lead to one Wallet-like proof pass. Follow Jesh’s supplied HTML structure, replacing its simulated events, art, checks and acceptance with real assets and recorded state. The original OBS-0 prototype stays in docs/mockups/observatory. OBS-1 and OBS-2 adopt these tokens in the working app; the live room strip is presentation-only.

Desktop: slim header / full-width room strip / journey and last four real events / greeting and Ask beside selected Proof. Phone: same hierarchy with a compact three-zone room, readable journey, task list, and an accessible swipe-dismissable proof sheet.

## Tokens

| Role | Light | Dark |
|---|---|---|
| Background | #F7F8FA | #181C20 |
| Surface | #FFFFFF | #242A30 |
| Text | #242A30 | #EDF1F5 |
| Secondary text | #565F69 | #B5BEC8 |
| Structural border | #D5DBE1 | #4B555F |
| Focus / current | #315F99 | #9EC6FF |
| Checked | #246B49 | #81D5A8 |
| Attention | #85530B | #E8BC73 |
| Wrong / stop | #AC352D | #F7A49B |

Use existing local Instrument Sans (OFL-1.1), no remote font request. Scale 13 / 15 / 17 / 20 / 30px; 1.45–1.6 line height; tabular figures for counts. Spacing 4 / 8 / 12 / 16 / 24 / 32. Radius 10 controls, 16 task rows, 22 Proof. Maximum width 1240px; 44px touch targets, visible focus.

## Verdict colors and shapes

Reuse the existing Hallmark SVG: tick seal, magnifier seal, notched warning, progress ring, pause, question, accepted and rejected. Labels accompany color. A completed check is not acceptance. Gaps stay amber. Never show the global 12-cheat self-test as task proof.

## Motion

Motion springs, duration .24s, bounce 0, for user-opened card/pass continuity. Recorded work queue: >=350ms per readable beat, deduplicated event sequences; bursts preserve exact counts. No spinner, made-up test increments, decorative work, or infinite replay. Fuel uses transform scale, not layout width. Four optional synthesized feedback sounds off by default; only source-bound real events in an explicitly started replay can make a sound. Hidden document pauses replay/rendering. Reduced motion snaps movement and retains labels. Hover and keyboard focus share object/fact highlighting.

## Detail and decision rules

Simple facts outside; existing exact check details and diff one step deeper. Proof uses the current FileDiff/Shiki component. The historical mockup has disabled decision controls. The working app delegates file views to the unchanged original inspector and decisions to the unchanged exact-item passkey handlers; no local room, replay or highlight boolean may unlock Accept. Desktop summary is non-modal so room/fact exploration works both ways; the actual file inspector and confirmation remain modal. Opening live Proof exits room replay.

## Self-review before building

- Rejected: cream wash and identical shadowed dashboard cards. Use near-white, a single art strip, and quiet rows.
- Rejected: the reference's forever spinner, fake test counters and claimed secure-chip seal. Derive every animation and label from recorded events; unknown remains explicit.
- Rejected: four crowded room labels at phone scale. Keep labels in a small two-column rail on phone, with tap/focus linking to the room.
- Preserve: original pixel art, compositional room-to-proof connection, one calm input, restrained mark colors.
- Banned: purple gradients, sparkles, fake progress, raw terminal dumps, copied assets, hidden alternate approval paths. Frosted treatment is reserved for the offline room veil only.
