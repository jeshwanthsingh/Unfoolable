# Foreman startup fix — PASS

Branch `codex/foreman-fix`, based on `c7cb66d`. One numbered WIP commit per step, followed by focused reaper/test scheduling fixes and final evidence. Local only; no push, merge or deploy.

## Cause

CLI and chat both launch the same server-side queue and pinned Builder; the chat draft does not wrap the Builder with a different sandbox. A short-lived child can exit before macOS exposes a usable identity, while `kill(pid,0)` still reports its unreaped PID as present. The recorder’s45ms retry window ended before the parent reaped it. The exact HTTP chat-start regression reproduced the original harness_error. Ten real kernel probes and historical parent records are retained. Historical full environment equality is not claimed because no environment dump was retained.

## Fix

Complete kernel identity recording retries briefly. Descendants share a one-second budget; direct root/one-PID checks have a50ms cap so synchronous calls do not hold Node’s own reaper. Only full PID+birth records or ESRCH-confirmed absence are accepted. Fresh kernel parent/group/session membership prevents acceptance of an unrelated reused PID. Unknown live/permission state still fails closed; signaling remains guarded by immediate PID+birth/executable/group/session comparison. No model, provider version, sandbox, network or production deadline changed.

Harness cards show one plain failure sentence and an exact-item Retry button. Typed Retry performs no action. Stale/double buttons reject; shared Retry/decision locks and post-cleanup state validation prevent racing retries or revival of a discarded ticket. SQLite17 preserves old card decisions while allowing a typed Retry resolution.

## Tests

`npm test`: **750/750**, no failures/skips/cancellations, **233.509s**. The suite uses four workers to avoid oversubscribing process-heavy fixtures. Assertions and original test deadlines are unchanged. An old mock was updated to return the newly required complete identity rather than PID alone. Typecheck and production build pass. All12 unchanged negative controls remain non-PASS.

The first unrestricted full run exposed the incomplete mock and two correction fixture settling timeouts. Isolated checks revealed that a long root wait delayed the coordinator’s own child reaping; the short root cap corrected that. Both correction cases pass unchanged. Limiting suite workers then gave the full green run; earlier failed logs remain under `.work/foreman-fix/`.

## Real ticket

Clicked **Retry** for `e56f790f-beb4-4c80-8bee-88bd26aa75eb` through Jarvis in an isolated browser. It reached **ready_for_review / PASSED WITH GAPS**, on attempt4; previous three failed starts remain archived. Builder work64.551s, zero corrections, Candidate `cb8a026cb203d664e42f7565ac7863456e7fc8bb`.21 PID+birth identities were recorded and cleanup verified.

After the final recorder refinement, old checker evidence correctly became stale. Used the exact **Recheck** button on the same Candidate; no Builder or new Candidate ran. Fresh protected evidence now passes, `keepAvailable=true`, `evidenceStale=false`.

The disclosed gaps remain: regression checks do not independently prove the new --version intent, and no advisory task oracle was requested. No claim of independently verified new behavior is made. Source HEAD, binary diff hash and status are unchanged. Keep/Discard remain yours.

## Use / evidence

```sh
cd /Users/jeshwanthsingh/Projects/ai-lab/command-center
./cc chat
```

Server running on http://127.0.0.1:3225. Evidence: STEP_1.md, STEP_2.md, STEP_5.md, final-ticket.json, verification.json, negative-controls.json, code-review.md, Retry/ready-card screenshots. No dependencies or paid API billing added. Temporary files remain under `.work/foreman-fix/`.
