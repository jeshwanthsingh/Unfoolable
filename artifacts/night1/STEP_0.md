# Reliability

## Process ownership
BUG-1 stderr raised `Recorded process no longer belongs to the owned tree` in the final ancestry validation in build-process-info.py. The helper takes a ps census, then reads each kernel identity; these are not atomic. An intermediate parent can disappear before its already-exiting child is recorded. The old code rejected even a child subsequently proven dead. BUG-1 did not retain the offending ancestry row, so its exact PID/reparent timing cannot be reconstructed. The regression reproduces that exact failing branch deterministically.

The fix never promotes the uncertified child to owned. It omits it only after explicit ESRCH or a kernel zombie with the identical birth identity; a live, unreadable or reused identity still fails closed within the existing one-second deadline. Root recording and pre-signal PID + birth + executable + group + session checks are unchanged.

Before: regression fails with the BUG-1 error. After: all 15 ownership/native gate tests pass. Chat-server stress: 100/100 sessions, 50 immediate retries, all 50 resulting tickets ready for review, every process has a kernel birth record, cleanup certified. No real ticket ran. Raw logs remain in .work/night1.

## Explicit gate configuration change
Pyright’s generated configuration lives in protected scratch storage. Without an execution environment, that scratch location becomes its import root, so new `tests/test_first.py` cannot import exported root-level `bugs.py`. Native unittest can import it; this was a false gate finding.

Set the execution environment root and extraPaths to the frozen export root. Add the export’s src directory only when it exists in BASE. The existing basic type policy stays enabled; Candidate configuration cannot disable it. A new duplicate reproduction test now passes with no missing-import diagnostic; a planted `value: int = "wrong"` in the same test produces FAIL. This intentionally corrects future gate configuration, never stored verdicts or frozen facts.

### Final strict regression review

The first full-suite pass exposed an over-broad exit-clear branch: it omitted an unrelated changed-parent record after ESRCH. No process was promoted or signalled, but this violated the old strict PID-reuse regression. The final fix clears only reparenting to PID 1 after the original ps parent is proved dead, then requires child ESRCH or same-birth zombie proof. Other parent/session changes still fail immediately. Every original process-recording test remains intact. A fresh 100-start chat-path stress run on this stricter helper passed; its final hash is in ownership-stress.json.

Future ownership failures now retain the fixed kernel helper’s sanitized diagnostic in protected ticket events (`ownership_recording_failed`) instead of discarding it behind the generic card message. The old BUG-1 record cannot be retroactively reconstructed.

A full-suite Watchman failure also exposed buffered lifecycle callbacks continuing after stop won. A new same-chunk regression reproduced 12 callbacks after the first rejection. Lifecycle callbacks are now fenced after failure; bounded raw protocol logs, permission denials and cleanup RPCs remain available. The eleven-action threshold and old assertions are unchanged.
