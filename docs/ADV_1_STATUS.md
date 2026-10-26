# ADV-1 recovery status

Audit date: 2026-10-24. No completed ADV-1 report or separate admitted ADV-1 control pack was found in the saved repository history. Recovery does not retroactively mark unfinished work complete.

| Item | Status | Evidence and remaining work |
| --- | --- | --- |
| Threat model | DONE | [Threat model](THREAT_MODEL.md) merges the recovered draft with SCION-1 boundaries; trusted host, untrusted Builder, grading-time risks and limits are explicit. |
| Grading-time probe | PARTIAL | [Two Python lanes passed](../artifacts/recover-docs/grading-probe.json), 87 checks each: 76 denied, nine absent, two permitted. Browser/Vitest lane not measured; absent targets not exercised. |
| Negative-control coverage map + new controls | PARTIAL | [Map](NEGATIVE_CONTROLS.md) covers all existing 12: five FAIL, seven INCONCLUSIVE, zero PASS. No additional admitted ADV-1 verdict-control pack found; access diagnostics are not substituted for it. |
| Signing: bindings and limits | DONE | [Signing](SIGNING.md#what-a-seal-binds-and-what-it-does-not-prove) separates cryptographic bindings from correctness/host-honesty claims; preserves old formats and registered cores. |
| Read-allowlist feasibility | MISSING | [Actual profile generator](../apps/server/oracle-execution.ts) uses targeted denials and runtime exceptions. Python probes exercise current restrictions. No dedicated feasibility study of a universal default-deny-read profile across Python, Node and browser dependencies was found or run. The current access probe does not answer that design question. No policy change made. |
| Study denominators | DONE | [Original methods/results](../artifacts/warning-signal/RESULT.md): old set 11 correct/8 wrong; confirmation 2/11, false accepts 0/8. Historical set six correct/six wrong: confirmation 1/6; observed false accepts 0/6 includes two blocked wrong artifacts. Four of 12 artifacts blocked; five of six tasks share one domain. Abstention is not detection. |

## Every grading-time diagnostic attempt

1. [Attempt 1](../artifacts/recover-docs/grading-probe-attempt-1.json): actual protected Python observer/separate judge PASS, 87 checks. Project unittest invocation then stopped with zero collected identities in the report parser. This is a diagnostic collection failure, not a successful native-lane proof. No protected access succeeded.
2. [Attempt 2](../artifacts/recover-docs/grading-probe.json): both actual runner lanes PASS. Only the disposable fixture reporting was adjusted to the existing explicit-count contract, using the native unittest result (`testsRun` and `wasSuccessful`). The production grader, permission profile, assertions and verdict rules were unchanged. Each lane records every individual attempt by label/outcome/errno or HTTP status. No secret contents or personal paths are stored in this report.

Per successful lane: 69 of the manifest's 78 targets returned permission denial; nine were absent. Two additional existing judge/canary reads, one canary write, non-loopback TCP, parent signal-zero permission, host-environment canary and unauthenticated private API access were denied. Own export read and scratch write succeeded intentionally. No forbidden attempt succeeded; no destructive signal, live decision or live database write was attempted.

Reproduce outside an enclosing sandbox on macOS, in repository-local isolated TEST data:

```sh
mkdir -p .work/recover-docs/tmp
NODE_TEST_CONTEXT=child-v8 TMPDIR="$PWD/.work/recover-docs/tmp" \
  node scripts/grading-boundary-probe.ts
```

This diagnostic is not a claim of complete observation authenticity or a new per-task gate. See [threat model](THREAT_MODEL.md).

## Publication privacy status

Gitleaks 8.30.1 scanned the complete proposed tracked tree using the unchanged default-rule configuration. Its raw scan reported 17 matches: 13 saved file-integrity hashes, three third-party JavaScript method names and one explicitly fake AWS-shaped redaction fixture. [Exact review](../artifacts/recover-docs/gitleaks-triage.json) found zero real secrets. A second scan with only those exact reviewed fingerprints as baseline reported zero remaining findings; the raw report is retained. No rule or path was broadly excluded.

A separate home-path check still finds personal paths in the two immutable CORE-1 golden files. The owner initially required preserving their bytes and blocking publication. On 2026-10-24 the owner explicitly approved publishing both originals unchanged because the paths contain the public username. This specific publication blocker is resolved by owner approval. Gitleaks is a secret scanner, not a blanket personal-data clearance. The one-time merge/push authorization does not extend to future changes.

## Prelaunch hardening — 2026-10-25

The released Builder manifest is now `protected-paths-v2`, 84 targets: **74 denied, 10 absent, zero readable**, with no unexpected errors in the actual Builder/direct-profile probe. V1 bytes and old records are preserved. [Probe](../artifacts/prelaunch-hardening/probe.json). The 69 denied / nine absent figures above describe the earlier Python grading-time diagnostic, not a claim that all v1 targets existed.

Control #13 is now added: the shared career assertion attack scored PASS before the fix and FAIL after child-process isolation. Fake child check reports are also rejected. The remaining native observation-authenticity limitation and the missing universal read-allowlist feasibility study are not declared solved. See [updated controls](NEGATIVE_CONTROLS.md).
