# Observatory mockups

All captures use real current task data or an explicitly labelled historical event prefix. Missing historical states remain empty; they are not fabricated demonstrations.

| State | Desktop light | Desktop dark | Phone light | Phone dark |
|---|---|---|---|---|
| Idle | [1440 light](idle-1440-light.png) | [1440 dark](idle-1440-dark.png) | [390 light](idle-390-light.png) | [390 dark](idle-390-dark.png) |
| Recorded working | [1440 light](working-1440-light.png) | [1440 dark](working-1440-dark.png) | [390 light](working-390-light.png) | [390 dark](working-390-dark.png) |
| Needs you | [1440 light](needs-you-1440-light.png) | [1440 dark](needs-you-1440-dark.png) | [390 light](needs-you-390-light.png) | [390 dark](needs-you-390-dark.png) |
| No recorded failed check | [1440 light](wrong-1440-light.png) | [1440 dark](wrong-1440-dark.png) | [390 light](wrong-390-light.png) | [390 dark](wrong-390-dark.png) |
| No recorded read alarm | [1440 light](tripwire-1440-light.png) | [1440 dark](tripwire-1440-dark.png) | [390 light](tripwire-390-light.png) | [390 dark](tripwire-390-dark.png) |
| No Night Shift report | [1440 light](night-morning-1440-light.png) | [1440 dark](night-morning-1440-dark.png) | [390 light](night-morning-390-light.png) | [390 dark](night-morning-390-dark.png) |
| Actual browser offline | [1440 light](offline-1440-light.png) | [1440 dark](offline-1440-dark.png) | [390 light](offline-390-light.png) | [390 dark](offline-390-dark.png) |

Phone Proof: [light](proof-390-light.png), [dark](proof-390-dark.png).

[20-second real replay](replay-20s.webm). [Event map](../../docs/OBS_0_EVENT_MAP.md). [Design system](../../docs/DESIGN_SYSTEM.md). [Review notes](visual-review.md). [Dependency inventory](DEPENDENCIES.md).

The working application on 3225 is unchanged. The isolated local preview is on 3260; use `node docs/mockups/observatory/open.mjs` from the repository to connect the private screen. No decision capability is written into committed artifacts.

Actual patch view: [Highlighted proof diff](proof-diff-1440-light.png). Accept remains disabled in this preview.
