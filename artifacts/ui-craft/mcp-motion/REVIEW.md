# UI-2 motion and MCP addendum

## Tools and rules

Added project-authored simplicity, surgical-change and verification rules to `AGENTS.md`, plus the six-view MCP review requirement. No copied or endorsed Karpathy skill is claimed.

Installed Emil animate, review-animations and animation-performance skills from `emilkowalski/skills` at commit `2d228630ba1446365f614a108cb8252f1feda202` (MIT). Installed files retain the license. Versions and skill hashes are in `tools.json`.

Microsoft `@playwright/mcp` 0.0.83 is **Apache-2.0**, not MIT. MCP SDK 1.32.1 is MIT. Both are development-only tools in ignored `.work/ui-craft/mcp-tools`; application dependencies and lockfile are unchanged. Real MCP stdio handshake, advertised tool schemas and call responses are preserved. The browser is isolated and sandboxed, without personal Chrome, extension access or a public listener. Only browser DOM evaluation and native MCP browser tools were used; the advertised unsafe Node tool was not invoked.

## Review loop

1. `before/`: six MCP screenshots, all visually inspected.
2. Motion refinement: replace the original 600ms linear Pixi movement and separate animation timings with a shared 250ms, zero-bounce Motion spring. Glass uses a full transform string; Pixi and Three use the installed Motion generator. Capture and inspect `after/` at 1440px and 390px for A/B/C.
3. Native MCP reduced-motion emulation exposed a real bug: Motion 14.3.0's hook only snapshots the preference on mount. Preserve the failing protocol in `reduced-motion-regression/`. Add a small reactive native media subscription, keeping the same browser assertion. Capture and inspect all six `after-reduced-motion-fix/` screenshots; rerun the unchanged behavioral proof successfully.

At rest, the composition is deliberately unchanged by this addendum. Instrument retains the mechanical hero; Glass retains the single layered sheet; Night retains the wide-screen diorama and phone Vault fallback. No horizontal root overflow was observed at either width. Small dial labels on phones remain secondary; the readable verdict and detailed evidence are available outside the dial. Long requests remain accessible through disclosure. No winner selected.

## Motion review

| Element | Purpose | Implementation |
|---|---|---|
| Station travel | Follow a real recorded state transition | Existing Motion generator, 250ms zero bounce; stop rendering at rest |
| Vault/locks | Reflect evidence or recorded station change | 250ms zero-bounce spring; reduced-motion snaps positional movement |
| Glass sheet | Retain depth relationship to recorded station | Full transform string, same spring |
| Frequent navigation | Direct control | Instant; no decorative entry/exit animation |
| Lock click | Acknowledge a newly passing evidence group | Existing opt-in 60ms Web Audio click; muted by default |

Native MCP checks confirm replay starts, motion settles, idle frame callbacks stop, dynamic reduced motion produces no running animation, exactly one oscillator is scheduled for the tested passing-lock transition after opting in, and the original Workshop settles after replay. Audio scheduling was verified; subjective sound quality was not certified. Desktop viewport emulation is not proof of physical-phone GPU performance.

The initial MCP startup hit macOS's Unix socket path-length limit. Shortening only its ignored socket directory to `.work/s` fixed setup; browser sandbox settings were unchanged.

## Safety and scope

No server, checker, Builder, passkey or decision-policy code changed. Historical replay still cannot Keep or Discard. No new paid API or billing was enabled. Original UI and all three directions remain available. Native controls and the real 65-path Builder probe were rerun; results are stored alongside this report. The pre-fix failing browser evidence remains visible rather than being relabelled as passing.

## Review outcome

Scoped code review: accept. No blocker found in the diff; no server, shared policy, package manifest or lockfile change. Four new focused tests cover finite nonlinear travel, timing, retargeting and reactive reduced-motion subscription. The dynamic browser test preserves the previously failing assertion. The original Three.js upstream clock warning and production chunk-size warning remain; neither was hidden or addressed with unrelated dependency changes.

## Final validation

- Full suite: **935/935 passed**, 0 failed, 0 skipped; 340.516 seconds outside the sandbox, using Node 24.21.0 (`full-suite.json`, `full-suite.log`).
- Focused motion/event tests: **20/20 passed** (`focused-tests.log`).
- Strict TypeScript and production build passed (`build.log`); standalone typecheck also passed.
- Actual MCP: 18 screenshots across before, motion refinement and reduced-motion fix; all six per batch visually inspected. All 36 behavioral proof calls completed without an MCP error.
- Real Builder probe: 65/65 protected targets unreadable in both native probe reports; owned git status/diff/log, SQLite temp and writes worked (`after-probe.json`).
- Twelve protected negative controls: 5 FAIL, 7 INCONCLUSIVE, **0 PASS** (`negative-controls.json`).
- Owned read-only browser fixture stopped with certified PID/birth identity cleanup; live CC on 3225 untouched (`fixture-cleanup.json`).

One intervening full run under observed high host load failed: 900 passed / 35 failed, 1042.47 seconds (`loaded-full-suite.log/json`, `host-load.json`). Failures included fixture deadlines, Python spawn timeouts and uncertified cleanup. Two representative failed tests passed unchanged in isolation (2/2 in 4.6 seconds, `isolated-regression-check.log`); the final unchanged full run then passed. This is consistent with environmental timing pressure, but is not a proven root cause for every one of the 35 failures. No assertion, timeout or protected-policy code was changed. Both runs are retained.
