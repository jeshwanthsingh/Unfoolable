# Reliability

## Process ownership
BUG-1 stderr raised `Recorded process no longer belongs to the owned tree` in the final ancestry validation in build-process-info.py. The helper takes a ps census, then reads each kernel identity; these are not atomic. An intermediate parent can disappear before its already-exiting child is recorded. The old code rejected even a child subsequently proven dead. BUG-1 did not retain the offending ancestry row, so its exact PID/reparent timing cannot be reconstructed. The regression reproduces that exact failing branch deterministically.

The fix never promotes the uncertified child to owned. It omits it only after explicit ESRCH or a kernel zombie with the identical birth identity; a live, unreadable or reused identity still fails closed within the existing one-second deadline. Root recording and pre-signal PID + birth + executable + group + session checks are unchanged.

Before: regression fails with the BUG-1 error. After: all 15 ownership/native gate tests pass. Chat-server stress: 100/100 sessions, 50 immediate retries, all 50 resulting tickets ready for review, every process has a kernel birth record, cleanup certified. No real ticket ran. Raw logs remain in .work/night1.

## Explicit gate configuration change
Pyright’s generated configuration lives in protected scratch storage. Without an execution environment, that scratch location becomes its import root, so new `tests/test_first.py` cannot import exported root-level `bugs.py`. Native unittest can import it; this was a false gate finding.

Set the execution environment root and extraPaths to the frozen export root. Add the export’s src directory only when it exists in BASE. The existing basic type policy stays enabled; Candidate configuration cannot disable it. A new duplicate reproduction test now passes with no missing-import diagnostic; a planted `value: int = "wrong"` in the same test produces FAIL. This intentionally corrects future gate configuration, never stored verdicts or frozen facts.
