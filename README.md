# Unfoolable

**AI does the work. Nothing fools the check.**

Unfoolable is a personal, local Mac app. Describe a code change, review the proposed task, and let Codex work in a separate copy. Protected checks report what passed and what could not be checked. You decide whether to Accept or Reject. Accept saves a separate local branch; it never merges or pushes.

![Unfoolable showing tasks and their check results](docs/images/unfoolable.png)

*UI-4 replay of recorded local tasks, not a claim about current live counts.*

## Start

```sh
unfool
```

This starts the coordinator, screen and live updates, then opens your private browser page. `./cc chat` is the repository-local equivalent. First setup needs Node 24, `npm ci`, and the existing ChatGPT/Codex login. No new paid API is required. Decisions use your registered Touch ID passkey.

## What the measurements say

| Measurement | Observed result |
| --- | --- |
| Planted cheats kept from passing | **12/12**: 5 failed, 7 inconclusive |
| False accepts on the eight-wrong-change scoring set | **0/8** |
| Correct changes confirmed by the earlier native Test Writer | **4/11** |
| Latest bounded-context confirmation study | **2/11 (18.2%)** |
| Six historical correct fixes confirmed | **1/6 (16.7%)** |

These are small local studies. Zero false accepts includes abstentions; it does not mean every defect was detected. The historical tasks are correlated, and four historical artifacts were blocked by the harness. The Test Writer missed its promotion bar and remains **advisory only**. [Measured results and limits](artifacts/warning-signal/RESULT.md), [earlier native-test study](artifacts/test-writer-v2/RESULT.md).

## Safety in six points

- The Builder uses an isolated copy, cannot read protected checks or private folders, and has no outside network.
- The checker restores the original tests before checking the frozen change. Edited tests cannot quietly replace them; zero tests never pass.
- Reusable project checks need approval. A regression check applies only if it passes on that change's starting version.
- The independent Test Writer sees original code, not the proposed change. Its warnings cannot erase a failing protected check.
- Accept needs a fresh Touch ID confirmation tied to the exact change. Flagged work requires looking at every changed file; stale buttons are rejected.
- Work and decisions are recorded as events. Fixes are bounded, restart interrupts unfinished work, and Stop all needs no approval.

## Known limits

Passing existing tests does not prove new behavior. “Done, but one part couldn't be checked” is a gap, not a clean bill of health. Native tests share a process with the code they test; deliberate in-memory or observation-channel forgery remains a risk. Tripwire alarms are best effort. Old failed drafts can clutter the screen, and there has been no full manual screen-reader audit.

Backups are local and same-disk, not disaster protection. [Backup and restore](docs/BACKUPS.md). The repository is still named `command-center`. Older orchestration screens are experimental. [Handoff](HANDOFF.md) explains operation, tests and open work; [DESIGN.md](DESIGN.md) is a factual outline for the owner to expand.
